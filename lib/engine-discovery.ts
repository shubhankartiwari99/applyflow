/**
 * Engine discovery module — scans multiple job sources for relevant opportunities.
 *
 * Sources supported:
 * - Greenhouse public boards (API)
 * - Lever public boards (API)
 * - Mapped ATS boards
 *
 * Each source returns normalized job data that gets inserted into the jobs table.
 */

import { createJob, jobExists } from "./jobs";
import { ATS_BOARDS, parseJobBoardUrl } from "./ats-boards";
import type { RunConfig } from "./types";

const EARLY_CAREER = /\b(intern|internship|co-?op|new grad|university|campus|entry[ -]?level|junior)\b/i;
const GENERIC_ROLE_WORDS = new Set([
  "intern", "internship", "engineer", "engineering", "software", "developer",
  "analyst", "associate", "specialist", "the", "and", "for",
]);

type DiscoveryResult = {
  source: string;
  jobsFound: number;
  jobsNew: number;
  errors: string[];
};

/**
 * Discover jobs from a Greenhouse public board.
 */
export async function discoverFromGreenhouse(
  userId: string,
  boardToken: string,
  config: RunConfig,
  runId?: string
): Promise<DiscoveryResult> {
  const errors: string[] = [];
  let jobsFound = 0;
  let jobsNew = 0;

  try {
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      errors.push(`Greenhouse returned ${response.status} for board "${boardToken}"`);
      return { source: `greenhouse:${boardToken}`, jobsFound: 0, jobsNew: 0, errors };
    }

    const payload = await response.json() as {
      name?: string;
      jobs?: Array<{
        title?: string;
        absolute_url?: string;
        location?: { name?: string };
        departments?: Array<{ name?: string }>;
        content?: string;
      }>;
    };

    const ghJobs = payload.jobs ?? [];
    jobsFound = ghJobs.length;
    const company = String(payload.name ?? boardToken.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

    for (const ghJob of ghJobs) {
      const title = String(ghJob.title ?? "Untitled");
      if (!matchesTargetRole(title, config.targetRoles)) continue;

      const applyUrl = typeof ghJob.absolute_url === "string" ? ghJob.absolute_url : `https://boards.greenhouse.io/${boardToken}`;
      const exists = await jobExists(userId, company, title, "greenhouse", applyUrl);
      if (exists) continue;

      const location = typeof ghJob.location === "object" && ghJob.location !== null
        ? String(ghJob.location.name ?? "Not listed")
        : "Not listed";

      const departments = Array.isArray(ghJob.departments)
        ? ghJob.departments.map((d) => String(d?.name ?? "")).filter(Boolean)
        : [];

      await createJob(userId, {
        company,
        role: title,
        location,
        source: "greenhouse",
        sourceUrl: applyUrl,
        applyUrl,
        fitScore: 0,
        status: "discovered",
        tags: [...departments.slice(0, 2), EARLY_CAREER.test(title) ? "Internship" : "Open role"],
        accent: "#6b5cff",
        jobDescription: typeof ghJob.content === "string" ? stripHtml(ghJob.content).slice(0, 5000) : undefined,
        runId,
      });
      jobsNew++;
      if (jobsNew >= config.maxJobsPerRun) break;
    }
  } catch (error) {
    errors.push(`Greenhouse discovery failed for "${boardToken}": ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return { source: `greenhouse:${boardToken}`, jobsFound, jobsNew, errors };
}

/**
 * Discover jobs from a Lever public board.
 */
export async function discoverFromLever(
  userId: string,
  siteName: string,
  config: RunConfig,
  runId?: string
): Promise<DiscoveryResult> {
  const errors: string[] = [];
  let jobsFound = 0;
  let jobsNew = 0;

  try {
    const response = await fetch(
      `https://api.lever.co/v0/postings/${encodeURIComponent(siteName)}?mode=json`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      errors.push(`Lever returned ${response.status} for site "${siteName}"`);
      return { source: `lever:${siteName}`, jobsFound: 0, jobsNew: 0, errors };
    }

    const postings = await response.json() as Array<{
      text?: string;
      hostedUrl?: string;
      applyUrl?: string;
      categories?: { location?: string; team?: string; commitment?: string };
      descriptionPlain?: string;
    }>;

    jobsFound = postings.length;
    const company = siteName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    for (const posting of postings) {
      const title = String(posting.text ?? "Untitled");
      if (!matchesTargetRole(title, config.targetRoles)) continue;

      const applyUrl = posting.applyUrl || posting.hostedUrl || `https://jobs.lever.co/${siteName}`;
      const exists = await jobExists(userId, company, title, "lever", applyUrl);
      if (exists) continue;

      const location = posting.categories?.location ?? "Not listed";
      const tags: string[] = [];
      if (posting.categories?.team) tags.push(posting.categories.team);
      if (posting.categories?.commitment) tags.push(posting.categories.commitment);
      if (EARLY_CAREER.test(title)) tags.push("Internship");

      await createJob(userId, {
        company,
        role: title,
        location,
        source: "lever",
        sourceUrl: applyUrl,
        applyUrl,
        fitScore: 0,
        status: "discovered",
        tags,
        accent: "#27a889",
        jobDescription: posting.descriptionPlain?.slice(0, 5000) ?? undefined,
        runId,
      });
      jobsNew++;
      if (jobsNew >= config.maxJobsPerRun) break;
    }
  } catch (error) {
    errors.push(`Lever discovery failed for "${siteName}": ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return { source: `lever:${siteName}`, jobsFound, jobsNew, errors };
}

/**
 * Pull live postings from mapped public Greenhouse/Lever boards.
 * Does not invent company×role stubs for sites without a public ATS API.
 */
export async function discoverFromCareerSites(
  userId: string,
  config: RunConfig,
  runId?: string
): Promise<DiscoveryResult> {
  const errors: string[] = [];
  let jobsFound = 0;
  let jobsNew = 0;
  const remaining = Math.max(1, config.maxJobsPerRun);
  const seenTokens = new Set<string>();

  const boards = ATS_BOARDS.filter((board) => {
    if (config.companyFilter.length === 0) return true;
    return config.companyFilter.some((c) => c.toLowerCase() === board.company.toLowerCase());
  });

  for (const board of boards) {
    if (jobsNew >= remaining) break;

    const sliceConfig = { ...config, maxJobsPerRun: remaining - jobsNew };

    if (config.sources.includes("greenhouse") && board.greenhouse && !seenTokens.has(`gh:${board.greenhouse}`)) {
      seenTokens.add(`gh:${board.greenhouse}`);
      const result = await discoverFromGreenhouse(userId, board.greenhouse, sliceConfig, runId);
      jobsFound += result.jobsFound;
      jobsNew += result.jobsNew;
      errors.push(...result.errors);
    }

    if (jobsNew >= remaining) break;

    if (config.sources.includes("lever") && board.lever && !seenTokens.has(`lv:${board.lever}`)) {
      seenTokens.add(`lv:${board.lever}`);
      const result = await discoverFromLever(userId, board.lever, { ...config, maxJobsPerRun: remaining - jobsNew }, runId);
      jobsFound += result.jobsFound;
      jobsNew += result.jobsNew;
      errors.push(...result.errors);
    }
  }

  return { source: "mapped_ats", jobsFound, jobsNew, errors };
}

export async function discoverFromUrl(
  userId: string,
  rawUrl: string,
  config: RunConfig,
  runId?: string
): Promise<DiscoveryResult> {
  const parsed = parseJobBoardUrl(rawUrl);
  if (!parsed) {
    return {
      source: "unsupported",
      jobsFound: 0,
      jobsNew: 0,
      errors: ["Only public Greenhouse (boards.greenhouse.io) and Lever (jobs.lever.co) URLs can be imported automatically."],
    };
  }
  if (parsed.kind === "greenhouse") {
    return discoverFromGreenhouse(userId, parsed.token, config, runId);
  }
  return discoverFromLever(userId, parsed.token, config, runId);
}

/**
 * Match titles to the user's target roles without treating every "engineer" posting as a hit.
 */
export function matchesTargetRole(title: string, targetRoles: string[]): boolean {
  const lower = title.toLowerCase();
  const wantsEarlyCareer = targetRoles.some((r) => EARLY_CAREER.test(r));
  if (wantsEarlyCareer && !EARLY_CAREER.test(title)) {
    // Still allow a direct target-role match (e.g. "Machine Learning Engineer")
    const direct = targetRoles.some((role) => titleMatchesRole(lower, role));
    if (!direct) return false;
  }

  if (targetRoles.length === 0) return EARLY_CAREER.test(title);

  return targetRoles.some((role) => titleMatchesRole(lower, role));
}

function titleMatchesRole(titleLower: string, targetRole: string): boolean {
  const roleLower = targetRole.toLowerCase().trim().replace(/ai\s*\/\s*ml/g, "ai ml");
  if (!roleLower) return false;
  if (titleLower.includes(roleLower)) return true;

  const words = roleLower.split(/[\s/,]+/).filter(Boolean);
  const meaningful = words.filter((w) => !GENERIC_ROLE_WORDS.has(w));
  if (meaningful.length === 0) {
    return words.every((w) => titleContainsToken(titleLower, w));
  }
  const hits = meaningful.filter((w) => titleContainsToken(titleLower, w));
  return hits.length >= Math.min(2, meaningful.length) || (hits.length >= 1 && meaningful.length === 1);
}

function titleContainsToken(titleLower: string, token: string): boolean {
  if (titleLower.includes(token)) return true;
  if (token === "ml" && titleLower.includes("machine learning")) return true;
  if (token === "ai" && (titleLower.includes("artificial intelligence") || /\bai\b/.test(titleLower))) return true;
  if (token === "swe" && titleLower.includes("software")) return true;
  return false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
