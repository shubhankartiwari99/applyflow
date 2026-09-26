/**
 * Engine stop API — cancels a running engine run.
 *
 * POST /api/engine/stop
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { stopEngine } from "../../../../lib/engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const run = await stopEngine(userId);
    if (!run) {
      return NextResponse.json({ error: "No engine run is currently active." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        status: run.status,
        completedAt: run.completedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engine stop failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
