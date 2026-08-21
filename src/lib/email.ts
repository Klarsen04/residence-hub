/**
 * Outbound email, if it's been set up.
 *
 * There's no mail provider wired in by default, so this is deliberately
 * optional: with RESEND_API_KEY and EMAIL_FROM set, a reset link is emailed
 * straight to the person; without them, `emailConfigured()` is false and the
 * flow falls back to an admin handing the link over. Uses Resend's HTTP API
 * directly rather than adding a dependency for one request.
 */

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

/**
 * Where replies should land, if anywhere. Optional: `from` is typically a
 * no-reply address, so this gives someone a human to answer to.
 *
 * Trimmed, and undefined when there's nothing left — Resend rejects an empty
 * `reply_to`, and a rejected send means the reset email quietly never arrives.
 * So the field is left out entirely rather than sent blank.
 */
function replyTo(): string | undefined {
  const address = process.env.EMAIL_REPLY_TO?.trim();
  return address || undefined;
}

interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Returns whether the mail actually went out. Never throws — callers carry on either way. */
export async function sendMail({ to, subject, text }: Mail): Promise<boolean> {
  if (!emailConfigured()) return false;
  const reply = replyTo();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
        ...(reply ? { reply_to: reply } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend rejected the message:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

export function sendPasswordResetEmail(to: string, link: string, minutes: number): Promise<boolean> {
  return sendMail({
    to,
    subject: "Reset your Residence Hub password",
    text: [
      "Someone asked to reset the password for this Residence Hub account.",
      "",
      `Set a new one here (the link works once, for the next ${minutes} minutes):`,
      link,
      "",
      "If this wasn't you, nothing has changed — you can ignore this email.",
    ].join("\n"),
  });
}
