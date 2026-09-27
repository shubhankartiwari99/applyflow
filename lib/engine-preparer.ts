/**
 * Engine preparer module — generates tailored cover letters and pre-fills
 * application form data for jobs that are ready to be prepared.
 *
 * This is the "brain" that turns a discovered job into a ready-to-submit
 * application package, waiting only for the user's final review.
 */

import { getJob, updateJob, transitionJobStatus } from "./jobs";
import { getAllDocumentText } from "./documents";
import { buildCoverLetterContext, createCoverLetter } from "./cover-letters";
import { generateCoverLetter } from "./ai";
import { logActivity } from "./activity";
import type { UserProfile, JobRecord } from "./types";

export type PrepareResult = {
  jobId: string;
  coverLetterGenerated: boolean;
  formDataPrefilled: boolean;
  error: string | null;
};

/**
 * Prepare a single job for review: generate cover letter + pre-fill form data.
 *
 * Transitions the job status: queued → preparing → ready_for_review
 */
export async function prepareJob(
  userId: string,
  jobId: string,
  profile: UserProfile,
  runId?: string
): Promise<PrepareResult> {
  const job = await getJob(userId, jobId);
  if (!job) return { jobId, coverLetterGenerated: false, formDataPrefilled: false, error: "Job not found" };

  // Transition to "preparing"
  try {
    await transitionJobStatus(userId, jobId, "preparing");
  } catch {
    // If already preparing or further along, continue
  }

  let coverLetterGenerated = false;
  let formDataPrefilled = false;
  let error: string | null = null;

  // 1. Generate tailored cover letter
  try {
    const resumeText = await getAllDocumentText(userId);
    const coverLetterCtx = await buildCoverLetterContext(userId);

    const profileSummary = [
      `Name: ${profile.fullName || "Not set"}`,
      `Email: ${profile.email || "Not set"}`,
      `Target roles: ${profile.targetRoles || "Not specified"}`,
      `Preferred locations: ${profile.locations || "Not specified"}`,
      `Work authorization: ${profile.workAuthorization || "Not specified"}`,
    ].join("\n");

    const result = await generateCoverLetter({
      company: job.company,
      role: job.role,
      jobDescription: job.jobDescription,
      resumeText: resumeText || profileSummary,
      coverLetterContext: coverLetterCtx,
      profileSummary,
      baseCoverLetter: profile.coverLetterTemplate || undefined,
      tone: "technical",
    });

    // Save the generated cover letter to the job
    await updateJob(userId, jobId, { generatedCoverLetter: result.coverLetter });

    // Also save as a cover letter record for future AI context
    await createCoverLetter(userId, {
      name: `${job.company} — ${job.role}`,
      content: result.coverLetter,
      isTemplate: false,
      sourceJobId: jobId,
    });

    coverLetterGenerated = true;

    await logActivity(userId, "cover_letter_generated", {
      jobId,
      runId,
      details: {
        company: job.company,
        role: job.role,
        model: result.model,
        tokensUsed: result.tokensUsed,
      },
    });
  } catch (err) {
    error = `Cover letter generation failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    await logActivity(userId, "error", {
      jobId,
      runId,
      details: { error, stage: "cover_letter_generation" },
    });
  }

  // 2. Pre-fill common application form fields
  try {
    const formData = buildApplicationFormData(profile, job);
    await updateJob(userId, jobId, { applicationData: formData });
    formDataPrefilled = true;

    await logActivity(userId, "form_prefilled", {
      jobId,
      runId,
      details: { fieldsCount: Object.keys(formData).length },
    });
  } catch (err) {
    const formError = `Form pre-fill failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    error = error ? `${error}; ${formError}` : formError;
  }

  // 3. Transition to "ready_for_review"
  try {
    await transitionJobStatus(userId, jobId, "ready_for_review");
    await logActivity(userId, "awaiting_review", {
      jobId,
      runId,
      details: { company: job.company, role: job.role },
    });
  } catch (transitionError) {
    error = error
      ? `${error}; Status transition failed: ${transitionError instanceof Error ? transitionError.message : "Unknown"}`
      : `Status transition failed: ${transitionError instanceof Error ? transitionError.message : "Unknown"}`;
  }

  return { jobId, coverLetterGenerated, formDataPrefilled, error };
}

/**
 * Prepare multiple jobs in batch (used during engine runs).
 */
export async function prepareJobs(
  userId: string,
  jobIds: string[],
  profile: UserProfile,
  runId?: string
): Promise<PrepareResult[]> {
  const results: PrepareResult[] = [];
  for (const jobId of jobIds) {
    const result = await prepareJob(userId, jobId, profile, runId);
    results.push(result);
  }
  return results;
}

/**
 * Build pre-filled form data from the user's profile.
 * This data structure maps common application form fields.
 */
function buildApplicationFormData(
  profile: UserProfile,
  job: JobRecord
): Record<string, unknown> {
  return {
    // Personal info
    fullName: profile.fullName || null,
    firstName: profile.fullName?.split(" ")[0] || null,
    lastName: profile.fullName?.split(" ").slice(1).join(" ") || null,
    email: profile.email || null,

    // Links
    linkedinUrl: profile.linkedin || null,
    githubUrl: profile.github || null,
    portfolioUrl: profile.portfolio || null,
    handshakeUrl: profile.handshake || null,

    // Application context
    workAuthorization: profile.workAuthorization || null,
    desiredRole: job.role,
    desiredCompany: job.company,
    desiredLocation: job.location || profile.locations || null,

    // Timestamps
    preparedAt: new Date().toISOString(),

    // Source info
    applyUrl: job.applyUrl || job.sourceUrl || null,
    source: job.source,
  };
}
