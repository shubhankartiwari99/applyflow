/**
 * Engine status API — returns current engine state + job counts.
 *
 * GET /api/engine/status
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { getEngineStatus, listRuns } from "../../../../lib/engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const status = await getEngineStatus(userId);
    const recentRuns = await listRuns(userId, 5);

    return NextResponse.json({
      isRunning: status.isRunning,
      latestRun: status.latestRun
        ? {
            id: status.latestRun.id,
            status: status.latestRun.status,
            jobsDiscovered: status.latestRun.jobsDiscovered,
            jobsPrepared: status.latestRun.jobsPrepared,
            jobsPendingReview: status.latestRun.jobsPendingReview,
            jobsSubmitted: status.latestRun.jobsSubmitted,
            startedAt: status.latestRun.startedAt,
            completedAt: status.latestRun.completedAt,
            errorsCount: status.latestRun.errorLog.length,
          }
        : null,
      jobCounts: status.jobCounts,
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        status: r.status,
        jobsDiscovered: r.jobsDiscovered,
        jobsPrepared: r.jobsPrepared,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Could not fetch engine status." }, { status: 503 });
  }
}
