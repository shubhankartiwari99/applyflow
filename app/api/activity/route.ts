/**
 * Activity log API — returns the audit trail of engine actions.
 *
 * GET /api/activity
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import { listActivity, describeAction } from "../../../lib/activity";
import type { ActivityAction } from "../../../lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const runId = url.searchParams.get("runId");

  try {
    const activities = await listActivity(userId, {
      limit,
      offset,
      runId: runId ?? undefined,
    });

    const enriched = activities.map((a) => ({
      ...a,
      description: describeAction(a.action as ActivityAction),
    }));

    return NextResponse.json({ activities: enriched, total: enriched.length });
  } catch {
    return NextResponse.json({ error: "Could not load activity log." }, { status: 503 });
  }
}
