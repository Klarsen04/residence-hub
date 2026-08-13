# Residence Hub — Codebase Guide

A developer-facing walkthrough of how the app is built: the stack, the database,
how the API routes work, the feature areas, and the operational gotchas (especially
the Turso schema sync, which has been the #1 source of production bugs).

> Audience: anyone picking up this repo. Read **Database & Turso sync** and
> **Deployment runbook** first — they explain the class of "Failed to load / save"
> errors that recur in production.

---

## 1. Stack & top-level layout

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React Server + Client Components) |
| Language | TypeScript |
| Styling | Tailwind CSS + a small custom "wayfinding" design system (`components/wayfinding/PageChrome`) |
| ORM | Prisma 6 |
| DB (local) | SQLite file (`prisma/dev.db`) |
| DB (prod) | Turso (libSQL) via `@prisma/adapter-libsql` |
| Auth | NextAuth 4 (Credentials + Google + Azure AD), JWT sessions |
| Calendar UI | `@ilamy/calendar` (duty page) |
| Email | Resend REST API (optional; safe no-op without a key) |
| AI planner | multi-provider (OpenRouter / NVIDIA / Gemini) with fallback |
| Hosting | Vercel; custom domain `jerichoreshub.dpdns.org` |

```
src/
  app/
    (app)/            # authenticated pages (dashboard, residents, check-ins, …)
    (auth)/           # login / register
    api/              # all REST endpoints (route.ts handlers)
  components/
    ui/               # shadcn-style primitives (button, input, badge, card…)
    wayfinding/       # PageHeader, SectionMarker, Plate, EmptyPlate
    TagPicker.tsx     # colour-tag selector (events + duty)
    SessionProvider.tsx
  lib/
    prisma.ts         # Prisma client (libSQL adapter in prod)
    auth.ts           # NextAuth config + identity resolution
    email.ts          # Resend helper (no-op without RESEND_API_KEY)
    boardAccess.ts    # canManageBoard() permission helper
    utils.ts          # cn, formatCurrency, formatDate/Time, formatDateTime
    turso-schema-sql.ts  # AUTO-GENERATED runtime copy of prisma/schema.sql
    aiPlanner.ts / aiLimits.ts / linkPreview.ts
prisma/
  schema.prisma       # source of truth for the data model
  schema.sql          # SQL DDL mirror, used to sync Turso
  dev.db              # local SQLite (gitignored churn)
scripts/
  sync-turso.mjs      # build/CLI: apply schema.sql to Turso
  gen-schema-ts.mjs   # regenerates lib/turso-schema-sql.ts from schema.sql
e2e/                  # Playwright happy-path suite
```

---

## 2. Auth & identity (`src/lib/auth.ts`)

- **Providers:** Credentials (email + bcrypt password), Google, Azure AD. Sessions
  are **JWT** (no DB session store at runtime).
- **Roles:** `User.role` is `ADMIN` or `RESIDENT_ASSISTANT` (default). Role drives
  most permission checks.
- **Registration:** `/register` requires an `AuthorizationCode` (created by an admin
  at `/api/admin/codes`). The code carries the `role` and `hallId` the new user gets.
- **Identity resolution (important):** the `jwt` callback resolves the canonical
  `User` **by email**, so `session.user.id` is always a real `User.id` — never an
  OAuth `providerAccountId`. `signIn` upserts OAuth users **by email** and links the
  provider account. This fixed a class of bugs where OAuth-logged-in RAs got foreign
  key violations on every create because their session id didn't match a `User` row.
- `session.user` carries `{ id, role, hallId }` (see `src/types/next-auth.d.ts`).

Access is gated in two layers: **middleware** redirects unauthenticated users to
`/login`; each API route re-checks the session with `getServerSession(authOptions)`.

---

## 3. Database & the Turso sync (read this)

Prisma is the source of truth (`prisma/schema.prisma`). Locally the app talks to a
SQLite file. **In production it talks to Turso** through the libSQL adapter
(`src/lib/prisma.ts` uses `PrismaLibSQL` when `TURSO_*` env vars are present).

### Why there are three schema artifacts

`prisma db push` only ever targets `DATABASE_URL` (the **local** SQLite file). It
**cannot reach Turso**. So new tables/columns must be applied to Turso separately.
That's done from a committed SQL DDL file, in two places:

| Artifact | Used by | When |
|---|---|---|
| `prisma/schema.prisma` | Prisma client, `prisma db push` (local) | dev |
| `prisma/schema.sql` | `scripts/sync-turso.mjs` | **build time** on Vercel |
| `src/lib/turso-schema-sql.ts` | `/api/admin/repair-db` | **runtime**, admin-triggered |

`turso-schema-sql.ts` is **auto-generated** from `schema.sql` by
`scripts/gen-schema-ts.mjs`, which now runs as part of `npm run build` so it can't go
stale. (A stale copy here was the root cause of repeated prod drift — the runtime
repair couldn't add tables it didn't know about.)

### How a schema change should be shipped

1. Edit `prisma/schema.prisma`.
2. `DATABASE_URL="file:./dev.db" npx prisma db push` → updates local DB + client.
3. **Hand-edit `prisma/schema.sql`** to match (add the `CREATE TABLE` / column). This
   file is what reaches Turso.
4. Commit both. On deploy, the build runs `gen-schema-ts.mjs` (refreshes the runtime
   copy) then `sync-turso.mjs` (applies to Turso *if* `TURSO_*` are available at build).
5. If prod still shows "Failed to …", run the **runtime repair** (below).

### The reliable fix for drift: `/api/admin/repair-db`

Admin-only `POST`. It opens the same libSQL connection the app uses at runtime (so it
works even when the build-time sync didn't) and idempotently:
- `CREATE TABLE IF NOT EXISTS` every table,
- `ALTER TABLE … ADD COLUMN` any column the live DB is missing.

Trigger it from the browser console while signed in as admin:
```js
fetch('/api/admin/repair-db', { method: 'POST' }).then(r => r.json()).then(console.log)
// → { ok: true, tables: N, columnsAdded: M, log: [ "+ CheckIn.boardId", … ] }
```
Or apply the schema from a machine with the Turso creds:
```bash
# put TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in .env.local (or the shell), then:
node scripts/sync-turso.mjs
```
(`turso db show <db> --url` and `turso db tokens create <db>` fetch the creds if the
Vercel vars are marked "Sensitive" and can't be read back.)

---

## 4. Data model (`prisma/schema.prisma`)

Grouped by domain. All ids are `cuid()`, timestamps are `createdAt`/`updatedAt`
unless noted.

**Identity & orgs**
- `User` — `role`, `hallId`, relations to everything they own. `email` is unique.
- `Account` / `Session` / `VerificationToken` — NextAuth tables.
- `ResidenceHall` — a building. `AuthorizationCode` — registration invite (role + hall).

**Roster**
- `Resident` — belongs to a `User` (the owning RA) via `userId`; has `room`, `floor`,
  `wing`, `email`, `year`, `major`, `flagged`. The RA/hall directory.

**Events & budgets**
- `Event` (+ `EventCoOrganizer`, `EventPhoto`, `LearningOutcome`, `EventVendor`) —
  programs; `category`, `tagId`, `recurrenceDays`, `hallId`, `organizerId`.
- `Budget`, `BudgetRequest`, `BudgetItem`, `Expense` — event budgeting.
- `Vendor`, `VendorReview`.

**Check-ins (1:1)**
- `CheckIn` — a private per-RA conversation log: `residentId`, `mood`, `topics`,
  `notes`, `followUp`, optional `boardId`.
- `CheckInBoard` — a check-in *campaign*. `scope` = `shared` (admin-made, all RAs) or
  `personal` (private to owner).

**Room checks (health & safety)**
- `RoomCheckBoard` — **admin-created** campaign (`type` = Health & Safety / Wellness /
  Break). RAs can't create these.
- `RoomCheckResult` — one row per RA per resident per board. `status` = `pass` | `fail`,
  optional `notes`. (Legacy `RoomCheckRound` is the old JSON-blob model, superseded.)

**Collaboration**
- `PlanningBoard` (+ `PlanningBoardItem`, `PlanningBoardMember`) — kanban boards.
  Everyone views; creator + members (+ admin) edit.

**Content & misc**
- `Decoration` (+ `DecorationMaterial`, `DecorationFavorite`, `DecorationMade`) — craft
  catalog; `costEstimate`, materials with per-item `url`.
- `Resource` — shared links/files; `approved` (admin approval gate), `isPublic`.
- `Inspiration` (+ `Collection`, `CollectionItem`, `Favorite`) — pinboard.
- `Tag` — user-owned colour label used by events + duty.
- `DutyShift` — on-duty schedule entry: `date`, `type`, `title`, `tagId`.
- `Incident` — incident reports; `isPublic`, `status`, `severity`, `followUpNeeded`.
- `Note` — sticky notes. `Poll`/`PollVote`, `Feedback`, `Notification`.
- `Conversation`/`Message`, `AIPlannerSession`, `AIUsage`/`GlobalAIUsage` — AI planner.

---

## 5. API conventions

All handlers live in `src/app/api/**/route.ts` (App Router). Shared patterns:

- **Auth:** every handler calls `getServerSession(authOptions)`; returns `401` if absent.
- **Method map:** `GET` (list/read), `POST` (create), `PUT`/`PATCH` (update),
  `DELETE` (`?id=` query param).
- **Ownership vs. admin:** most write routes check `existing.userId === session.user.id
  || isAdmin(...)`. `isAdmin` is a small `prisma.user.findUnique({ select:{role} })` helper.
- **`canEdit` / `canManage` / `canDelete` flags:** list `GET`s often annotate each row
  with permission booleans so the UI can show/hide controls without a second call.
- **Dedup → `409`:** create routes that must be unique return `409` with a message the
  client shows (e.g. check-ins "already checked in today").
- **Error surfacing:** clients read the JSON `error` field; some routes wrap writes in
  try/catch to return a structured message instead of an empty 500.

### Route reference (by domain)

**Auth / admin**
- `auth/[...nextauth]` — NextAuth handler.
- `register` — create an RA account from an `AuthorizationCode`.
- `admin/codes` — admin CRUD for authorization codes.
- `admin/repair-db` — **admin-only** runtime Turso schema repair (see §3).
- `team` — list all users (id, name, role, hall, counts) — used by pickers.

**Roster & dashboard**
- `residents` — `GET` (all, each tagged `canEdit`/`ownerId`), `POST` (create; requires
  name/room/floor/wing/email/year), `PUT` (edit; owner or admin), `DELETE`.
- `dashboard` — aggregates upcoming `events` + recent `inspirations` + `resources`.

**Events**
- `events` — `GET` (own/hall/co-organized), `POST` (create; supports `recurrenceDays`
  fan-out; nulls a dangling `hallId` defensively), `PATCH`, `DELETE`.
- `events/[id]` — single event read/update/delete. `events/all` — calendar feed.

**Check-ins**
- `check-in-boards` — `GET` (shared + your personal), `POST` (admin → shared, else
  personal), `DELETE` (owner/admin).
- `check-ins?boardId=` — `GET` (your own, scoped by board / `individual`), `POST`
  (create with dedup: shared = once per resident; personal/individual = once per
  resident per day → `409`), `PUT` (edit own), `DELETE` (own).

**Room checks**
- `room-check-boards` — `GET` (all; each carries your `myDoneCount`), `POST`
  (**admin only**, else `403`), `DELETE` (owner/admin).
- `room-check-boards/[id]/results` — `GET` (your results in the board), `POST`
  (create/overwrite one result per resident; `pass`|`fail`; a `fail` emails the
  resident once), `DELETE?resultId=` (undo — returns them to pending).
- `room-checks` — legacy round-based endpoint (superseded by boards).

**Collaboration**
- `boards` — `GET` (all; `canManage` flag), `POST` (create), `PUT` (edit title/desc;
  manager only), `DELETE` (owner/admin).
- `boards/[id]/items` — task `POST`/`PUT`/`DELETE`, all gated by `canManageBoard`.
- `boards/[id]/members` — add/remove collaborators (`canManageBoard`, or self-remove).

**Content**
- `decorations` — `GET` (tagged `canEdit`), `POST`. `decorations/[id]` — `PUT`/`DELETE`
  (owner/admin). `[id]/favorite`, `[id]/made` — engagement actions.
- `resources` — `GET` (approved + your own; admin sees all), `POST` (admin auto-approved,
  else pending), `PUT` (edit; admin-only `approved` toggle), `DELETE`.
- `inspiration` (+ `[id]`, `preview`) — pinboard CRUD + link-preview scraping.
- `duty` — `GET`, `POST` (with `title`, recurrence, RA assignment), `PUT` (edit),
  `DELETE`.
- `notes` — `GET`/`POST`/`PUT`/`DELETE` (own).
- `incidents` — `GET` (own + public; admin all), `POST`, `PUT` (owner/admin).
- `tags` — `GET` (seeds a default palette on first use), `POST`/`PUT`/`DELETE`.
- `notifications`, `og-image`, `ai-planner` (+ `chat`, `conversations`).

---

## 6. Feature walkthroughs

**Residents / Floor Roster** (`(app)/residents`) — the directory. Admins see everyone;
RAs see their own. Inline add + edit (name/room/floor/wing required, email + year
required, phone/major optional). Floor/Wing are structured selects.

**Check-ins** (`(app)/check-ins`) — private per RA. A **board selector** (Individual +
shared/personal boards) sets context; the resident dropdown auto-fills room; recent
check-ins can be **edited/deleted**. Dedup is enforced server-side.

**Room Checks** (`(app)/room-checks`) — pick an **admin-created board**, mark your
residents **Pass/Fail** with an optional note (a Fail emails the resident a
re-inspection notice). A checked resident **drops off the pending list** into "Done",
where **Edit** and **Undo** fix mistakes. Filter the pending pool by RA/floor/wing.

**Collaboration** (`(app)/collaboration`) — kanban boards. Everyone views; the creator,
added **collaborators**, or an admin can add/edit/move/delete tasks and edit the board.
Uses drag-and-drop across TODO/IN_PROGRESS/DONE.

**Decorations** (`(app)/decorations`) — craft catalog. Materials carry a "where to buy"
link; **Est. total auto-sums** material costs; a source/tutorial link is stored in
`fileUrl`. Creator/admin can **edit** (materials replaced wholesale) and delete. Admins
can **import** the built-in campus resource links into the DB to make them editable.

**Resources** (`(app)/resources`) — approval flow: non-admin submissions are **pending**
until an admin **approves** (then visible platform-wide). Creator/admin edit + delete.

**Duty** (`(app)/duty`) — `@ilamy/calendar`. The built-in Ilamy event form is
suppressed (`renderEventForm={() => null}` + `disableDragAndDrop`); creation/editing
goes through the app's own panel (title, type, assigned RA, tag, repeat). Clicking a
shift opens an **edit** form; delete is a secondary action. `onCellClick` reads
`cell.start` (not `cell.date`, which doesn't exist on Ilamy's `CellInfo`).

**Events / Duty / Incidents / Notes / Inspiration / AI planner** — standard CRUD pages;
notes/incidents/dashboard timestamps use `formatDateTime` (local, readable).

---

## 7. Shared libraries

- `lib/prisma.ts` — singleton client; uses the libSQL adapter when `TURSO_*` are set,
  else the local file. **Restart `next dev` after a schema change** so the regenerated
  client loads (a stale client causes empty 500s locally).
- `lib/auth.ts` — see §2.
- `lib/email.ts` — `sendEmail({to,subject,html})`. Uses Resend if `RESEND_API_KEY` is
  set; otherwise logs and no-ops (never throws). Set `EMAIL_FROM` for a custom sender.
- `lib/boardAccess.ts` — `canManageBoard(boardId, userId)` = creator | member | admin.
- `lib/utils.ts` — `formatDateTime()` → "August 13, 2026 at 1:19 PM".
- `lib/turso-schema-sql.ts` — generated; do not hand-edit (see §3).

---

## 8. Local development

```bash
npm install
DATABASE_URL="file:./dev.db" npx prisma db push   # create/refresh local DB
npm run dev                                        # http://localhost:3000
```

Seeded admin (via `prisma/seed.ts`): `admin@residencehub.com` / `admin123`.

Useful:
```bash
npx tsc --noEmit --skipLibCheck   # type-check
npm run lint                      # eslint
npm run test:e2e                  # Playwright suite (see below)
```

After **any** `schema.prisma` change: `prisma db push` **and restart `npm run dev`**
(the running server holds the old Prisma client), and update `prisma/schema.sql`.

---

## 9. Testing (`e2e/`)

Playwright happy-path suite driven against a live dev server.
- `e2e/auth.setup.ts` logs in once (admin) and saves `storageState`.
- `e2e/rh.spec.ts` covers the core create/edit flows (residents, check-ins, boards,
  inspiration, decorations, resources, notes, events, duty), serial + single worker
  (they share data).
- Run: `npm run test:e2e` (auto-reuses a running dev server or starts one). Report:
  `npm run test:e2e:report`.

Note: the suite creates real rows in the local DB (tagged `E2E-…`).

---

## 10. Deployment runbook

Prod is Vercel, DB is Turso.

1. Merge the feature branch → the production branch; Vercel builds.
2. Build runs: `prisma generate` → `gen-schema-ts.mjs` → `sync-turso.mjs` → `next build`.
3. **If you see "Failed to load / save" in prod after a schema change**, the Turso
   columns/tables are missing. Fix it immediately with the admin repair:
   `fetch('/api/admin/repair-db',{method:'POST'})` in the console (signed in as admin),
   or `node scripts/sync-turso.mjs` with the Turso creds. See §3.
4. Ensure `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` are available to the **Build** step
   (not just runtime) if you want the build-time sync to do this automatically.

### Environment variables (Vercel)
`DATABASE_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXTAUTH_URL`,
`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `AZURE_AD_CLIENT_ID/SECRET/TENANT_ID`,
`RESEND_API_KEY` + `EMAIL_FROM` (optional — enables emails), and the AI-planner keys
(`OPENROUTER_API_KEY` / `NVIDIA_API_KEY` / `GEMINI_API_KEY`). See `.env.example`.

---

## Appendix — recurring gotchas

- **Turso drift** is the top cause of prod bugs; the runtime `repair-db` is the fix.
- **Restart `next dev`** after schema changes (stale Prisma client → empty 500s).
- **`prisma db push` never touches Turso** — only local SQLite.
- Ilamy `CellInfo` exposes `start`/`end`, not `date`.
- OAuth identity is resolved by **email**, not `providerAccountId`.
