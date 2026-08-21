# Session Handoff — Residence Hub

_Last updated: 2026-08-11_

## 2026-08-11 — Offline AI chat bot (in-browser, free & unlimited)

Added a **fully local AI chat bot** at `/chat` — runs entirely in the user's browser via WebLLM + WebGPU. No API key, no server round-trip, no per-token cost, no daily limit; nothing typed leaves the device. Deliberately independent of the cloud `aiPlanner.ts` (which stays as the higher-quality option).

- **Branch:** `feature/webllm-chat` (NOT committed yet — awaiting review).
- **New dep:** `@mlc-ai/web-llm` (^0.2.84).
- `src/lib/webllm/config.ts` — 3 small WebGPU-friendly instruct models (Llama-3.2-1B default, Llama-3.2-3B, Qwen2.5-1.5B), a short system prompt (small models follow concise prompts better).
- `src/app/(app)/chat/page.tsx` — `"use client"`. WebGPU-support gate → model picker + download progress bar → streaming chat. Dynamic-imports web-llm so the ~MB runtime stays out of the initial bundle (verified: `/chat` first-load only 5.83 kB / 166 kB). Reuses the AI Planner's `renderMarkdown` + composer/thread pattern.
- Registered in the 3 required places: `Sidebar.tsx`, `CommandPalette.tsx` ("Offline AI"), `middleware.ts` (`/chat/:path*`).

**Caveats to know:** first load downloads the model (browser-cached after). Quality is below Gemini — fine for brainstorming/FAQ.

**Verified:** `npx tsc --noEmit` = 0; `npx next build` = 0. Tested live in Chrome (works). Firefox fails WebLLM with `maxStorageBuffersPerShaderStage exceeds limit (requested=10, limit=8)` — its WebGPU is too limited — which drove the dual-engine work below.

### Update — dual engine (auto browser detection) + expanded models

Replaced the WebGPU-only design with **two engines chosen automatically by browser capability**, so it works on Firefox too:
- **New dep:** `@wllama/wllama` (^3.5.1) — llama.cpp WASM, CPU inference.
- `src/lib/localai/models.ts` — `EngineKind` + `LocalModel`; 6 WebLLM (GPU) models (Qwen2.5-0.5B → 7B, Gemma-2-2b, Llama-3.2-1B/3B) and 2 wllama (CPU) models (Qwen2.5-0.5B, Llama-3.2-1B GGUF from bartowski HF repos). System prompt moved here.
- `src/lib/localai/engine.ts` — `detectEngine()` picks `webllm` if WebGPU reports `maxStorageBuffersPerShaderStage ≥ 10`, else `wllama`. `loadEngine()` returns a unified `{kind, chat()}`. wllama wasm from jsDelivr CDN (pinned 3.5.1), loaded via `loadModelFromHF` with `n_gpu_layers:0` (force CPU → guaranteed Firefox support). Both engines dynamically imported (out of initial bundle; `/chat` first-load ~6.8 kB).
- `src/app/(app)/chat/page.tsx` — rewritten: detect → engine-mode banner (GPU fast / CPU slower) → per-engine model picker → streaming chat. Dropped the "unsupported" screen (wllama is universal).
- Removed `src/lib/webllm/config.ts` (superseded by `localai/`).
- wllama multi-thread needs COOP/COEP headers; we use single-thread (no header changes to next.config) — slower but avoids breaking remote images / Vercel Live.

**Verified:** tsc = 0; next build = 0. wllama CPU path NOT yet live-tested on Firefox — do manually.

---

## 2026-08-09 — "Digital Neighbourhood" homepage redesign + full warm rebrand

Redesigned the app around a "modern residential campus / digital neighbourhood" creative direction (warm architectural, editorial, wayfinding — NOT SaaS/purple/glass).

**Design system rebrand (whole app):**
- `globals.css` — rewrote all CSS tokens to a warm architectural palette: ivory paper bg, charcoal ink, forest/sage `--primary`, terracotta `--accent`, warm-yellow signage. Added named tokens (`--sage`, `--terracotta`, `--warm-yellow`, `--charcoal`, etc.) + warm dark mode. Redefined legacy utils (`.glass`, `.gradient-primary`, `.gradient-text`, `.glow`) as warm/architectural equivalents so token-driven markup rethemes for free. Added wayfinding utils: `.wayfinding` (mono tracked labels), `.grid-lines`/`.grid-lines-fine` (blueprint grid), `.rule` (hairline), `.animate-drift`.
- Fonts (root `layout.tsx`): **Fraunces** (`--font-display`, editorial serif for headings), Inter (`--font-sans`), **JetBrains Mono** (`--font-mono`, wayfinding/floor codes). Registered `font-display`/`font-mono` in tailwind.config. Flipped `defaultTheme` dark→**light**; Toaster theme→light.
- Primitives: `button` (default now sage `bg-primary`, added `accent` terracotta variant, rounded-xl→lg), `badge` (warm variants + `accent`), `card` (rounded-2xl→xl, physical shadow not neon). `Sidebar` + app `layout` fully rethemed (sage active state, blueprint-grid backdrop replacing purple/blue blur blobs).
- **Color sweep:** 375 purple/blue/indigo/violet/pink literals across 36 files → `primary` (purple family) / `accent` (blue/pink family) via scripted perl. Then dual-theme-scoped ~305 dark-only `bg/border-white/[x]` tints to `bg-black/[x] dark:bg-white/[x]`. Swapped cold gradient partners (cyan/sky/teal)→sage. Analytics recharts: warm `CHART_COLORS`, fixed dark-baked tooltip/tick/grid literals. Cold hex (#8b5cf6 etc)→warm hex in mixer/wrapped/border-beam.

**New public landing at `/`** (was a redirect to /dashboard): `src/components/landing/` — scroll-narrative journey. `LandingExperience.tsx` (hero → pinned building descent → timeline → community → spaces → resources → footer), `BuildingDiagram.tsx` (SVG residence cross-section, floors light up on scroll), `wayfinding.tsx` (SignLabel/LevelMarker/DirectionArrow/Reveal), `useGsapLenis.ts` (GSAP↔Lenis bridge). `page.tsx` now renders `<LandingExperience/>`.

**Dashboard redesign** (`(app)/dashboard/page.tsx`): reframed as "your floor today" — wayfinding stat strip (numbered serif), event timeline corridor, inspiration mosaic, resources list, directory. Same real SWR `/api/dashboard` data.

**New deps:** `gsap` (^3.15), `lenis` (^1.3), `@gsap/react` (^2.1). Lenis wired app-wide via `src/components/SmoothScroll.tsx` in root layout.

**GSAP gotchas hit:** (1) can't tween `fill` with `hsl(var(--x))` — colour parser needs literal `hsl(h, s%, l%)`. (2) don't `gsap.to()` a raw `<svg>` root with yPercent+ScrollTrigger (threw null.map) — removed that drift. Guard all refs/empty selectors before tweening.

**Verified:** `npx tsc --noEmit` = 0; `npm run build` = 0 (`/` static, 215kB first load). Playwright-screenshotted landing (hero/building/footer), dashboard (logged in as the seeded admin), login — all render clean, no console/page errors. NOT committed yet.

---

_Prior session: 2026-08-05_

Working doc to pick up where we left off. Not committed by default — it's a local scratchpad.

## Context

**Repo:** `/Users/larkirs/residence-hub`
**GitHub:** `github.com/Klarsen04/residence-hub`
**Active branch:** `ui-overhaul-dark-mode` (we push here, NOT `main`)
**Stack:** Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS 3, Radix/shadcn-style UI, Prisma + SQLite/libSQL (Turso), NextAuth v4, Framer Motion v12, Recharts, Sonner, SWR, Zod, Google Gemini.

App is a residence-life management hub for student RAs (~20 feature areas: events, budget, incidents, room checks, check-ins, duty, polls, feedback, AI planner, decorations, inspiration/collaboration boards, analytics, etc.).

## What we did this session

1. **Deep-research report** — found open-source resources to enhance the UI. Top picks that FIT the stack (copy-paste, no version fights): **Magic UI** (MIT), **shadcn Blocks**, **Tremor** (Apache-2.0). Skipped Next16/React19 admin starters (Kiranism/satnaing) — they fight the Tailwind3/React18 setup.

2. **Floor Mixer** (`/mixer`) — resident-matching feature, cloned in spirit from an Amazon intern app (Ctrl+Meet / `Harmony-ctrlmeet`). Playful 10-question "vibe check" → Kindred↔Chaos variety dial → ranked "match drop" cards with match reasons + RA nudge. **100% client-side over a mock resident pool; no AWS, no backend.**
   - `src/lib/mixer/questions.ts` — 10 dorm-life survey questions
   - `src/lib/mixer/matching.ts` — TS port of Ctrl+Meet's engine (Gower similarity, entropy weighting, Gumbel-top-k softmax sampling, MMR de-clone) minus the Bedrock/Titan embedding term
   - `src/lib/mixer/mockPool.ts` — deterministic 24-resident mock pool
   - `src/app/(app)/mixer/page.tsx` — the full flow in the app's design system

3. **Wrapped** (`/wrapped`) — Spotify-Wrapped-style season recap. Real aggregated stats + 12 achievement badges.
   - `src/app/api/wrapped/route.ts` — aggregates real Prisma counts (events, attendance, check-ins, room checks, residents, duty, polls, decorations, notes, inspirations, incidents) + highlights (busiest month, top category, biggest event)
   - `src/lib/wrapped/badges.ts` — 12 badges, bronze/silver/gold tiers, unlock thresholds
   - `src/app/(app)/wrapped/page.tsx` — the page

4. **Magic UI components** (MIT, ported from `~/repos/magic-ui`, adapted to Tailwind 3 + `framer-motion` import instead of `motion/react`):
   - `src/components/ui/number-ticker.tsx` — spring-count-up stats
   - `src/components/ui/blur-fade.tsx` — staggered blur-in reveals
   - `src/components/ui/border-beam.tsx` — glowing animated borders (rewrote v4-only mask CSS as inline styles)
   - `src/components/ui/sparkles-text.tsx` — animated sparkle title
   - Also beam-highlighted the #1 Floor Mixer match.

## Git state

Both commits pushed to `origin/ui-overhaul-dark-mode`, working tree clean:
- `1e62b1a` — Add Floor Mixer
- `b772e18` — Add Residence Life Wrapped page + Magic UI components

## Verified

- `npx tsc --noEmit` → exit 0
- `npx next build` → exit 0; `/mixer`, `/wrapped`, `/api/wrapped` all in route manifest

## Conventions (for any new page)

Register a new `src/app/(app)/<route>/` page in THREE places or it breaks:
1. `src/components/Sidebar.tsx` — navigation array
2. `src/components/CommandPalette.tsx` — commands array
3. `src/middleware.ts` — matcher array (else it 307-redirects / isn't protected)

Pages are `"use client"`, use SWR `fetcher`, `container`/`item` Framer variants, `Card`/`Button`/`Badge` from `@/components/ui/*`, `toast` from sonner. API routes guard with `getServerSession(authOptions)` → 401. Design tokens in `globals.css` (`.gradient-primary`, `.gradient-text`, `.glass`, `.glow`). Default theme is dark; primary is purple. Never use `text-foreground` on light-themed pages (use `text-black/XX`).

## Gotcha

Multiple `next dev` servers collide on ports — a `student-leadership-dashboard` server often squats :3000. A **404** (vs 307) on a known-good route means you hit the wrong project's server. Probe the port from the dev log, or use `PORT=3005 npm run dev`.

## Next / open ideas (not started)

- Seed demo data so Wrapped shows populated numbers (currently reflects real, possibly-sparse DB counts)
- Apply Magic UI polish to the main dashboard
- Make Floor Mixer "multiplayer" over real `/api/residents` data instead of the mock pool
- Verify **Schedule-X** (MIT calendar) + **Masonic** (MIT masonry) — the two research leads that map to events calendar & Pinterest-style boards but weren't fully fact-checked
