/**
 * POST /api/discovery
 * Import live jobs from a public Greenhouse or Lever board URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import { discoverFromUrl } from "../../../lib/engine-discovery";
import { defaultRunConfig } from "../../../lib/engine";
import { getWorkspace } from "../../../lib/store";
import { listJobs } from "../../../lib/jobs";
import type { UserProfile } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "A job URL is required." }, { status: 400 });
    }

    const workspace = await getWorkspace(userId);
    const wsProfile = (workspace as { profile?: Partial<UserProfile> } | null)?.profile;
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

    const config = defaultRunConfig(profile);
    const result = await discoverFromUrl(userId, body.url.trim(), { ...config, maxJobsPerRun: 80 });

    if (result.source === "unsupported") {
      return NextResponse.json({
        source: "manual-review",
        jobs: [],
        message: result.errors[0] ?? "This source cannot be imported automatically. Add the role manually with its apply URL.",
      });
    }

    const jobs = await listJobs(userId, { source: result.source.startsWith("greenhouse") ? "greenhouse" : "lever", limit: 80 });

    return NextResponse.json({
      source: result.source,
      jobs,
      jobsFound: result.jobsFound,
      jobsNew: result.jobsNew,
      errors: result.errors,
      message: result.jobsNew > 0
        ? `Imported ${result.jobsNew} matching role(s) from ${result.source} (${result.jobsFound} postings scanned).`
        : result.errors[0] ?? `No matching roles in ${result.jobsFound} postings. Broaden target roles in Profile, or add a job manually.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not analyze that link.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
