// Push the Prisma schema to Turso at build time.
//
// Why this exists: `prisma db push` targets DATABASE_URL, which is a local
// SQLite file during the Vercel build — it never reaches Turso. The app connects
// to Turso at runtime via the libSQL adapter, so tables/columns added after the
// initial setup were missing there → "Failed to load".
//
// This reads a COMMITTED schema.sql (generated locally with `prisma migrate
// diff`, which needs the schema-engine binary that isn't reliable on Vercel) and
// applies it to Turso idempotently:
//   1. CREATE TABLE IF NOT EXISTS for every table.
//   2. For tables that already existed in an older shape, ALTER TABLE ADD COLUMN
//      any columns the live DB is missing (CREATE IF NOT EXISTS can't do this).
// No-ops when TURSO_* env vars are absent (local/dev build).

import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// When run manually (node scripts/sync-turso.mjs) there's no framework to load
// .env, so pull TURSO_* from .env.local / .env ourselves. Existing (non-empty)
// process.env values always win; empty values never clobber.
function loadEnvFile(name) {
  const path = join(dirname(fileURLToPath(import.meta.url)), "..", name);
  let text;
  try { text = readFileSync(path, "utf8"); } catch { return; }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    if (val && !process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.log("[sync-turso] No Turso env vars — skipping (local/dev build).");
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const rawSql = readFileSync(join(here, "..", "prisma", "schema.sql"), "utf8");

// Strip comment lines, then split into statements.
const clean = rawSql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

const statements = clean
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && !/^PRAGMA/i.test(s));

const client = createClient({ url, authToken });

// ── Pass 1: create tables (idempotent) ────────────────────────────────────
let created = 0;
let existed = 0;
for (const stmt of statements) {
  const idempotent = stmt
    .replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ")
    .replace(/^CREATE UNIQUE INDEX /i, "CREATE UNIQUE INDEX IF NOT EXISTS ")
    .replace(/^CREATE INDEX /i, "CREATE INDEX IF NOT EXISTS ");
  try {
    await client.execute(idempotent);
    created++;
  } catch (err) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) existed++;
    else {
      console.error("[sync-turso] Statement failed:\n", idempotent, "\n", err);
      throw err;
    }
  }
}

// ── Pass 2: reconcile columns on pre-existing tables ───────────────────────
// Parse each CREATE TABLE's column definitions from schema.sql, compare against
// the live table via PRAGMA table_info, and ADD COLUMN for any that are missing.
let addedCols = 0;
const tableBlocks = [...clean.matchAll(/CREATE TABLE "(\w+)"\s*\(([\s\S]*?)\n\);/g)];

for (const [, table, body] of tableBlocks) {
  // Column defs are the lines that start with a quoted identifier.
  const colDefs = body
    .split("\n")
    .map((l) => l.trim().replace(/,$/, ""))
    .filter((l) => /^"[\w]+"/.test(l) && !/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE)\b/i.test(l));

  let live;
  try {
    live = await client.execute(`PRAGMA table_info("${table}")`);
  } catch {
    continue; // table doesn't exist yet (created fresh in pass 1) — nothing to reconcile
  }
  const liveCols = new Set(live.rows.map((r) => String(r.name)));

  for (const def of colDefs) {
    const name = def.match(/^"([\w]+)"/)?.[1];
    if (!name || liveCols.has(name)) continue;
    // SQLite can't ADD a NOT NULL column without a default; relax to nullable.
    const addable = def.replace(/\bNOT NULL\b/i, "").replace(/\s+/g, " ").trim();
    try {
      await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${addable}`);
      addedCols++;
      console.log(`[sync-turso] + ${table}.${name}`);
    } catch (err) {
      const msg = String(err?.message || err).toLowerCase();
      if (!msg.includes("duplicate")) {
        console.error(`[sync-turso] Could not add ${table}.${name}:`, msg);
      }
    }
  }
}

console.log(`[sync-turso] Done. Tables: ${created} ok / ${existed} existed. Columns added: ${addedCols}.`);
