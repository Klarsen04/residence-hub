// Minimal, dependency-free email helper. Uses Resend's REST API when
// RESEND_API_KEY is set; otherwise it safely no-ops (logs and returns) so
// features that "send" email never crash in environments without a provider.
//
// To enable in production: set RESEND_API_KEY (and optionally EMAIL_FROM, e.g.
// "Residence Hub <notifications@yourdomain>") in Vercel. Resend's shared
// sandbox sender `onboarding@resend.dev` works for testing without a domain.

interface MailInput {
  to: string;
  subject: string;
  html: string;
}

function sanitizeForLog(value: unknown): string {
  return String(value).replace(/[\r\n]+/g, " ").replace(/[\u0000-\u001F\u007F]/g, "");
}

export async function sendEmail({ to, subject, html }: MailInput): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Residence Hub <onboarding@resend.dev>";

  if (!apiKey) {
    const safeTo = sanitizeForLog(to);
    const safeSubject = sanitizeForLog(subject);
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${safeTo} ("${safeSubject}")`);
    return { sent: false, reason: "no-provider" };
  }
  if (!to) return { sent: false, reason: "no-recipient" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[email] Resend responded ${res.status}: ${await res.text()}`);
      return { sent: false, reason: `provider-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { sent: false, reason: "exception" };
  }
}
