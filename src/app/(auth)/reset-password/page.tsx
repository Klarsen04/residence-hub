"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth/AuthShell";

// Kept in step with MIN_PASSWORD_LENGTH in src/lib/passwordReset.ts, which the
// API enforces. Not imported: that module reaches for node:crypto.
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Checked up front so a dead link says so before anyone picks a password.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("This reset link isn't valid. Ask for a new one.");
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => null);
        if (!cancelled && !data?.valid) setError(data?.error || "This reset link isn't valid. Ask for a new one.");
      } catch {
        if (!cancelled) setError("Couldn't check this link. Please try again.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Those two passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Couldn't set that password. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell subtitle="Password updated">
        <div className="space-y-4">
          <AuthNotice tone="success">Your password is set. You can sign in with it now.</AuthNotice>
          <Link href="/login" className={`${authButtonClass} block text-center`}>
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Choose a new password">
      {checking ? (
        <p className="text-sm text-muted-foreground text-center">Checking your link…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoFocus
              className={authInputClass}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className={authInputClass}
              placeholder="Type it again"
            />
          </div>

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? "..." : "Set new password"}
          </button>

          <div className="flex justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:opacity-80 transition-opacity">
              Start over
            </Link>
            <Link href="/login" className="text-primary hover:opacity-80 transition-opacity">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
