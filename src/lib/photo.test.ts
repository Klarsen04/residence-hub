import { describe, it, expect } from "vitest";

import { MAX_IMAGE_BYTES, dataUrlBytes, validateStoredImage } from "@/lib/photo";

/** A data URL whose base64 payload decodes to roughly `bytes`. */
function fakeDataUrl(bytes: number, mime = "image/jpeg"): string {
  return `data:${mime};base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;
}

describe("dataUrlBytes", () => {
  it("decodes the payload length, not the string length", () => {
    // "aGk=" is "hi" — 2 bytes from 4 characters with one pad.
    expect(dataUrlBytes("data:image/jpeg;base64,aGk=")).toBe(2);
  });

  it("accounts for double padding", () => {
    // "YQ==" is "a".
    expect(dataUrlBytes("data:image/jpeg;base64,YQ==")).toBe(1);
  });

  it("returns 0 when there's no payload separator", () => {
    expect(dataUrlBytes("not-a-data-url")).toBe(0);
  });
});

describe("validateStoredImage", () => {
  it("treats absent and empty as no photo", () => {
    expect(validateStoredImage(null)).toBeNull();
    expect(validateStoredImage(undefined)).toBeNull();
    expect(validateStoredImage("")).toBeNull();
  });

  it("accepts an http(s) link", () => {
    expect(validateStoredImage("https://example.com/dec.jpg")).toBeNull();
    expect(validateStoredImage("http://example.com/dec.jpg")).toBeNull();
  });

  it("rejects a link that isn't http(s)", () => {
    // Blocks javascript: and similar from reaching an <img src>.
    expect(validateStoredImage("javascript:alert(1)")).toMatch(/http/);
    expect(validateStoredImage("/local/path.png")).toMatch(/http/);
  });

  it("rejects an over-long link", () => {
    expect(validateStoredImage(`https://example.com/${"a".repeat(3000)}`)).toMatch(/too long/);
  });

  it("accepts a data URL within the size cap", () => {
    expect(validateStoredImage(fakeDataUrl(1000))).toBeNull();
  });

  it("rejects a data URL over the size cap", () => {
    expect(validateStoredImage(fakeDataUrl(MAX_IMAGE_BYTES + 10_000))).toMatch(/too large/);
  });

  it("rejects a non-image data URL", () => {
    expect(validateStoredImage("data:text/html;base64,PGgxPmhpPC9oMT4=")).toMatch(/isn't supported/);
  });

  it("rejects a non-string value", () => {
    expect(validateStoredImage(42)).toMatch(/link or an uploaded image/);
  });
});
