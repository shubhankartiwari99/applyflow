/**
 * Cover letter generation API — AI-generates a tailored cover letter for a specific job.
 *
 * POST /api/cover-letters/generate
 * Body: { jobId: string }
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { getJob, updateJob } from "../../../../lib/jobs";
import { getAllDocumentText } from "../../../../lib/documents";
import { buildCoverLetterContext, createCoverLetter } from "../../../../lib/cover-letters";
import { generateCoverLetter } from "../../../../lib/ai";
import { getWorkspace } from "../../../../lib/store";
import { logActivity } from "../../../../lib/activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = (await request.json()) as { jobId?: string; company?: string; role?: string };

    // Get the target job (or create an ad-hoc request)
    let company = body.company ?? "";
    let role = body.role ?? "";
    let jobDescription: string | null = null;
    let jobId: string | null = body.jobId ?? null;

    if (jobId) {
      const job = await getJob(userId, jobId);
      if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
      company = job.company;
      role = job.role;
      jobDescription = job.jobDescription;
    }

    if (!company || !role) {
      return NextResponse.json({ error: "Company and role are required (or provide a jobId)." }, { status: 400 });
    }

    // Gather context
    const resumeText = await getAllDocumentText(userId);
    const coverLetterCtx = await buildCoverLetterContext(userId);

    // Get profile from workspace
    const workspace = await getWorkspace(userId);
    const profile = (workspace as Record<string, unknown>)?.profile as Record<string, string> | undefined;
    const profileSummary = [
      `Name: ${profile?.fullName || "Not set"}`,
      `Email: ${profile?.email || "Not set"}`,
      `Target roles: ${profile?.targetRoles || "Not specified"}`,
      `Preferred locations: ${profile?.locations || "Not specified"}`,
      `Work authorization: ${profile?.workAuthorization || "Not specified"}`,
    ].join("\n");

    // Generate
    const result = await generateCoverLetter({
      company,
      role,
      jobDescription,
      resumeText: resumeText || profileSummary,
      coverLetterContext: coverLetterCtx,
      profileSummary,
    });

    // Save to the job if we have one
    if (jobId) {
      await updateJob(userId, jobId, { generatedCoverLetter: result.coverLetter });
    }

    // Save as a cover letter record for future context
    const savedLetter = await createCoverLetter(userId, {
      name: `${company} — ${role}`,
      content: result.coverLetter,
      isTemplate: false,
      sourceJobId: jobId ?? undefined,
    });

    await logActivity(userId, "cover_letter_generated", {
      jobId: jobId ?? undefined,
      details: { company, role, model: result.model, tokensUsed: result.tokensUsed },
    });

    return NextResponse.json({
      coverLetter: result.coverLetter,
      model: result.model,
      tokensUsed: result.tokensUsed,
      savedId: savedLetter.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cover letter generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
