import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createOtpChallenge } from "../../../../lib/store";
import { isDemoAuthAllowed, productionAuthError } from "../../../../lib/auth-server";
import { normalizeEmail } from "../../../../lib/auth-crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    const configError = productionAuthError();
    if (configError) return NextResponse.json({ error: configError }, { status: 503 });
    if (!process.env.RESEND_API_KEY && !isDemoAuthAllowed()) return NextResponse.json({ error: "Email delivery is not configured for this environment." }, { status: 503 });

    const challenge = await createOtpChallenge(email);
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: "Your StratumApply sign-in code",
        text: `Your StratumApply sign-in code is ${challenge.code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      });
      if (result.error) return NextResponse.json({ error: "The verification email could not be sent. Please try again." }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, demoCode: challenge.code });
  } catch {
    return NextResponse.json({ error: "We could not start sign-in. Please try again." }, { status: 500 });
  }
}
