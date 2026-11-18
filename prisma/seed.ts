import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function upsertPengelola(username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: Role.PENGELOLA,
      isActive: true,
    },
    create: {
      username,
      passwordHash,
      role: Role.PENGELOLA,
      isActive: true,
    },
  });
}

async function main() {
  const admin1Username = requireEnv("SEED_ADMIN1_USERNAME");
  const admin1Password = requireEnv("SEED_ADMIN1_PASSWORD");
  const admin2Username = requireEnv("SEED_ADMIN2_USERNAME");
  const admin2Password = requireEnv("SEED_ADMIN2_PASSWORD");

  if (admin1Username === admin2Username) {
    throw new Error("SEED_ADMIN1_USERNAME and SEED_ADMIN2_USERNAME must be different");
  }

  await upsertPengelola(admin1Username, admin1Password);
  await upsertPengelola(admin2Username, admin2Password);

  console.log(`Seeded PENGELOLA accounts: ${admin1Username}, ${admin2Username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
