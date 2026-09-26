import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, userId });
}
