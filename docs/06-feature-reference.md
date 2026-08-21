# Residence Hub — Feature Reference

Every feature in the app: what it does, the pages it lives on, the APIs it calls,
the tables and columns it writes, and who is allowed to do what.

Written against the code as it stands (2026-08-21). Where this contradicts
`docs/02-system-architecture.md`, this file is the accurate one — that document
describes an earlier plan (Postgres/Neon, Entra ID, S3, OpenAI) that the build
never took.

---

## 1. Platform at a glance

| Layer | What's actually used |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Data | Prisma 6 → SQLite locally (`prisma/dev.db`), Turso / libSQL in production |
| Auth | NextAuth v4, JWT sessions, Credentials + Google |
| Styling | Tailwind 4 + a small shadcn/ui set + the "wayfinding" design system |
| Client data | SWR (`useSWR`) or plain `fetch` + local state, `sonner` toasts, framer-motion |
| AI | Cloud planner (OpenRouter → NVIDIA NIM → Gemini) **and** fully on-device browser models |
| Images | Downscaled in the browser, stored inline as data URLs — there is no blob store |
| Email | Optional, Resend HTTP API. Only used by password recovery |
| Scheduled work | Vercel Cron → two `/api/cron/*` routes |
| Deployment | Vercel |

### Route groups

- `src/app/(landing)` — the public marketing page.
- `src/app/(auth)` — `login`, `forgot-password`, `reset-password`. **Public.**
- `src/app/(app)` — the signed-in app; wrapped in the sidebar shell.
- `src/app/api` — 38 route handlers, all under `/api/…`.

`src/middleware.ts` gates the app with `withAuth`, listing app paths explicitly
(`/dashboard`, `/events`, …). Anything not in that matcher — the landing page and
all three auth pages — is reachable while signed out.

### Roles

Two roles are issued: `RESIDENT_ASSISTANT` (the default) and `ADMIN`. There is no
role editor; a role comes from the authorization code used at registration.
`RHA_MEMBER` appears only as an AI rate-limit tier.

Server code checks admin with a local helper in each route:

```ts
async function isAdmin(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}
```

Two routes (`/api/admin/codes`, `/api/admin/password-resets`) read the role
straight off the session instead, which is equivalent — the JWT callback
re-resolves `role` from the database on every request.

### Storage conventions

These recur everywhere and explain most of the schema's odd corners:

- **JSON in TEXT columns.** SQLite has no array type, so lists are
  `JSON.stringify`d into a `String?`: `Inspiration.tags`, `Resource.tags`,
  `CheckIn.topics`, `Event.recurrenceDays`, `RoomCheckRound.rooms`,
  `Poll.options`, `Setting.value`.
- **Plain-string dates for day-granular data.** `Incident.date` / `.time`,
  `DutyShift.date`, `Resident.moveInDate` are `String` (`"YYYY-MM-DD"`,
  `"HH:MM"`). Only `Event` uses real `DateTime` columns, and its PUT parses
  `YYYY-MM-DD` as *local* midnight on purpose (`new Date("YYYY-MM-DD")` is UTC).
- **Images as data URLs.** `src/lib/photoUpload.ts` scales a picked file to a
  1280px edge at JPEG q0.82 (retrying at 1024/0.75 then 800/0.7) and returns a
  data URL; `src/lib/photo.ts` caps a stored image at `MAX_IMAGE_BYTES`
  (1,500,000 decoded bytes) and validates it server-side too, so a hand-rolled
  request can't push a multi-megabyte string into a row.
- **Ownership flags computed in the API.** List endpoints attach `isOwner`,
  `canEdit`, `canApprove`, `canDelete`, `canManage` so the UI never re-derives
  permissions. The server still enforces them independently.

### Schema changes reach production through three files

This is the single biggest source of production bugs, so it's worth stating
plainly. There is **no `prisma/migrations` directory**.

1. `prisma/schema.prisma` — the source of truth for the Prisma client.
2. `prisma/schema.sql` — a hand-maintained DDL mirror. **Edit this too.**
3. `src/lib/turso-schema-sql.ts` — generated from (2) by
   `node scripts/gen-schema-ts.mjs`; do not hand-edit.

`scripts/sync-turso.mjs` runs in the build (`prisma generate && gen-schema-ts &&
sync-turso && next build`). Pass 1 rewrites every `CREATE TABLE` / `CREATE INDEX`
to `IF NOT EXISTS`, so **new tables ship safely**. Pass 2 diffs columns against
the live `PRAGMA table_info` and issues `ALTER TABLE ADD COLUMN` (dropping
`NOT NULL`), so **additive nullable/defaulted columns need no migration**.
Renames, drops and type changes are not handled and need a deliberate plan.

If a deploy's sync silently fails, the Admin page's **Sync database** button
(`POST /api/admin/repair-db`) applies the same schema through the runtime libSQL
connection.

Locally: `npx prisma db push && npx prisma generate`, then **restart
`next dev`** — a running dev server holds the old generated client and writes to
new columns will 500.

### API conventions

- Every handler starts with `getServerSession(authOptions)` and returns
  `401 {"error":"Unauthorized"}` when there's no session.
- Errors are `{ error: string }` with 400 (validation), 403 (not yours), 404
  (missing), 409 (duplicate). The events create route also mirrors the message
  into `message` because `events/new` reads that key.
- Collection endpoints are one file with `GET/POST/PUT/DELETE`; deletes take
  `?id=`, updates take the id in the JSON body.
- Writes that another RA should hear about call `notify()` from
  `src/lib/notify.ts` — best-effort, never throws, so a failed notification can't
  fail the action that caused it.

---

## 2. Accounts, sign-in and registration

**Pages** `/login` (also the register form, toggled in place), `/settings`.

**How it works.** `src/lib/auth.ts` configures NextAuth with a JWT session
strategy and two providers:

- **Credentials** — email + password, verified with `bcrypt.compare`. Users are
  keyed by **lowercased** email everywhere.
- **Google** — upserts a user by email on first sign-in.

The `jwt` callback re-reads `id`, `role` and `hallId` from the database on every
request, so a role change takes effect without re-login. `AZURE_AD_*` is still
listed in `.env.example` but is **not** wired up.

Registration is invite-only: `POST /api/register` requires a valid, unused,
unexpired `AuthorizationCode`, enforces `password.length >= 8`, hashes with
`bcrypt.hash(password, 12)`, and consumes the code atomically with
`updateMany({ where: { id, usedBy: null } })` — if it loses that race it deletes
the user it just created and returns an error, so one code can never make two
accounts.

**APIs** `POST /api/register`, `GET|POST /api/auth/[...nextauth]`.

**Storage** `User` (`email` unique, `password` bcrypt hash, `role`, `hallId`),
`Account` (Google link), `AuthorizationCode`. `Session` and `VerificationToken`
exist for the NextAuth adapter shape but are unused under the JWT strategy.

**Settings page** is read-only: name, email, role badge and a dark-mode toggle
via `next-themes`. It calls no API.

---

## 3. Password recovery

**Pages** `/forgot-password`, `/reset-password?token=…` (both public, sharing
`src/components/auth/AuthShell.tsx` with `/login`), plus the **Password resets**
card on `/admin`.

**How it works.** A reset is a single-use ticket. `src/lib/passwordReset.ts` holds
the rules, deliberately free of Prisma and NextAuth so they can be unit-tested:

| Rule | Value |
|---|---|
| Token | 32 random bytes as hex (`crypto.randomBytes`) |
| Stored as | SHA-256 hex only — the raw token is never written down |
| Lifetime | 1 hour (`RESET_TOKEN_TTL_MS`) |
| Rate limit | 3 requests per account per 15 minutes |
| Password floor | 8 characters, same as registration |

Flow:

1. **Ask.** `POST /api/auth/forgot-password { email }` always answers
   `{ ok: true, emailConfigured }` — it never reveals whether an account exists.
   Internally it rate-limits, deletes the account's other unused tickets (the
   newest link is the only live one), stores the new hash, and emails the link if
   the deployment can send mail.
2. **Deliver.** `src/lib/email.ts` posts to the Resend HTTP API (no npm
   dependency added) when **both** `RESEND_API_KEY` and `EMAIL_FROM` are set;
   `emailConfigured()` reports that. Sending never throws.
3. **Or hand it over.** With no mail provider — or when someone can't reach their
   inbox — an admin uses `POST /api/admin/password-resets { email }`. Because only
   hashes are stored, an admin **cannot look up someone's existing link**; this
   issues a fresh one, retires anything outstanding, and returns the raw link
   **once** in the response. The Admin card shows it with a Copy button and loses
   it on reload. `GET` lists up to 50 live requests (name, email, when they asked,
   `selfService`); `DELETE ?id=` cancels one.
4. **Spend it.** The reset page pre-flights `GET /api/auth/reset-password?token=`
   so a dead link says so before anyone types a password. `POST { token,
   password }` validates the password, then claims the ticket with
   `updateMany({ where: { id, usedAt: null } })` **before** hashing into
   `User.password` — two submissions of one link can't both land — then deletes
   the account's remaining unused tickets.

**Storage** `PasswordResetToken(id, userId, tokenHash @unique, expiresAt, usedAt,
createdBy, createdAt)`. `createdBy` is null when the person asked themselves and
the admin's id when an admin issued it, which is what drives the
"They asked" / "Admin issued" badge.

**Permissions** Requesting and redeeming are public by necessity. Listing,
issuing and cancelling are admin-only.

**Tests** `src/lib/passwordReset.test.ts` (23 unit tests) and
`e2e/password-reset.spec.ts`, which drives the whole path end to end and resets
the seeded admin back to its existing password so the run is idempotent.

---

## 4. Dashboard

**Page** `/dashboard` · **API** `GET /api/dashboard`

One query set, scoped to you: the next 5 upcoming events you organize, co-organize
or that belong to your hall; your 6 newest inspiration pins; 5 recent resources
(public or your own). Tables read: `Event`, `Inspiration`, `Resource`. Read-only —
every card links elsewhere to act.

`src/components/GettingStarted.tsx` and `Announcements.tsx` add first-run guidance
on top.

---

## 5. Events

**Pages** `/events` (list + calendar), `/events/new`, `/events/[id]`,
`/events/templates`.

**APIs**

| Call | Purpose |
|---|---|
| `GET /api/events/all` | Every event on the platform — what `/events` and `/analytics` read |
| `GET /api/events` | Only events you organize, co-organize, or that match your hall |
| `POST /api/events` | Create; expands a weekly repeat into one row per date |
| `GET /api/events/[id]` | Detail incl. co-organizers, photos, outcomes, comments |
| `PUT /api/events/[id]` | Edit, record attendance, write/edit/remove the reflection |
| `DELETE /api/events/[id]` | Remove |

**Recurrence.** `POST` accepts `recurrenceDays` (JSON array of weekday numbers
0–6). It creates one event per matching weekday over the next **8 weeks**, always
including the chosen start date, and stores the same `recurrenceDays` on every
row. Dates are parsed as *local* midnight throughout, since `new Date("YYYY-MM-DD")`
is UTC and would skew `getDay()`/`setHours()` outside UTC.

**Reflection & attendance.** `PUT` treats both as clearable: an empty reflection
is written as `null` (so the write-up stops rendering, rather than showing an
empty block), and a blank attendance goes back to `null` instead of `NaN`. A
non-integer or negative attendance is a 400.

**Storage** `Event` (`title, description, date, startTime, endTime, location,
category, status, reflection, attendance, tagId, recurrenceDays, organizerId,
hallId`), plus `EventCoOrganizer`, `EventPhoto`, `LearningOutcome` and `Comment`
which the detail query reads.

**Permissions** Everyone can see every event. Only the organizer or an admin may
edit or delete one.

---

## 6. Floor Roster (residents)

**Page** `/residents` · **API** `GET|POST|PUT|DELETE /api/residents`

The roster is **platform-public to read** — everyone sees every RA's residents,
grouped by RA — but each RA creates, edits and deletes only their own; admins may
touch any.

**Storage** `Resident(name, room, floor "1"|"2"|"3", wing "East"|"West"|null,
phone, email, year, major, notes, flagged, moveInDate, userId)`. Deleting a
resident sets `CheckIn.residentId` to null rather than cascading, so past
check-ins survive.

The roster is the source of the resident pickers on Check-Ins and Room Checks, and
of the weekly "not checked in" digest.

---

## 7. Check-Ins

**Page** `/check-ins` · **APIs** `/api/check-in-boards`, `/api/check-ins`,
`/api/residents`

A check-in is a short note about a conversation with a resident. Boards group them
into campaigns:

- **shared** — created by an admin, shown to every RA. One check-in per resident
  **ever**, across all RAs (409 on a repeat), so a floor gets covered exactly once.
- **personal** — private to its owner. One check-in per resident **per day**.
- **"individual"** — the pseudo-board for check-ins with no board
  (`?boardId=individual` filters to `boardId: null`).

**Privacy.** On a shared board `GET /api/check-ins?boardId=…` returns every RA's
entries so the UI can mark residents done, but other RAs' `mood`, `topics`,
`notes` and `followUp` are **redacted to null** — only `isOwn: true` rows carry
content. Everything else returns only your own rows. Editing and deleting are
owner-only, with no admin override.

**Board editing.** `PUT /api/check-in-boards` renames a board (owner or admin) and
moves it between shared and private (**admin only** — `canReScope`). The UI warns
before making a shared board private, because other RAs lose sight of it and of
the check-ins they logged on it.

**Storage** `CheckInBoard(title, scope, ownerId)`,
`CheckIn(residentId?, residentName, room, mood, topics JSON, notes, followUp,
boardId?, userId)`.

---

## 8. Room Checks

**Page** `/room-checks` · **APIs** `/api/room-check-boards`,
`/api/room-check-boards/[id]/results`, `/api/residents`

Health-and-safety rounds, assigned rather than self-serve: **only an admin can
create a board** (403 otherwise); RAs record results inside it. Every board is
visible to everyone, and each one carries `myDoneCount` so the UI can show your
progress. Results are strictly per-RA: `GET` returns only your own rows.

`POST` records one result per resident per RA per board, enforced by a manual
find-then-update/create (SQLite won't upsert on that composite without a unique
index). `DELETE ?resultId=` removes a mis-recorded one.

**Storage** `RoomCheckBoard(title, type, ownerId)`,
`RoomCheckResult(boardId, userId, residentId?, residentName, room, status
pass|concern|absent, notes)`. `RoomCheckRound` is a leftover from an earlier
design and is unused.

---

## 9. Incidents

**Page** `/incidents` · **APIs** `/api/incidents`, `/api/incident-config`

Incident reports are **private to their author by default**, and sharing one with
the whole RA team takes two deliberate steps. The rules live in
`src/lib/incidentVisibility.ts` (20 unit tests) and never come straight off the
wire — an `isPublic` in a request body is ignored.

| Step | Who | Effect |
|---|---|---|
| Ask | Owner | `shareRequest: "pending"` |
| Approve | Admin | `shareRequest: "approved"`, **`isPublic` stays false** — clearance, not publication |
| Publish | Owner | `isPublic: true` (an admin's own report publishes directly) |
| Decline | Admin | `shareRequest: "rejected"`, and a published report goes back to private |
| Needs changes | Admin | `shareRequest: "changes"` |
| Edit a cleared report | Owner | drops back to `"pending"` — the approval was for the old text |

The badges follow: **Shared**, **Cleared to share** (approved, not yet public),
**Awaiting approval**, **Changes requested**. Owners see Edit / Withdraw /
Share / Make private; an admin looking at *someone else's* report sees only
Approve / Decline / Needs changes — reviewing is not editing.

`GET` returns your own reports plus everything already public (admins see all),
each tagged with `isOwner`, `canEdit`, `canApprove`. `PUT` accepts a partial body:
`EDITABLE` is `date, time, type, severity, location, description, actionTaken`, so
a status-only call can't blank the report; a required field sent empty is a 400.
`DELETE ?id=` is owner-or-admin.

`GET|PUT /api/incident-config` holds the page's editable **Reporting tracks** and
**Campus resources** lists as JSON under the `incident_tracks` and
`campus_resources` keys of `Setting`, falling back to built-in defaults until an
admin customizes them. Editing is admin-only.

**Storage** `Incident(date, time, type, severity low|medium|high|critical,
location, description, actionTaken, followUpNeeded, status open|resolved|escalated,
isPublic, shareRequest)`, `Setting`.

---

## 10. Duty

**Page** `/duty` · **API** `GET|POST|PUT|DELETE /api/duty`

A shared duty calendar: every shift is visible to everyone, and each RA (or an
admin, for anyone) manages their own.

**Creating a run.** `POST` takes a start `date` plus any of `recurrenceDays`
(weekday numbers), `weeks`, `until`, and explicit `dates`.
`src/lib/recurrence.ts` (`expandRecurrence`, unit-tested) turns that into the list
of days; invalid combinations are a 400. Every shift from one run shares a
`seriesId` (a `crypto.randomUUID()`), and a single-date shift gets **none**, so it
doesn't offer series actions it can't honour.

**Deleting.** `DELETE ?id=` removes one shift; `DELETE ?id=…&scope=series` removes
the whole run — scoped to shifts the caller may remove, so an RA clearing a shared
series only clears their own while an admin clears all of it.

`raId` assigns a shift to another RA (validated); a dangling `tagId` is dropped
rather than failing the foreign key.

**Storage** `DutyShift(userId, date "YYYY-MM-DD", type, title, notes, tagId,
seriesId)`.

---

## 11. Notes

**Page** `/notes` · **API** `GET|POST|PUT|DELETE /api/notes`

Private sticky notes — nobody else's are ever returned. Colour + pin, ordered
pinned-first.

**Storage** `Note(title, content, color, pinned, userId)`.

---

## 12. Inspiration

**Page** `/inspiration` · **APIs** `/api/inspiration`, `/api/inspiration/[id]`,
`/api/inspiration/preview`

A pinboard of programme ideas. A pin is **private by default** and can be shared
with the team: `GET` returns `{ OR: [{ userId: me }, { isPublic: true }] }` and
tags each row with `isOwner` and `ownerName` (falling back to "Another RA"). Only
the owner sees the share / edit / delete controls, and someone else's shared pin
shows the owner's name instead.

`POST` takes `isPublic`; `PUT /api/inspiration/[id]` is partial so the card's
share toggle can send `{ isPublic }` alone.

`POST /api/inspiration/preview` resolves a pasted URL to a title/image/video via
`src/lib/linkPreview.ts`, fetched through `src/lib/safeFetch.ts`.

**Storage** `Inspiration(title, description, source, url, imageUrl, category,
tags JSON, isPublic, userId)`. `Collection`, `CollectionItem` and `Favorite` exist
in the schema but no route uses them.

---

## 13. Decorations

**Page** `/decorations` · **APIs** `/api/decorations`, `/api/decorations/[id]`,
`/api/decorations/[id]/favorite`

A gallery of what the team has actually put up, newest first — deliberately not a
plans database: no description, instructions, materials or cost fields on the
form. A post is a title, type, category and a photo, either uploaded (compressed
to a data URL in the browser) or linked.

`POST` validates the image with `validateStoredImage` before writing. The favorite
route toggles a heart inside a transaction and recomputes
`Decoration.favorites` from the real `DecorationFavorite` count, so the counter
can't drift.

**Permissions** Everyone sees everything; `canEdit` is creator-or-admin.

**Storage** `Decoration(title, description?, type, category, imageUrl, favorites,
userId)`, `DecorationFavorite(decorationId, userId)` unique per pair.
`DecorationMade` and `DecorationMaterial` are unused.

---

## 14. Resources

**Page** `/resources` · **API** `GET|POST|PUT|DELETE /api/resources`

A shared library of templates and links with an **approval gate**: an admin's
submission is auto-approved (`approved: true`, `approvedById` set); anyone else's
is pending. Non-admins see approved resources **plus their own**, so a submitter
can watch their pending item; admins see everything. Rows are tagged `canEdit`
(owner or admin) and `canApprove` (admin). Approval sends the submitter a
notification.

**Storage** `Resource(title, description, type, fileUrl, externalUrl, tags JSON,
isPublic, approved, approvedById, userId)`. `approved` defaults to `true` at the
column level so rows that predate the gate stayed visible; the create route always
sets it explicitly.

---

## 15. Collaboration (planning boards)

**Page** `/collaboration` · **APIs** `/api/boards`, `/api/boards/[id]/items`,
`/api/boards/[id]/members`, `/api/team`

Kanban-ish planning boards. **Public to view, restricted to edit**:
`src/lib/boardAccess.ts` `canManageBoard()` allows the creator, anyone added as a
`PlanningBoardMember`, or an admin — and `GET` reports that as `canManage`.
Collaborators are added from the team list; items carry a `type` and an `order`
used for sorting.

**Storage** `PlanningBoard(title, description, userId)`,
`PlanningBoardMember(boardId, userId)` unique per pair,
`PlanningBoardItem(boardId, title, content, type, order)`. Deleting a board
cascades to both.

---

## 16. Team

**Page** `/team` · **API** `GET /api/team`

Every account, alphabetical, with role, hall and counts of organized events,
inspiration pins and decorations. Read-only, and the picker behind co-organizers,
board collaborators and duty assignment.

---

## 17. Analytics

**Page** `/analytics` · **APIs** `GET /api/events/all`, `GET /api/inspiration`

No analytics endpoint exists — the page pulls both collections and computes
everything client-side: events by category and month, attendance totals,
completion rates, pin counts. Anything it shows is therefore derived from data the
caller is already allowed to see.

---

## 18. Notifications

**Page** `/notifications` · **API** `GET|PUT|DELETE /api/notifications`

In-app only; nothing is emailed. `GET` returns your 50 newest.
`PUT { markAllRead: true }` clears everything unread; `PUT { id, read }` flips one;
`DELETE ?id=` removes one. Both writes are scoped with `userId` in the `where`, so
one user can't touch another's row even with a guessed id.

Producers all go through `notify(userId, type, title, description)` — types are
`event | approval | team | resource | ai | system`, which is what the page's icon
map keys off.

**Storage** `Notification(type, title, description, read, userId)`.

---

## 19. AI Planner (cloud)

**Page** `/ai-planner` · **APIs** `/api/ai-planner`, `/api/ai-planner/chat`,
`/api/ai-planner/conversations`

A chat that drafts programme plans. `src/lib/aiPlanner.ts` tries providers in
order (`AI_PROVIDER_ORDER`, default Gemini → OpenRouter → NVIDIA), each
OpenAI-compatible, and falls through on quota/outage/bad-key errors. OpenRouter
additionally fails over *within* one request via its `models` array. Keys live in
env only.

`GET /api/ai-planner` returns the caller's limit status; `POST /api/ai-planner/chat
{ conversationId?, message }` appends the user's turn, generates with the full
history, persists both turns and returns `{ conversationId, reply }`.
Conversations are owner-only to read, list and delete.

**Rate limits** (`src/lib/aiLimits.ts`, unit-tested) are two daily layers, all
env-tunable, resetting at server midnight and keyed `"YYYY-MM-DD"`:

| Layer | Default |
|---|---|
| Per RA | 10/day (`AI_LIMIT_RA_DAILY`) |
| Per RHA member | 5/day |
| Per any other non-admin | 5/day |
| Per admin | unlimited |
| Whole platform | 1000/day (`AI_LIMIT_GLOBAL_DAILY`, 0 disables) |

**Storage** `Conversation(title, userId)`, `Message(conversationId, role
user|assistant, content)`, `AIUsage(userId, day, count)` unique per pair,
`GlobalAIUsage(day, count)`. `AIPlannerSession` is written by the older one-shot
endpoint.

---

## 20. Offline AI

**Page** `/chat` (sidebar: "Offline AI") · **No API at all**

A chat bot that runs entirely in the browser: no key, no server cost, no rate
limit, and nothing leaves the device. `src/lib/localai/engine.ts` detects what the
browser can run and `models.ts` lists the catalogue for it:

- **webllm** — WebGPU-accelerated (Chrome/Edge/Safari 26+).
- **wllama** — CPU/WASM fallback with tiny models, which runs everywhere Firefox
  included.

The model downloads on first use (sizes are shown up front), and the conversation
is component state — nothing is persisted. Independent of the cloud planner in
every respect.

---

## 21. Tags

**Component** `src/components/TagPicker.tsx` · **API**
`GET|POST|PUT|DELETE /api/tags`

Per-user colour labels used by events and duty, replacing raw colour pickers. On a
user's first `GET` the six-colour default palette (Sage, Terracotta, Ochre, Sky,
Plum, Clay) is seeded for them. A tag's name defaults to its colour's name and can
be renamed. `kind` scopes it to `event`, `duty` or `any`. Tags are private to their
owner; deleting one sets `Event.tagId` / `DutyShift.tagId` to null.

---

## 22. Admin

**Page** `/admin` (gated on `session.user.role === "ADMIN"`, and every endpoint
re-checks server-side)

Three cards:

1. **Database** — `POST /api/admin/repair-db` applies the schema through the
   runtime libSQL connection and reports tables checked and columns added.
   Idempotent, safe to re-run; the fix for a page that says "Failed to load"
   after a schema change.
2. **Password resets** — see §3.
3. **Authorization codes** — `GET|POST|DELETE /api/admin/codes`. Generates a
   single-use code for a chosen role, 30-day expiry, with copy and delete.

---

## 23. Scheduled jobs

Both are Vercel Cron entries (`vercel.json`) hitting `GET` routes, and both use the
same guard: with `CRON_SECRET` set, the request must carry
`Authorization: Bearer <CRON_SECRET>`; with it unset, the route works only outside
production.

| Route | Schedule | What it does |
|---|---|---|
| `/api/cron/duty-reminders` | `0 13 * * *` (daily) | Notifies every RA who has a shift **today** |
| `/api/cron/check-in-digest` | `0 14 * * 1` (Mondays) | Notifies each RA of their residents not checked in for 7+ days |

Neither sends email — both write `Notification` rows.

---

## 24. Tables the app doesn't use yet

Present in `prisma/schema.prisma`, referenced by no route: `Budget`,
`BudgetRequest`, `BudgetItem`, `Expense`, `Vendor`, `VendorReview`, `EventVendor`,
`Poll`, `PollVote`, `Feedback`, `Collection`, `CollectionItem`, `Favorite`,
`DecorationMade`, `DecorationMaterial`, `RoomCheckRound`. `Session` and
`VerificationToken` are NextAuth adapter tables that the JWT strategy never
touches. `Comment`, `EventPhoto` and `LearningOutcome` are read by the event
detail query but nothing writes them.

They're harmless — but treat them as unimplemented, not as working features.

---

## 25. Testing and verification

| Command | Covers |
|---|---|
| `npx vitest run` | 93 unit tests over `src/lib` — incident visibility, password reset, recurrence, AI limits, photo rules, utils |
| `npx tsc --noEmit` | Types |
| `npx next lint` | Lint (three pre-existing `no-img-element` warnings) |
| `PORT=3005 npx playwright test` | Full-surface E2E |

Playwright notes: `workers: 1` and `fullyParallel: false`, because the suite runs
against the one dev database. A `setup` project signs in as the seeded admin
(`e2e/auth.setup.ts` → `e2e/.auth/user.json`), so **`#email`, `#password` and
`button[type="submit"]` on `/login` are load-bearing selectors**. The webServer
honours `PORT`, and reuses an existing server. `e2e/full-sweep.spec.ts` accepts
every `window.confirm` and fails on any uncaught page error; fixtures are named
with a per-run `SWEEP-…` tag and cleaned up by the test that made them.

Local login for testing is the seeded `admin@residencehub.com` / `admin123`.

---

## 26. Environment variables

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Local SQLite file |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Production database |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Sessions; `NEXTAUTH_URL` is also the origin baked into reset links |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emailing reset links — both required, or an admin hands them over |
| `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`, `GEMINI_API_KEY` | Cloud AI planner (at least one) |
| `AI_PROVIDER_ORDER`, `*_MODELS`, `AI_LIMIT_*` | Planner routing and caps |
| `CRON_SECRET` | Protecting `/api/cron/*` |
| `AWS_*` | Declared but unused — there is no blob store |
| `AZURE_AD_*` | Declared but unused — the provider isn't wired up |
