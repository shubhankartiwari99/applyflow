import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { authSecret, signValue } from "./auth-crypto";

export const SESSION_COOKIE = "applyflow_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sessionToken(userId: string, expiresAt: number) {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${signValue(payload)}`;
}

export function setSessionCookie(response: NextResponse, userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  response.cookies.set(SESSION_COOKIE, sessionToken(userId, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

export function userIdFromRequest(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  const [userId, expiresAtText, signature] = token.split(".");
  if (!userId || !expiresAtText || !signature) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  const expected = signValue(`${userId}.${expiresAtText}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return userId;
}

export function isDemoAuthAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_AUTH === "true";
}

export function productionAuthError() {
  if (process.env.NODE_ENV !== "production") return null;
  if (isDemoAuthAllowed()) {
    const missing = ["AUTH_SECRET"].filter((name) => !process.env[name]);
    return missing.length ? `Production authentication is not configured. Missing: ${missing.join(", ")}.` : null;
  }
  const missing = ["DATABASE_URL", "AUTH_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL"].filter((name) => !process.env[name]);
  return missing.length ? `Production authentication is not configured. Missing: ${missing.join(", ")}.` : null;
}
