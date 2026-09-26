/**
 * Engine start API — kicks off the automation pipeline.
 *
 * POST /api/engine/start
 * Body: { config?: Partial<RunConfig> }  — optional overrides
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { startEngine } from "../../../../lib/engine";
import { getWorkspace } from "../../../../lib/store";
import type { RunConfig, UserProfile } from "../../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      config?: Partial<RunConfig>;
    };

    // Get user profile from workspace
    const workspace = await getWorkspace(userId);
    const wsProfile = (workspace as Record<string, unknown>)?.profile as Partial<UserProfile> | undefined;

    const profile: UserProfile = {
      fullName: wsProfile?.fullName ?? "",
      email: wsProfile?.email ?? "",
      linkedin: wsProfile?.linkedin ?? "",
      handshake: wsProfile?.handshake ?? "",
      github: wsProfile?.github ?? "",
      portfolio: wsProfile?.portfolio ?? "",
      targetRoles: wsProfile?.targetRoles ?? "",
      locations: wsProfile?.locations ?? "",
      workAuthorization: wsProfile?.workAuthorization ?? "",
      coverLetterTemplate: wsProfile?.coverLetterTemplate ?? "",
    };

    const run = await startEngine(userId, profile, body.config);

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        status: run.status,
        jobsDiscovered: run.jobsDiscovered,
        jobsPrepared: run.jobsPrepared,
        jobsPendingReview: run.jobsPendingReview,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        errorsCount: run.errorLog.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engine start failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
