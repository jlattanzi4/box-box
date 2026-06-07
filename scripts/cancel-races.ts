import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Rounds that were cancelled and need to be excluded from "next race" logic
const CANCELLED_ROUNDS = [4, 5]; // Bahrain GP, Saudi Arabian GP

async function main() {
  for (const round of CANCELLED_ROUNDS) {
    const race = await prisma.race.findUnique({
      where: { seasonYear_round: { seasonYear: 2026, round } },
    });
    if (!race) {
      console.log(`Round ${round}: not found`);
      continue;
    }
    await prisma.race.update({
      where: { id: race.id },
      data: { status: "cancelled" },
    });
    console.log(`Round ${round}: ${race.name} → cancelled`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
