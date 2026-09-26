import { createHash, createHmac, randomBytes } from "node:crypto";

const LOCAL_AUTH_SECRET = "applyflow-local-development-secret";

export function authSecret() {
  return process.env.AUTH_SECRET || LOCAL_AUTH_SECRET;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailHash(email: string) {
  return createHmac("sha256", authSecret()).update(normalizeEmail(email)).digest("hex");
}

export function hashOtp(emailHashValue: string, challengeId: string, code: string) {
  return createHash("sha256").update(`${emailHashValue}:${challengeId}:${code}`).digest("hex");
}

export function randomId() {
  return randomBytes(18).toString("hex");
}

export function signValue(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}
