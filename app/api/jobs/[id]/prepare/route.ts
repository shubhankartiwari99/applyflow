/**
 * Job preparation API — triggers cover letter generation + form pre-fill.
 *
 * POST /api/jobs/[id]/prepare
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../../lib/auth-server";
import { prepareJob } from "../../../../../lib/engine-preparer";
import { getWorkspace } from "../../../../../lib/store";
import type { UserProfile } from "../../../../../lib/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const { id } = await context.params;

  try {
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

    const result = await prepareJob(userId, id, profile);

    if (result.error && !result.coverLetterGenerated) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      jobId: result.jobId,
      coverLetterGenerated: result.coverLetterGenerated,
      formDataPrefilled: result.formDataPrefilled,
      error: result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preparation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
