import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const LOCAL_AUTH_SECRET = "stratumapply-local-development-secret";

export function authSecret() {
  return process.env.AUTH_SECRET || LOCAL_AUTH_SECRET;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailHash(email: string) {
  return createHmac("sha256", authSecret()).update(normalizeEmail(email)).digest("hex");
}

export function randomId() {
  return randomBytes(18).toString("hex");
}

export function signValue(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

/** Generate a cryptographically secure random salt */
export function generateSalt() {
  return randomBytes(16).toString("hex");
}

/** Hash a password or passkey using PBKDF2 SHA-512 with salt */
export function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
}

/** Verify a password against its stored salt and hash in constant time */
export function verifyPassword(password: string, salt: string, storedHash: string) {
  const hash = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Legacy OTP helper retained for backwards compatibility */
export function hashOtp(emailHashValue: string, challengeId: string, code: string) {
  return createHash("sha256").update(`${emailHashValue}:${challengeId}:${code}`).digest("hex");
}
