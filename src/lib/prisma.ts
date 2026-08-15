import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Prisma 6: driver adapters are GA. The libSQL adapter takes the connection
  // config directly (no separate createClient()); without Turso env we fall
  // back to the datasource URL (local SQLite file).
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken,
    });
    return new PrismaClient({ adapter });
  }

  // Exactly one of the two Turso vars set: almost certainly a misconfigured
  // deployment. Silently falling back to the local SQLite file would look like
  // it works while writing to an ephemeral database (data loss on Vercel).
  if (tursoUrl || tursoToken) {
    const msg =
      `Partial Turso config: ${tursoUrl ? "TURSO_DATABASE_URL" : "TURSO_AUTH_TOKEN"} is set ` +
      `but ${tursoUrl ? "TURSO_AUTH_TOKEN" : "TURSO_DATABASE_URL"} is missing. ` +
      "Set both to use Turso, or unset both to use the local SQLite file.";
    console.error(msg);
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
