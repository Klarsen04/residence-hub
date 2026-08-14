// SSRF-safe fetch for user-supplied URLs (link previews, OG-image scraping).
//
// A request whose URL comes from user input must not be able to reach internal
// services (loopback, private ranges, link-local, cloud metadata at
// 169.254.169.254, etc.). We validate that the host resolves only to public
// addresses, and follow redirects manually so a public URL can't 3xx-pivot to
// an internal one. Server-only (uses node:dns) — import from route handlers.

import { lookup } from "node:dns/promises";
import net from "node:net";

export class SsrfError extends Error {}

function ipv4ToInt(ip: string): number {
  const p = ip.split(".").map(Number);
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, bits: number) => {
    const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||       // "this" network
    inRange("10.0.0.0", 8) ||      // private
    inRange("100.64.0.0", 10) ||   // CGNAT
    inRange("127.0.0.0", 8) ||     // loopback
    inRange("169.254.0.0", 16) ||  // link-local (incl. cloud metadata)
    inRange("172.16.0.0", 12) ||   // private
    inRange("192.0.0.0", 24) ||    // IETF protocol assignments
    inRange("192.168.0.0", 16) ||  // private
    inRange("198.18.0.0", 15) ||   // benchmarking
    inRange("224.0.0.0", 4) ||     // multicast
    inRange("240.0.0.0", 4)        // reserved
  );
}

function isPrivateIp(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); // IPv4-mapped IPv6
  if (mapped) return isPrivateIpv4(mapped[1]);
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  const h = ip.toLowerCase();
  return (
    h === "::1" ||        // loopback
    h === "::" ||         // unspecified
    h.startsWith("fe80") || // link-local
    h.startsWith("fc") ||   // unique local (fc00::/7)
    h.startsWith("fd") ||
    h.startsWith("ff")      // multicast
  );
}

/** Validate scheme + that every resolved address for the host is public. */
export async function assertPublicUrl(rawUrl: string): Promise<{ url: URL; addresses: string[] }> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new SsrfError("Only http(s) URLs are allowed");
  }
  if (u.username || u.password) {
    throw new SsrfError("URL userinfo is not allowed");
  }
  if (!u.hostname) {
    throw new SsrfError("URL hostname is required");
  }
  const host = u.hostname;
  if (!net.isIP(host) && !/^[a-z0-9.-]+$/i.test(host)) {
    throw new SsrfError("Invalid hostname");
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("URL points at a non-public address");
    return { url: u, addresses: [host] };
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length) throw new SsrfError("Host did not resolve");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new SsrfError("URL resolves to a non-public address");
  }
  return { url: u, addresses: addrs.map((a) => a.address) };
}

/**
 * fetch() for user-supplied URLs. Validates the host is public, follows
 * redirects manually (max 5) re-validating each hop. Throws SsrfError when the
 * URL is invalid or targets a non-public address.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<Response> {
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const { url: validated, addresses } = await assertPublicUrl(current);
    const chosenIp = addresses[0];
    const fetchUrl = new URL(validated.toString());
    fetchUrl.hostname = chosenIp;

    const headers = new Headers(init.headers);
    headers.set("Host", validated.port ? `${validated.hostname}:${validated.port}` : validated.hostname);

    const res = await fetch(fetchUrl.toString(), { ...init, headers, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, validated).toString();
      continue;
    }
    return res;
  }
  throw new SsrfError("Too many redirects");
}
