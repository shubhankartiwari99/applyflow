/**
 * Job submission API — marks a job as submitted after user approval.
 *
 * POST /api/jobs/[id]/submit
 * Body: { coverLetter?: string }  — optional final cover letter text
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../../lib/auth-server";
import { getJob, transitionJobStatus, updateJob } from "../../../../../lib/jobs";
import { createCoverLetter } from "../../../../../lib/cover-letters";
import { logActivity } from "../../../../../lib/activity";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const { id } = await context.params;

  try {
    const job = await getJob(userId, id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { coverLetter?: string };

    // Save the final cover letter if provided
    if (body.coverLetter) {
      await updateJob(userId, id, { generatedCoverLetter: body.coverLetter });

      // Save as a submitted cover letter for future AI context
      await createCoverLetter(userId, {
        name: `${job.company} — ${job.role} (Submitted)`,
        content: body.coverLetter,
        isTemplate: false,
        companySubmittedTo: job.company,
        roleSubmittedTo: job.role,
        sourceJobId: id,
      });
    }

    // Transition: approved → submitted (or ready_for_review → approved → submitted)
    if (job.status === "ready_for_review") {
      await transitionJobStatus(userId, id, "approved");
      await logActivity(userId, "user_approved", {
        jobId: id,
        details: { company: job.company, role: job.role },
      });
    }

    if (job.status === "ready_for_review" || job.status === "approved") {
      // Re-fetch to get updated status after potential approval transition
      const currentJob = await getJob(userId, id);
      if (currentJob?.status === "approved") {
        await transitionJobStatus(userId, id, "submitted");
      }
    }

    await logActivity(userId, "submitted", {
      jobId: id,
      details: { company: job.company, role: job.role },
    });

    const updated = await getJob(userId, id);
    return NextResponse.json({ ok: true, job: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
