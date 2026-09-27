"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => {
        if (response.ok) router.replace("/");
      })
      .catch(() => undefined);
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please enter a passkey of at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password }),
      });

      const result = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) {
        throw new Error(result.error ?? "Authentication failed. Please check your credentials.");
      }

      router.replace("/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Authentication failed.");
      setLoading(false);
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
              stratum<span>apply</span>
            </div>
            <div className="brand-subtitle">multi-portal career command center</div>
          </div>
        </div>

        <h1 className="login-title">Access your workspace</h1>
        <p className="login-desc">
          Sign in or create your personal account using your private passkey.
        </p>

        <form className="login-form" onSubmit={handleLogin}>
          <label className="login-label">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@columbia.edu"
              autoFocus
              required
              className="login-input"
            />
          </label>

          <label className="login-label" style={{ position: "relative" }}>
            Passkey / Password
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or create passkey (6+ chars)"
                required
                minLength={6}
                className="login-input"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  padding: "4px",
                }}
                title={showPassword ? "Hide passkey" : "Show passkey"}
              >
                {showPassword ? "👁️" : "🔒"}
              </button>
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Authenticating…" : "Continue to Workspace"}{" "}
            {!loading && <span className="login-arrow">→</span>}
          </button>
        </form>

        <div className="login-privacy">
          <span className="login-shield">⬡</span>
          <span>
            <strong>First time here?</strong> Setting your passkey now will create your account.
            <br />
            <strong>Returning?</strong> Enter your passkey to resume your saved applications.
          </span>
        </div>
      </div>

      <footer className="login-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span>
            <span className="footer-spark">✦</span> StratumApply — Architected by <strong style={{ color: "var(--text-primary)" }}>Shubhankar Tiwari</strong> (Columbia University)
          </span>
          <span style={{ opacity: 0.35 }}>•</span>
          <a
            href="https://github.com/shubhankartiwari99"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
          >
            GitHub
          </a>
          <span style={{ opacity: 0.35 }}>•</span>
          <a
            href="https://www.linkedin.com/in/shubhankartiwari"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#00A3FF", textDecoration: "none", fontWeight: 500 }}
          >
            LinkedIn
          </a>
        </div>
      </footer>
    </main>
  );
}
