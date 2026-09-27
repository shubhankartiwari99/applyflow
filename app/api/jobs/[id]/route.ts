/**
 * Single job API — get, update, and manage a specific job by ID.
 *
 * GET /api/jobs/[id]
 * PUT /api/jobs/[id] — update job fields
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { getJob, updateJob, transitionJobStatus } from "../../../../lib/jobs";
import type { JobStatus } from "../../../../lib/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const { id } = await context.params;
  try {
    const job = await getJob(userId, id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: "Could not load job." }, { status: 503 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const { id } = await context.params;
  try {
    const body = (await request.json()) as {
      status?: JobStatus;
      generatedCoverLetter?: string;
      applicationData?: Record<string, unknown>;
      fitScore?: number;
      jobDescription?: string;
      tags?: string[];
      applyUrl?: string;
    };

    // Handle status transition separately (enforces state machine)
    if (body.status) {
      try {
        await transitionJobStatus(userId, id, body.status);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid status transition." },
          { status: 400 }
        );
      }
    }

    // Handle other field updates
    const fieldUpdates: Record<string, unknown> = {};
    if (body.generatedCoverLetter !== undefined) fieldUpdates.generatedCoverLetter = body.generatedCoverLetter;
    if (body.applicationData !== undefined) fieldUpdates.applicationData = body.applicationData;
    if (body.fitScore !== undefined) fieldUpdates.fitScore = body.fitScore;
    if (body.jobDescription !== undefined) fieldUpdates.jobDescription = body.jobDescription;
    if (body.tags !== undefined) fieldUpdates.tags = body.tags;
    if (body.applyUrl !== undefined) fieldUpdates.applyUrl = body.applyUrl;

    if (Object.keys(fieldUpdates).length > 0) {
      await updateJob(userId, id, fieldUpdates as Parameters<typeof updateJob>[2]);
    }

    const updated = await getJob(userId, id);
    if (!updated) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const PATCH = PUT;
