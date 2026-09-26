/**
 * Engine matcher module — scores how well discovered jobs match the user's profile.
 *
 * Uses the user's resume text, target roles, and profile data to calculate
 * a fit score (0-100) for each job. Supports both AI-powered and keyword-based scoring.
 */

import { getJob, updateJob, listJobs } from "./jobs";
import { getAllDocumentText } from "./documents";
import { calculateFitScore } from "./ai";
import type { JobRecord, UserProfile } from "./types";

type MatchResult = {
  jobId: string;
  fitScore: number;
  reasoning: string;
  model: string;
};

/**
 * Score a single job against the user's profile.
 */
export async function scoreJob(
  userId: string,
  jobId: string,
  profile: UserProfile
): Promise<MatchResult> {
  const job = await getJob(userId, jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const resumeText = await getAllDocumentText(userId);
  const targetRoles = profile.targetRoles
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  // If we have a job description, use AI scoring
  if (job.jobDescription) {
    const result = await calculateFitScore({
      resumeText: resumeText || buildProfileText(profile),
      jobDescription: job.jobDescription,
      targetRoles,
    });

    // Persist the score
    await updateJob(userId, jobId, { fitScore: result.score });

    return {
      jobId,
      fitScore: result.score,
      reasoning: result.reasoning,
      model: result.model,
    };
  }

  // No JD available — use heuristic scoring based on title/company match
  const heuristicScore = heuristicFitScore(job, profile, targetRoles);
  await updateJob(userId, jobId, { fitScore: heuristicScore.score });

  return {
    jobId,
    fitScore: heuristicScore.score,
    reasoning: heuristicScore.reasoning,
    model: "heuristic",
  };
}

/**
 * Score all discovered (unscored) jobs for a user.
 */
export async function scoreAllDiscoveredJobs(
  userId: string,
  profile: UserProfile
): Promise<MatchResult[]> {
  const jobs = await listJobs(userId, { status: "discovered" });
  const unscored = jobs.filter((j) => j.fitScore === 0);

  const results: MatchResult[] = [];
  for (const job of unscored) {
    try {
      const result = await scoreJob(userId, job.id, profile);
      results.push(result);
    } catch (error) {
      results.push({
        jobId: job.id,
        fitScore: 50,
        reasoning: `Scoring failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        model: "error-fallback",
      });
    }
  }

  return results;
}

/**
 * Rank jobs by fit score (highest first) and return top N.
 */
export async function getTopJobs(
  userId: string,
  limit: number = 20,
  minScore: number = 60
): Promise<JobRecord[]> {
  const jobs = await listJobs(userId);
  return jobs
    .filter((j) => j.fitScore >= minScore && j.status !== "discarded")
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, limit);
}

// ─── Heuristic scoring (no AI needed) ───

function heuristicFitScore(
  job: JobRecord,
  profile: UserProfile,
  targetRoles: string[]
): { score: number; reasoning: string } {
  let score = 50;  // base score
  const reasons: string[] = [];

  const titleLower = job.role.toLowerCase();
  const companyLower = job.company.toLowerCase();

  // +20 if the role title matches a target role
  for (const role of targetRoles) {
    const words = role.toLowerCase().split(/\s+/);
    if (words.every((w) => titleLower.includes(w))) {
      score += 20;
      reasons.push(`Role matches target "${role}"`);
      break;
    }
  }

  // +10 for internship match (if user targets internships)
  const wantsInternship = targetRoles.some((r) => r.toLowerCase().includes("intern"));
  if (wantsInternship && titleLower.includes("intern")) {
    score += 10;
    reasons.push("Internship role matches preference");
  }

  // +10 for AI/ML keywords in title
  const aiKeywords = ["machine learning", "ml", "ai", "artificial intelligence", "deep learning", "data science"];
  if (aiKeywords.some((kw) => titleLower.includes(kw))) {
    score += 10;
    reasons.push("AI/ML keyword match in title");
  }

  // +5 for location match
  if (profile.locations) {
    const preferredLocs = profile.locations.toLowerCase().split(",").map((l) => l.trim());
    const jobLoc = (job.location ?? "").toLowerCase();
    if (preferredLocs.some((loc) => jobLoc.includes(loc)) || jobLoc.includes("remote")) {
      score += 5;
      reasons.push("Location preference match");
    }
  }

  // +5 for well-known companies (Big Tech, AI companies)
  const premiumCompanies = ["google", "meta", "apple", "amazon", "microsoft", "nvidia", "openai", "anthropic", "deepmind"];
  if (premiumCompanies.some((c) => companyLower.includes(c))) {
    score += 5;
    reasons.push("Premium employer");
  }

  return {
    score: Math.min(98, Math.max(30, score)),
    reasoning: reasons.length > 0 ? reasons.join("; ") : "Base score — no specific matches detected",
  };
}

/**
 * Build a text summary from the user's profile (used when no documents are uploaded).
 */
function buildProfileText(profile: UserProfile): string {
  const parts: string[] = [];
  if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
  if (profile.targetRoles) parts.push(`Target roles: ${profile.targetRoles}`);
  if (profile.locations) parts.push(`Preferred locations: ${profile.locations}`);
  if (profile.workAuthorization) parts.push(`Work authorization: ${profile.workAuthorization}`);
  if (profile.linkedin) parts.push(`LinkedIn: ${profile.linkedin}`);
  if (profile.github) parts.push(`GitHub: ${profile.github}`);
  return parts.join("\n") || "No profile data available";
}
