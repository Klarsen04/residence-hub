import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@libsql/client";
import { SCHEMA_SQL } from "@/lib/turso-schema-sql";

export const dynamic = "force-dynamic";

// Runtime schema repair. The build-time Turso sync can silently fail on Vercel,
// leaving newer tables/columns missing → "Failed to load". This applies the
// schema through the SAME libSQL connection the app uses at runtime (which
// provably works — events load), so it doesn't depend on the build at all.
// Admin-only. Idempotent: CREATE IF NOT EXISTS + ADD COLUMN for missing columns.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    return NextResponse.json({ error: "Turso env vars not set" }, { status: 500 });
  }

  const client = createClient({ url, authToken });

  const clean = SCHEMA_SQL.split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const statements = clean
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !/^PRAGMA/i.test(s));

  const log: string[] = [];
  let tables = 0;

  // Pass 1: create tables/indexes (idempotent).
  for (const stmt of statements) {
    const idem = stmt
      .replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ")
      .replace(/^CREATE UNIQUE INDEX /i, "CREATE UNIQUE INDEX IF NOT EXISTS ")
      .replace(/^CREATE INDEX /i, "CREATE INDEX IF NOT EXISTS ");
    try {
      await client.execute(idem);
      tables++;
    } catch (err) {
      const msg = String((err as Error)?.message || err).toLowerCase();
      if (!msg.includes("already exists") && !msg.includes("duplicate")) {
        log.push(`table failed: ${msg}`);
      }
    }
  }

  // Pass 2: add missing columns to pre-existing tables.
  let addedCols = 0;
  const blocks = [...clean.matchAll(/CREATE TABLE "(\w+)"\s*\(([\s\S]*?)\n\);/g)];
  for (const [, table, body] of blocks) {
    const colDefs = body
      .split("\n")
      .map((l) => l.trim().replace(/,$/, ""))
      .filter((l) => /^"[\w]+"/.test(l) && !/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE)\b/i.test(l));
    let live;
    try {
      live = await client.execute(`PRAGMA table_info("${table}")`);
    } catch {
      continue;
    }
    const liveCols = new Set(live.rows.map((r) => String(r.name)));
    for (const def of colDefs) {
      const name = def.match(/^"([\w]+)"/)?.[1];
      if (!name || liveCols.has(name)) continue;
      const addable = def.replace(/\bNOT NULL\b/i, "").replace(/\s+/g, " ").trim();
      try {
        await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${addable}`);
        addedCols++;
        log.push(`+ ${table}.${name}`);
      } catch (err) {
        const msg = String((err as Error)?.message || err).toLowerCase();
        if (!msg.includes("duplicate")) log.push(`col ${table}.${name} failed: ${msg}`);
      }
    }
  }

  return NextResponse.json({ ok: true, tables, columnsAdded: addedCols, log });
}
