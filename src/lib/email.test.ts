import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { emailConfigured, sendMail } from "@/lib/email";

/**
 * These assert the exact JSON that would reach Resend. `fetch` is stubbed, so
 * nothing is ever sent and no API key is needed.
 */

const MAIL = { to: "someone@example.com", subject: "Subject", text: "Body" };

/** The parsed request body of the one call that was made. */
function sentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", "Residence Hub <noreply@example.com>");
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendMail reply_to", () => {
  it("leaves the field out entirely when EMAIL_REPLY_TO is unset", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", undefined);

    await expect(sendMail(MAIL)).resolves.toBe(true);
    const body = sentBody(fetchMock);
    // Absent, not null and not empty — Resend rejects a blank reply_to.
    expect(body).not.toHaveProperty("reply_to");
    expect(Object.keys(body).sort()).toEqual(["from", "subject", "text", "to"]);
  });

  it("sends the address verbatim when it's set", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "hello@example.com");

    await sendMail(MAIL);
    expect(sentBody(fetchMock).reply_to).toBe("hello@example.com");
  });

  it("treats whitespace as unset", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "   ");

    await sendMail(MAIL);
    expect(sentBody(fetchMock)).not.toHaveProperty("reply_to");
  });

  it("trims a padded address, so a stray space in the env box is harmless", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "  hello@example.com\n");

    await sendMail(MAIL);
    expect(sentBody(fetchMock).reply_to).toBe("hello@example.com");
  });

  it("changes nothing else about the payload", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "hello@example.com");

    await sendMail(MAIL);
    expect(sentBody(fetchMock)).toEqual({
      from: "Residence Hub <noreply@example.com>",
      to: "someone@example.com",
      subject: "Subject",
      text: "Body",
      reply_to: "hello@example.com",
    });
  });

  it("makes no request at all when there's no API key, reply_to or not", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("EMAIL_REPLY_TO", "hello@example.com");

    expect(emailConfigured()).toBe(false);
    await expect(sendMail(MAIL)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
