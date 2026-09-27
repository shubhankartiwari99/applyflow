import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  emailHash,
  hashOtp,
  randomId,
  signValue,
  authSecret,
} from "../lib/auth-crypto";

describe("auth-crypto", () => {
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

  it("hashes OTP codes with challenge ID and email hash", () => {
    const eHash = emailHash("test@columbia.edu");
    const challengeId = "chal_123456";
    const otp1 = hashOtp(eHash, challengeId, "123456");
    const otp2 = hashOtp(eHash, challengeId, "123456");
    const otp3 = hashOtp(eHash, challengeId, "654321");

    expect(otp1).toBe(otp2);
    expect(otp1).not.toBe(otp3);
    expect(otp1).toHaveLength(64);
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
