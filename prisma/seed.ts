import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@residencehub.com" },
    update: {},
    create: {
      email: "admin@residencehub.com",
      name: "ResLife Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Created admin user:", admin.email);

  const codes = await Promise.all([
    prisma.authorizationCode.create({
      data: { code: "RA2026FALL", role: "RESIDENT_ASSISTANT" },
    }),
    prisma.authorizationCode.create({
      data: { code: "RHA2026FALL", role: "RHA_MEMBER" },
    }),
    prisma.authorizationCode.create({
      data: { code: "ADMIN2026", role: "ADMIN" },
    }),
  ]);

  console.log("Created authorization codes:", codes.map((c) => `${c.code} (${c.role})`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
