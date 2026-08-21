"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Set once the request goes through. Holds whether this deployment can actually
  // send email, because that decides what happens next for the person reading it.
  const [sent, setSent] = useState<{ emailConfigured: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSent({ emailConfigured: !!data?.emailConfigured });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Reset your password">
      {sent ? (
        <div className="space-y-4">
          <AuthNotice tone="success">
            {sent.emailConfigured
              ? "If that email belongs to an account, a reset link is on its way. It works once, for the next hour."
              : "Your request has been logged. A Residence Life administrator can now issue you a reset link — ask them for it."}
          </AuthNotice>
          <p className="text-xs text-muted-foreground">
            Nothing arrived? Check the address you typed, then try again.
          </p>
          <Link href="/login" className="block text-center text-sm text-primary hover:opacity-80 transition-opacity">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the email you sign in with and we&apos;ll start a reset for it.
          </p>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className={authInputClass}
              placeholder="you@example.com"
            />
          </div>

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? "..." : "Send reset link"}
          </button>

          <Link href="/login" className="block text-center text-sm text-primary hover:opacity-80 transition-opacity">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
