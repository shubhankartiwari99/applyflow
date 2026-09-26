"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session").then((response) => {
      if (response.ok) router.replace("/");
    }).catch(() => undefined);
  }, [router]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const result = (await response.json()) as { error?: string; demoCode?: string };
      if (!response.ok) throw new Error(result.error ?? "We could not send a verification code.");

      if (result.demoCode) {
        setGeneratedOtp(result.demoCode);
      }
      setSending(false);
      setStep("otp");
    } catch (requestError) {
      setSending(false);
      setError(requestError instanceof Error ? requestError.message : "We could not send a verification code.");
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "That code is invalid or expired.");
      router.replace("/");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "That code is invalid or expired.");
      setSending(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-bg-grid" aria-hidden="true" />
      <div className="login-bg-glow" aria-hidden="true" />

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            <span>✦</span>
          </div>
          <div>
            <div className="brand-name">
              apply<span>flow</span>
            </div>
            <div className="brand-subtitle">application command center</div>
          </div>
        </div>

        {step === "email" ? (
          <>
            <h1 className="login-title">Sign in to your workspace</h1>
            <p className="login-desc">
              Enter your email to receive a 6-digit one-time code. No passwords required.
            </p>

            <form className="login-form" onSubmit={handleSendOtp}>
              <label className="login-label">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  autoFocus
                  required
                  className="login-input"
                />
              </label>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-submit" disabled={sending}>
                {sending ? "Sending code…" : "Send verification code"}{" "}
                {!sending && <span className="login-arrow">→</span>}
              </button>
            </form>

            <div className="login-privacy">
              <span className="login-shield">⬡</span>
              <span>
                Each user gets an isolated, private workspace. Resumes, tailored cover letters, and application queues are strictly scoped to your email.
              </span>
            </div>
          </>
        ) : (
          <>
            <h1 className="login-title">Enter verification code</h1>
            <p className="login-desc">
              We sent a 6-digit verification code to <strong>{email}</strong>
            </p>

            {generatedOtp && (
              <div
                style={{
                  margin: "16px 0",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(107, 92, 255, 0.08)",
                  border: "1px solid rgba(107, 92, 255, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#d0d7e3",
                }}
              >
                <span>
                  Code: <strong style={{ letterSpacing: "2px", color: "#a78bfa", fontSize: "14px" }}>{generatedOtp}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(generatedOtp)}
                  style={{
                    background: "rgba(107, 92, 255, 0.2)",
                    border: "1px solid rgba(107, 92, 255, 0.4)",
                    color: "#fff",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Autofill
                </button>
              </div>
            )}

            <form className="login-form" onSubmit={handleVerifyOtp}>
              <label className="login-label">
                6-digit code
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="login-input login-input-otp"
                />
              </label>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-submit" disabled={sending}>
                {sending ? "Verifying…" : "Verify & Enter Workspace"}{" "}
                {!sending && <span className="login-arrow">→</span>}
              </button>
            </form>

            <button
              className="login-back"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
              }}
            >
              ← Use a different email
            </button>
          </>
        )}
      </div>

      <footer className="login-footer">
        <span>
          <span className="footer-spark">✦</span> ApplyFlow — Your application command center
        </span>
      </footer>
    </main>
  );
}

