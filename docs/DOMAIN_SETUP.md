# Free Domain Setup — DigitalPlat → Cloudflare → Vercel

The exact, repeatable process for giving a Vercel-hosted app a free custom domain.
Used for `leadora.dpdns.org`, `jerichoreshub.dpdns.org`, and `book2audio.dpdns.org`.

**The chain:** a free subdomain from **DigitalPlat FreeDomain** (`*.dpdns.org`) → DNS
managed on **Cloudflare** (via nameserver delegation) → pointed at **Vercel**.

---

## Prerequisites
- A **DigitalPlat FreeDomain** account (limit ~3 domains/account).
- A **Cloudflare** account (free plan).
- The app already deployed on **Vercel**.

---

## 1. Claim the domain on DigitalPlat
1. Sign in to the DigitalPlat FreeDomain dashboard.
2. **Register / Apply** for a domain → pick your name + a TLD (e.g. `book2audio.dpdns.org`) → confirm it's available → register.

## 2. Add the domain to Cloudflare & get the nameservers
1. **dash.cloudflare.com → Add a site** → enter the domain → **Free** plan → Continue.
2. Cloudflare assigns **two nameservers** unique to your account, e.g.:
   ```
   dana.ns.cloudflare.com
   rob.ns.cloudflare.com
   ```
   Copy both. (Also visible later on the domain's **Overview** page.)

> ⚠️ **Subdomain caveat:** Cloudflare's free plan officially only accepts **apex**
> domains as zones and may reject a bare subdomain like `book2audio.dpdns.org`. If it
> won't add the zone, skip Cloudflare and manage DNS directly in **DigitalPlat's own DNS
> panel** instead (add the same Vercel records from step 4 there).

## 3. Point DigitalPlat at Cloudflare
1. In DigitalPlat, open the domain → **Nameservers** setting → choose **Custom
   nameservers** → paste the two Cloudflare nameservers → save.
2. Back in Cloudflare, it flips **Pending → Active** once it detects the change
   (minutes to a couple hours).

## 4. Add the domain in Vercel (gives you the exact records)
1. **Vercel → project → Settings → Domains → Add** → enter the domain (add both the
   apex and the `www` variant if you want both).
2. Vercel shows the required DNS records. **Copy them verbatim** — the values change
   over time, so trust Vercel's screen, not any hardcoded value. Typical set:
   - **A** `@` → `216.198.79.1` (Vercel's anycast IP)
   - **CNAME** `www` → a `…vercel-dns-017.com` target (or legacy `cname.vercel-dns.com`)
   - **TXT** `_vercel` → `vc-domain-verify=…` (only when the domain is "linked to
     another Vercel account" — see gotchas)

## 5. Add those records in Cloudflare
In **Cloudflare → DNS → Records**, add exactly what Vercel showed. Set every record to
**DNS only (grey cloud)** — *not* proxied — or Vercel can't verify or issue SSL.
- Cloudflare's **Name** field takes the short form (`@`, `www`, `_vercel`) — it appends
  the zone automatically; don't type the full hostname.
- Multiple **TXT** records can share the same name (`_vercel`) — add each separately.

## 6. Verify & go live
1. In Vercel, hit **Refresh / Verify**. Once it sees the records, the domain becomes
   **Valid** and Vercel provisions HTTPS automatically.
2. (Optional) In Vercel domain settings, set a primary and **redirect** apex ↔ `www`
   so everything resolves to one canonical URL.

## 7. Reconfigure NextAuth (only if the app has login)
Skip this for apps without auth (e.g. book2audio). For NextAuth apps
(leadora, jerichoreshub):
1. Vercel env: set **`NEXTAUTH_URL=https://<your-domain>`**.
2. **Google** Cloud console → OAuth client → add redirect URI
   `https://<your-domain>/api/auth/callback/google`.
3. **Azure** app registration → add redirect URI
   `https://<your-domain>/api/auth/callback/azure-ad`.
4. **Redeploy** so `NEXTAUTH_URL` takes effect.

---

## Gotchas we actually hit
- **Keep records "DNS only" (grey cloud).** Proxied (orange) breaks Vercel's SSL/verify.
  If you *do* proxy later, set Cloudflare SSL to **Full (strict)**.
- **"Proxy Status Unknown / Failed to check whether a proxy is in front"** in Vercel is
  **benign** — an inconclusive probe, common right after setup or because DNS is on
  Cloudflare's nameservers. If the site loads over HTTPS, ignore it; it clears to "No
  proxy detected" once DNS settles.
- **"This domain is linked to another Vercel account."** Add the `_vercel` **TXT**
  record(s) Vercel provides to prove ownership; it then moves the domain to your project.
  You can delete the TXT after verification.
- **Apex can't be a CNAME** — use the **A** record for the bare domain; use **CNAME**
  only for `www`. (Cloudflare's CNAME-flattening can also handle apex if needed.)
- **Cloudflare free rejects subdomain zones** — see the caveat in step 2; fall back to
  DigitalPlat's DNS panel.
- **DigitalPlat ~3-domain limit** per account. If you're out of slots, use another free
  provider: `is-a.dev` (PR-based), `js.org` (OSS only), or DNSHE (`*.us.ci`, no review).

## Quick reference — our domains
| Project | Domain | Auth? |
|---|---|---|
| Leadora (student-leadership-dashboard) | `leadora.dpdns.org` | NextAuth → step 7 |
| Residence Hub | `jerichoreshub.dpdns.org` | NextAuth → step 7 |
| book2audio | `book2audio.dpdns.org` | none → skip step 7 |
