import { NextResponse } from "next/server";
import { setSessionCookie } from "../../../../lib/auth-server";
import { normalizeEmail } from "../../../../lib/auth-crypto";
import { authenticateOrRegisterUser } from "../../../../lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Your passkey must be at least 6 characters." }, { status: 400 });
    }

    const { user, isNewUser } = await authenticateOrRegisterUser(email, password);
    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      isNewUser,
      message: isNewUser ? "Account created successfully!" : "Signed in successfully!",
    });

    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
