import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { getWorkspace } from "../../../../lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const workspace = await getWorkspace(userId);
  return NextResponse.json({
    authenticated: true,
    userId,
    profile: workspace?.profile ?? null,
  });
}

