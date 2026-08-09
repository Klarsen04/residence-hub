// Push the Prisma schema to Turso at build time.
//
// Why this exists: `prisma db push` targets DATABASE_URL, which is a local
// SQLite file during the Vercel build — it never reaches Turso. So the app,
// which connects to Turso at runtime via the libSQL adapter, was missing every
// table added after the initial setup (Resident, Note, Incident, CheckIn,
// AIUsage, …) → "Failed to load" on those pages.
//
// This script generates CREATE-TABLE SQL from the schema and applies it to
// Turso idempotently. It runs in the build BEFORE `next build`. If Turso env
// vars aren't set (e.g. local dev), it no-ops so local builds still work.

import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.log("[sync-turso] No Turso env vars — skipping (local/dev build).");
  process.exit(0);
}

// 1. Generate full schema SQL from the Prisma datamodel.
const dir = mkdtempSync(join(tmpdir(), "turso-"));
const sqlPath = join(dir, "schema.sql");
execSync(
  `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "${sqlPath}"`,
  {
    stdio: ["ignore", "ignore", "inherit"],
    // `migrate diff` requires DATABASE_URL to resolve the datasource, even
    // though --from-empty/--to-schema-datamodel never connect to it. In the
    // Vercel build only TURSO_* is set, so provide a dummy local URL.
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "file:./build.db" },
  }
);
let sql = readFileSync(sqlPath, "utf8");

// 2. Make it idempotent so it's safe to run on every deploy: only CREATE
// statements (never DROP), and skip anything that already exists.
sql = sql
  .replace(/CREATE TABLE /g, "CREATE TABLE IF NOT EXISTS ")
  .replace(/CREATE UNIQUE INDEX /g, "CREATE UNIQUE INDEX IF NOT EXISTS ")
  .replace(/CREATE INDEX /g, "CREATE INDEX IF NOT EXISTS ");

// Strip `-- CreateTable` comment lines BEFORE splitting: each statement is
// preceded by a comment line, and splitting first would leave the comment
// attached to the statement and cause it to be filtered out wholesale.
const statements = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && !/^PRAGMA/i.test(s));

// 3. Apply to Turso. Run statements individually and tolerate
// already-exists / duplicate-column races so a partial prior sync self-heals.
const client = createClient({ url, authToken });
let applied = 0;
let skipped = 0;
for (const stmt of statements) {
  try {
    await client.execute(stmt);
    applied++;
  } catch (err) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      skipped++;
    } else {
      console.error("[sync-turso] Statement failed:\n", stmt, "\n", err);
      throw err;
    }
  }
}
console.log(`[sync-turso] Done. Applied ${applied}, skipped ${skipped} existing.`);
