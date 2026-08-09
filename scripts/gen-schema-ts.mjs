// Regenerate src/lib/turso-schema-sql.ts from prisma/schema.sql so the schema
// SQL is bundled into the serverless build (readable at runtime without disk
// access). Run after regenerating prisma/schema.sql.
import { readFileSync, writeFileSync } from "node:fs";

const sql = readFileSync("prisma/schema.sql", "utf8");
const out =
  "// AUTO-GENERATED from prisma/schema.sql — do not edit by hand.\n" +
  "// Regenerate: node scripts/gen-schema-ts.mjs\n" +
  "export const SCHEMA_SQL = " +
  JSON.stringify(sql) +
  ";\n";
writeFileSync("src/lib/turso-schema-sql.ts", out);
console.log(`wrote src/lib/turso-schema-sql.ts (${sql.length} chars)`);
