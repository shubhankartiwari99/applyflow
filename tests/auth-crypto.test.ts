import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  emailHash,
  hashOtp,
  randomId,
  signValue,
  authSecret,
  generateSalt,
  hashPassword,
  verifyPassword,
} from "../lib/auth-crypto";
import { authenticateOrRegisterUser } from "../lib/store";

describe("auth-crypto & passkey security", () => {
  it("normalizes emails by trimming whitespace and converting to lowercase", () => {
    expect(normalizeEmail("  User@Columbia.EDU  ")).toBe("user@columbia.edu");
    expect(normalizeEmail("test.dev@GMAIL.COM")).toBe("test.dev@gmail.com");
  });

  it("produces consistent sha256 HMAC email hashes", () => {
    const hash1 = emailHash("candidate@columbia.edu");
    const hash2 = emailHash(" candidate@Columbia.EDU ");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("hashes passwords securely with unique salts using PBKDF2", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);

    const hash1 = hashPassword("supersecret123", salt1);
    const hash2 = hashPassword("supersecret123", salt2);
    expect(hash1).not.toBe(hash2);

    // Verification passes with correct password
    expect(verifyPassword("supersecret123", salt1, hash1)).toBe(true);
    // Verification fails with incorrect password
    expect(verifyPassword("wrongpass", salt1, hash1)).toBe(false);
  });

  it("authenticates and registers a new user with email and passkey", async () => {
    const testEmail = "friend@columbia.edu";
    const passkey = "secretPasskey2026!";

    // First time registration
    const { user, isNewUser } = await authenticateOrRegisterUser(testEmail, passkey);
    expect(isNewUser).toBe(true);
    expect(user.id).toBeTruthy();

    // Returning user sign-in with correct passkey
    const returning = await authenticateOrRegisterUser(testEmail, passkey);
    expect(returning.isNewUser).toBe(false);
    expect(returning.user.id).toBe(user.id);

    // Returning user sign-in with WRONG passkey must reject
    await expect(
      authenticateOrRegisterUser(testEmail, "wrongPasskey!")
    ).rejects.toThrow(/Incorrect passkey/);
  });

  it("generates 36-character hexadecimal random IDs", () => {
    const id1 = randomId();
    const id2 = randomId();

    expect(id1).toHaveLength(36);
    expect(id2).toHaveLength(36);
    expect(id1).not.toBe(id2);
  });

  it("signs values using HMAC SHA-256 in base64url format", () => {
    const sig1 = signValue("session-payload-123");
    const sig2 = signValue("session-payload-123");
    const sig3 = signValue("session-payload-999");

    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sig3);
    expect(typeof sig1).toBe("string");
    expect(sig1.length).toBeGreaterThan(10);
  });

  it("provides fallback authSecret if environment variable is not defined", () => {
    const secret = authSecret();
    expect(secret).toBeTruthy();
    expect(typeof secret).toBe("string");
  });
});
