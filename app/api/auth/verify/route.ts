import { NextResponse } from "next/server";
import { isDemoAuthAllowed, productionAuthError, setSessionCookie } from "../../../../lib/auth-server";
import { normalizeEmail } from "../../../../lib/auth-crypto";
import { verifyOtpChallenge } from "../../../../lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown; code?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
    const configError = productionAuthError();
    if (configError) return NextResponse.json({ error: configError }, { status: 503 });
    if (!process.env.RESEND_API_KEY && !isDemoAuthAllowed()) return NextResponse.json({ error: "Email delivery is not configured for this environment." }, { status: 503 });
    const user = await verifyOtpChallenge(email, code);
    if (!user) return NextResponse.json({ error: "That code is invalid or expired. Request a new code and try again." }, { status: 401 });
    const response = NextResponse.json({ ok: true, userId: user.id });
    setSessionCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "We could not verify that code. Please try again." }, { status: 500 });
  }
}
