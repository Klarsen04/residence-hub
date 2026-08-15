import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Unambiguous alphabet (no O/0/I/1/l) for human-typed authorization codes.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomToken(len: number, alphabet: string): string {
  return Array.from(crypto.randomBytes(len))
    .map((b) => alphabet[b % alphabet.length])
    .join("");
}

/**
 * Seed a bootstrap admin and initial authorization codes.
 *
 * Nothing sensitive is hardcoded: the admin password and the codes come from
 * env vars, and any that are missing are generated randomly and printed ONCE
 * so you can copy them. Never commit real credentials to this file — it lives
 * in a public repo.
 *
 *   SEED_ADMIN_EMAIL      (default: admin@residencehub.com — an email, not a secret)
 *   SEED_ADMIN_PASSWORD   (generated + printed if unset)
 *   SEED_RA_CODE          (generated + printed if unset)
 *   SEED_ADMIN_CODE       (generated + printed if unset)
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@residencehub.com";
  const password = process.env.SEED_ADMIN_PASSWORD || randomToken(20, CODE_ALPHABET);
  const raCode = process.env.SEED_RA_CODE || randomToken(10, CODE_ALPHABET);
  const adminCode = process.env.SEED_ADMIN_CODE || randomToken(10, CODE_ALPHABET);

  const generated: string[] = [];
  if (!process.env.SEED_ADMIN_PASSWORD) generated.push(`  admin password (${email}): ${password}`);
  if (!process.env.SEED_RA_CODE) generated.push(`  RESIDENT_ASSISTANT code: ${raCode}`);
  if (!process.env.SEED_ADMIN_CODE) generated.push(`  ADMIN code: ${adminCode}`);

  const hashedPassword = await bcrypt.hash(password, 12);

  // Never silently reset an existing admin's password on re-seed; only set it
  // on first create.
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "ResLife Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Seeded admin user:", admin.email);

  const codes = await Promise.all([
    prisma.authorizationCode.upsert({
      where: { code: raCode },
      update: {},
      create: { code: raCode, role: "RESIDENT_ASSISTANT" },
    }),
    prisma.authorizationCode.upsert({
      where: { code: adminCode },
      update: {},
      create: { code: adminCode, role: "ADMIN" },
    }),
  ]);

  console.log("Seeded authorization codes:", codes.map((c) => `${c.role}`).join(", "));

  if (generated.length > 0) {
    console.log(
      "\n⚠️  Generated credentials — copy them now, they are not stored anywhere else:\n" +
        generated.join("\n") +
        "\n\nSet SEED_ADMIN_PASSWORD / SEED_RA_CODE / SEED_ADMIN_CODE in your .env to pin them.\n"
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
