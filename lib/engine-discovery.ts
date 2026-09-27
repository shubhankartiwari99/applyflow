/**
 * Engine discovery module — scans multiple job sources for relevant opportunities.
 *
 * Sources supported:
 * - Greenhouse public boards (API)
 * - Lever public boards (API)
 * - Career site directory (URL-based tracking)
 *
 * Each source returns normalized job data that gets inserted into the jobs table.
 */

import { createJob, jobExists } from "./jobs";
import type { RunConfig } from "./types";

/** Career site directory — expanded to 80+ top tech, AI, quant, and startup firms */
export const CAREER_SITES = [
  // Big Tech & Cloud Infrastructure
  { company: "Google", url: "https://www.google.com/about/careers/applications/jobs/results", category: "Big Tech", accent: "#4285f4" },
  { company: "Meta", url: "https://www.metacareers.com/jobs", category: "Big Tech", accent: "#1877f2" },
  { company: "Apple", url: "https://jobs.apple.com/en-us/search", category: "Big Tech", accent: "#a2aaad" },
  { company: "Amazon", url: "https://www.amazon.jobs/en/search", category: "Big Tech", accent: "#ff9900" },
  { company: "Microsoft", url: "https://careers.microsoft.com/v2/global/en/search", category: "Big Tech", accent: "#00a4ef" },
  { company: "NVIDIA", url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", category: "Big Tech", accent: "#76b900" },
  { company: "Netflix", url: "https://jobs.netflix.com/search", category: "Big Tech", accent: "#e50914" },
  { company: "Intel", url: "https://jobs.intel.com/en/search-jobs", category: "Big Tech", accent: "#0071c5" },
  { company: "AMD", url: "https://careers.amd.com/careers-home", category: "Big Tech", accent: "#ed1c24" },
  { company: "Cloudflare", url: "https://www.cloudflare.com/careers/jobs/", category: "Big Tech", accent: "#f38020" },
  { company: "Salesforce", url: "https://careers.salesforce.com/en/", category: "Big Tech", accent: "#00a1e0" },
  { company: "Adobe", url: "https://careers.adobe.com/us/en", category: "Big Tech", accent: "#ff0000" },
  { company: "Oracle", url: "https://www.oracle.com/corporate/careers/", category: "Big Tech", accent: "#f80000" },
  { company: "Cisco", url: "https://jobs.cisco.com/jobs/SearchJobs", category: "Big Tech", accent: "#1ba0d7" },

  // AI / ML Giants & Labs
  { company: "OpenAI", url: "https://openai.com/careers/search", category: "AI / ML", accent: "#10a37f" },
  { company: "Anthropic", url: "https://www.anthropic.com/careers", category: "AI / ML", accent: "#d4a574" },
  { company: "DeepMind", url: "https://deepmind.google/about/careers/", category: "AI / ML", accent: "#4a90d9" },
  { company: "Cursor / Anysphere", url: "https://www.cursor.com/careers", category: "AI / ML", accent: "#5865f2" },
  { company: "Perplexity AI", url: "https://www.perplexity.ai/careers", category: "AI / ML", accent: "#22b8cd" },
  { company: "Scale AI", url: "https://scale.com/careers", category: "AI / ML", accent: "#6b5cff" },
  { company: "Hugging Face", url: "https://apply.workable.com/huggingface/", category: "AI / ML", accent: "#ffd21e" },
  { company: "Databricks", url: "https://www.databricks.com/company/careers/open-positions", category: "AI / ML", accent: "#ff3621" },
  { company: "Cohere", url: "https://cohere.com/careers", category: "AI / ML", accent: "#39594d" },
  { company: "Mistral AI", url: "https://mistral.ai/careers/", category: "AI / ML", accent: "#f7d046" },
  { company: "Runway", url: "https://runwayml.com/careers/", category: "AI / ML", accent: "#00e599" },
  { company: "ElevenLabs", url: "https://elevenlabs.io/careers", category: "AI / ML", accent: "#ffffff" },
  { company: "Midjourney", url: "https://www.midjourney.com/careers", category: "AI / ML", accent: "#8e44ad" },
  { company: "Character.AI", url: "https://character.ai/careers", category: "AI / ML", accent: "#29b6f6" },
  { company: "Stability AI", url: "https://stability.ai/careers", category: "AI / ML", accent: "#9b59b6" },
  { company: "Together AI", url: "https://www.together.ai/careers", category: "AI / ML", accent: "#00c2ff" },
  { company: "Replicate", url: "https://replicate.com/careers", category: "AI / ML", accent: "#e91e63" },
  { company: "Pinecone", url: "https://www.pinecone.io/careers/", category: "AI / ML", accent: "#0047ff" },
  { company: "Weights & Biases", url: "https://wandb.ai/careers", category: "AI / ML", accent: "#ffbe00" },
  { company: "LangChain", url: "https://www.langchain.com/careers", category: "AI / ML", accent: "#2ecc71" },

  // FinTech & Quantitative Trading
  { company: "Jane Street", url: "https://www.janestreet.com/join-jane-street/open-roles/", category: "FinTech & Quant", accent: "#005a9c" },
  { company: "Citadel", url: "https://www.citadel.com/careers/open-opportunities/", category: "FinTech & Quant", accent: "#003b71" },
  { company: "Two Sigma", url: "https://www.twosigma.com/careers/", category: "FinTech & Quant", accent: "#232d3f" },
  { company: "Jump Trading", url: "https://www.jumptrading.com/careers/", category: "FinTech & Quant", accent: "#e67e22" },
  { company: "Hudson River Trading", url: "https://www.hudsonrivertrading.com/careers/", category: "FinTech & Quant", accent: "#ff5722" },
  { company: "D.E. Shaw", url: "https://www.deshaw.com/careers", category: "FinTech & Quant", accent: "#1a5276" },
  { company: "Point72", url: "https://www.point72.com/careers/", category: "FinTech & Quant", accent: "#0e6655" },
  { company: "Millennium", url: "https://www.mlp.com/careers/", category: "FinTech & Quant", accent: "#1b4f72" },
  { company: "Optiver", url: "https://optiver.com/working-at-optiver/career-opportunities/", category: "FinTech & Quant", accent: "#e74c3c" },
  { company: "IMC Trading", url: "https://careers.imc.com/", category: "FinTech & Quant", accent: "#3498db" },
  { company: "Five Rings", url: "https://fiverings.com/careers/", category: "FinTech & Quant", accent: "#f39c12" },
  { company: "Virtu Financial", url: "https://www.virtu.com/careers/", category: "FinTech & Quant", accent: "#27ae60" },
  { company: "Stripe", url: "https://stripe.com/jobs/search", category: "FinTech & Quant", accent: "#635bff" },
  { company: "Robinhood", url: "https://robinhood.com/us/en/careers/openings/", category: "FinTech & Quant", accent: "#00c805" },
  { company: "Bloomberg", url: "https://www.bloomberg.com/company/careers/early-career/", category: "FinTech & Quant", accent: "#414141" },
  { company: "Ramp", url: "https://ramp.com/careers", category: "FinTech & Quant", accent: "#ceff00" },
  { company: "Brex", url: "https://www.brex.com/careers", category: "FinTech & Quant", accent: "#f25c05" },
  { company: "Plaid", url: "https://plaid.com/careers/", category: "FinTech & Quant", accent: "#111111" },
  { company: "Coinbase", url: "https://www.coinbase.com/careers", category: "FinTech & Quant", accent: "#0052ff" },
  { company: "Block / Square", url: "https://block.xyz/careers", category: "FinTech & Quant", accent: "#222222" },
  { company: "Affirm", url: "https://www.affirm.com/careers", category: "FinTech & Quant", accent: "#00a887" },

  // Startups & High Growth Tech
  { company: "Figma", url: "https://www.figma.com/careers/", category: "Startups & Growth", accent: "#f24e1e" },
  { company: "Notion", url: "https://www.notion.so/careers", category: "Startups & Growth", accent: "#787878" },
  { company: "Vercel", url: "https://vercel.com/careers", category: "Startups & Growth", accent: "#a0a0a0" },
  { company: "Linear", url: "https://linear.app/careers", category: "Startups & Growth", accent: "#5e6ad2" },
  { company: "Supabase", url: "https://supabase.com/careers", category: "Startups & Growth", accent: "#3ecf8e" },
  { company: "Retool", url: "https://retool.com/careers", category: "Startups & Growth", accent: "#3c3c3c" },
  { company: "Datadog", url: "https://careers.datadoghq.com/all-jobs/", category: "Startups & Growth", accent: "#632ca6" },
  { company: "Snowflake", url: "https://careers.snowflake.com/us/en/search-results", category: "Startups & Growth", accent: "#29b5e8" },
  { company: "Palantir", url: "https://www.palantir.com/careers/", category: "Startups & Growth", accent: "#a0a0a0" },
  { company: "DoorDash", url: "https://careers.doordash.com/", category: "Startups & Growth", accent: "#ff3008" },
  { company: "Uber", url: "https://www.uber.com/us/en/careers/", category: "Startups & Growth", accent: "#111111" },
  { company: "Airbnb", url: "https://careers.airbnb.com/", category: "Startups & Growth", accent: "#ff5a5f" },
  { company: "Pinterest", url: "https://www.pinterestcareers.com/", category: "Startups & Growth", accent: "#e60023" },
  { company: "Reddit", url: "https://www.redditinc.com/careers", category: "Startups & Growth", accent: "#ff4500" },
  { company: "Discord", url: "https://discord.com/careers", category: "Startups & Growth", accent: "#5865f2" },
  { company: "Slack", url: "https://slack.com/careers", category: "Startups & Growth", accent: "#4a154b" },
  { company: "Canva", url: "https://www.canva.com/careers/", category: "Startups & Growth", accent: "#00c4cc" },
  { company: "Postman", url: "https://www.postman.com/company/careers/", category: "Startups & Growth", accent: "#ff6c37" },
  { company: "GitHub", url: "https://github.com/about/careers", category: "Startups & Growth", accent: "#ffffff" },
  { company: "GitLab", url: "https://about.gitlab.com/jobs/careers/", category: "Startups & Growth", accent: "#fc6d26" },

  // Engineering, Robotics & Deep Tech
  { company: "SpaceX", url: "https://www.spacex.com/careers/", category: "Engineering", accent: "#005288" },
  { company: "Tesla", url: "https://www.tesla.com/careers/search", category: "Engineering", accent: "#cc0000" },
  { company: "Anduril Industries", url: "https://www.anduril.com/careers/", category: "Engineering", accent: "#1c2833" },
  { company: "Boston Dynamics", url: "https://bostondynamics.com/careers/", category: "Engineering", accent: "#f1c40f" },
  { company: "Neuralink", url: "https://neuralink.com/careers/", category: "Engineering", accent: "#2c3e50" },
  { company: "Relativity Space", url: "https://www.relativityspace.com/careers", category: "Engineering", accent: "#e74c3c" },
] as const;

/** Keywords to match in job titles for AI/ML/DS/Engineering internships */
const ROLE_KEYWORDS = [
  "intern", "internship", "co-op", "new grad", "entry level", "junior",
  "machine learning", "ml", "artificial intelligence", "ai",
  "data science", "data scientist", "data engineer", "data analyst",
  "software engineer", "software developer", "swe",
  "deep learning", "nlp", "natural language", "computer vision",
  "research", "applied scientist",
  "backend", "frontend", "full stack", "fullstack",
  "platform", "infrastructure", "devops", "sre",
];

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
      jobs?: Array<{
        title?: string;
        location?: { name?: string };
        departments?: Array<{ name?: string }>;
        content?: string;
      }>;
    };

    const ghJobs = payload.jobs ?? [];
    jobsFound = ghJobs.length;

    for (const ghJob of ghJobs) {
      const title = String(ghJob.title ?? "Untitled");
      if (!matchesTargetRole(title, config.targetRoles)) continue;

      const company = boardToken.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const exists = await jobExists(userId, company, title, "greenhouse");
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
        sourceUrl: `https://boards.greenhouse.io/${boardToken}`,
        fitScore: 0,
        status: "discovered",
        tags: [...departments.slice(0, 2), title.toLowerCase().includes("intern") ? "Internship" : "New role"],
        accent: "#6b5cff",
        jobDescription: typeof ghJob.content === "string" ? stripHtml(ghJob.content).slice(0, 5000) : undefined,
        runId,
      });
      jobsNew++;
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
      categories?: { location?: string; team?: string; commitment?: string };
      descriptionPlain?: string;
    }>;

    jobsFound = postings.length;

    for (const posting of postings) {
      const title = String(posting.text ?? "Untitled");
      if (!matchesTargetRole(title, config.targetRoles)) continue;

      const company = siteName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const exists = await jobExists(userId, company, title, "lever");
      if (exists) continue;

      const location = posting.categories?.location ?? "Not listed";
      const tags: string[] = [];
      if (posting.categories?.team) tags.push(posting.categories.team);
      if (posting.categories?.commitment) tags.push(posting.categories.commitment);
      if (title.toLowerCase().includes("intern")) tags.push("Internship");

      await createJob(userId, {
        company,
        role: title,
        location,
        source: "lever",
        sourceUrl: `https://jobs.lever.co/${siteName}`,
        fitScore: 0,
        status: "discovered",
        tags,
        accent: "#27a889",
        jobDescription: posting.descriptionPlain?.slice(0, 5000) ?? undefined,
        runId,
      });
      jobsNew++;
    }
  } catch (error) {
    errors.push(`Lever discovery failed for "${siteName}": ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return { source: `lever:${siteName}`, jobsFound, jobsNew, errors };
}

/**
 * Create placeholder jobs from the career site directory.
 * These represent "we know this company hires for these roles" entries
 * that the user can then manually track or the engine can try to scrape.
 */
export async function discoverFromCareerSites(
  userId: string,
  config: RunConfig,
  runId?: string
): Promise<DiscoveryResult> {
  let jobsNew = 0;
  const errors: string[] = [];

  for (const site of CAREER_SITES) {
    // Apply company filter if set
    if (config.companyFilter.length > 0 && !config.companyFilter.includes(site.company)) {
      continue;
    }

    for (const targetRole of config.targetRoles) {
      const exists = await jobExists(userId, site.company, targetRole, "career_site");
      if (exists) continue;

      await createJob(userId, {
        company: site.company,
        role: targetRole,
        location: "United States (Check career site)",
        source: "career_site",
        sourceUrl: site.url,
        applyUrl: site.url,
        fitScore: 0,
        status: "discovered",
        tags: [site.category, "Internship"],
        accent: site.accent,
        runId,
      });
      jobsNew++;
    }
  }

  return {
    source: "career_sites",
    jobsFound: CAREER_SITES.length * config.targetRoles.length,
    jobsNew,
    errors,
  };
}

/**
 * Check if a job title matches any of the user's target roles.
 */
function matchesTargetRole(title: string, targetRoles: string[]): boolean {
  const lower = title.toLowerCase();

  // Always include if it matches a keyword
  if (ROLE_KEYWORDS.some((kw) => lower.includes(kw))) return true;

  // Check against user's specific target roles
  for (const role of targetRoles) {
    const roleLower = role.toLowerCase().trim();
    if (!roleLower) continue;
    // Check each word of the target role
    const words = roleLower.split(/\s+/);
    if (words.every((word) => lower.includes(word))) return true;
  }

  return false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
