/**
 * Jobs API — list, create, and delete jobs.
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import { listJobs, createJob, deleteJob, countJobsByStatus } from "../../../lib/jobs";
import type { JobStatus } from "../../../lib/types";

export const runtime = "nodejs";

/** GET /api/jobs — list jobs with optional filters */
export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as JobStatus | null;
  const source = url.searchParams.get("source");
  const limit = parseInt(url.searchParams.get("limit") ?? "500", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const countsOnly = url.searchParams.get("counts") === "true";

  try {
    if (countsOnly) {
      const counts = await countJobsByStatus(userId);
      return NextResponse.json({ counts });
    }

    const jobs = await listJobs(userId, {
      status: status ?? undefined,
      source: source ?? undefined,
      limit,
      offset,
    });
    return NextResponse.json({ jobs, total: jobs.length });
  } catch {
    return NextResponse.json({ error: "Could not load jobs." }, { status: 503 });
  }
}

/** POST /api/jobs — create a new job manually */
export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      company?: string;
      role?: string;
      location?: string;
      source?: string;
      sourceUrl?: string;
      applyUrl?: string;
      jobDescription?: string;
      tags?: string[];
      accent?: string;
      status?: JobStatus;
    };

    if (!body.company || !body.role) {
      return NextResponse.json({ error: "Company and role are required." }, { status: 400 });
    }

    const job = await createJob(userId, {
      company: body.company,
      role: body.role,
      location: body.location,
      source: body.source ?? "manual",
      sourceUrl: body.sourceUrl,
      applyUrl: body.applyUrl,
      jobDescription: body.jobDescription,
      tags: body.tags,
      accent: body.accent,
      status: body.status ?? "ready_for_review",
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create job." }, { status: 500 });
  }
}

/** DELETE /api/jobs — delete by id or reset all (?all=true) */
export async function DELETE(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const url = new URL(request.url);
  const resetAll = url.searchParams.get("all") === "true";

  if (resetAll) {
    try {
      const { resetPipelineData } = await import("../../../lib/engine");
      const result = await resetPipelineData(userId);
      return NextResponse.json({ ok: true, ...result });
    } catch {
      return NextResponse.json({ error: "Could not reset pipeline data." }, { status: 500 });
    }
  }

  const jobId = url.searchParams.get("id");
  if (!jobId) return NextResponse.json({ error: "Job id or ?all=true is required." }, { status: 400 });

  try {
    const deleted = await deleteJob(userId, jobId);
    if (!deleted) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete job." }, { status: 500 });
  }
}
