import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import { getWorkspace, saveWorkspace, type WorkspaceData } from "../../../lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }
  try {
    const workspace = (await getWorkspace(userId)) ?? {};
    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json({ error: "Workspace storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { workspace?: WorkspaceData };
    const workspace = body.workspace;
    if (!workspace || typeof workspace !== "object") {
      return NextResponse.json({ error: "A workspace payload is required." }, { status: 400 });
    }
    await saveWorkspace(userId, workspace);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Workspace storage is temporarily unavailable." }, { status: 503 });
  }
}
