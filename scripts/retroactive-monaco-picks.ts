import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { calculateTotalScore } from "../src/lib/scoring";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// IDs resolved from the DB
const MONACO_RACE_ID = "cmm9j9gr600140i8o9gk74h7d";

const LEAGUE = {
  smoothOperator: "cmm9p88t4000004l4jzykv7bf",
  weAreChecking: "cmm9lgzgf000104ju58jzr026",
};
const USER = {
  joseph: "cmm9lfbhb000004jugozcwfyg",
  mackenzie: "cmm9pl2lf000004l7zwnuo98b",
  max: "cmm9lsewy000004k1s61f6xa9",
  thomas: "cmm9xqyxy000004lab7h5vwqg",
};
const DRIVER = {
  HAM: "cmm9i59kk000ch08okkvkngg9",
  VER: "cmm9i59lo000eh08or8wfc4wt",
  ANT: "cmm9i59np000hh08orblf1km2",
};
const CONSTRUCTOR = {
  ferrari: "cmm9i59dd0001h08ovx0s9gzj",
  mclaren: "cmm9i598e0000h08osq3pfq24",
};

// Per the user: each player in their own league; Joseph in both.
const picks = [
  { label: "Joseph (Smooth Operator)", leagueId: LEAGUE.smoothOperator, userId: USER.joseph, driverId: DRIVER.HAM, constructorId: CONSTRUCTOR.ferrari },
  { label: "Thomas (Smooth Operator)", leagueId: LEAGUE.smoothOperator, userId: USER.thomas, driverId: DRIVER.VER, constructorId: CONSTRUCTOR.mclaren },
  { label: "Mackenzie (Smooth Operator)", leagueId: LEAGUE.smoothOperator, userId: USER.mackenzie, driverId: DRIVER.ANT, constructorId: CONSTRUCTOR.ferrari },
  { label: "Joseph (We Are Checking)", leagueId: LEAGUE.weAreChecking, userId: USER.joseph, driverId: DRIVER.HAM, constructorId: CONSTRUCTOR.ferrari },
  { label: "Max (We Are Checking)", leagueId: LEAGUE.weAreChecking, userId: USER.max, driverId: DRIVER.VER, constructorId: CONSTRUCTOR.ferrari },
];

async function main() {
  for (const p of picks) {
    // 1. Upsert the pick
    const pick = await prisma.pick.upsert({
      where: {
        leagueId_userId_raceId: {
          leagueId: p.leagueId,
          userId: p.userId,
          raceId: MONACO_RACE_ID,
        },
      },
      update: {
        pickType: "driver_constructor",
        driverId: p.driverId,
        constructorId: p.constructorId,
      },
      create: {
        leagueId: p.leagueId,
        userId: p.userId,
        raceId: MONACO_RACE_ID,
        pickType: "driver_constructor",
        driverId: p.driverId,
        constructorId: p.constructorId,
      },
    });

    // 2. Score it from existing Monaco RaceResult data
    const driverResult = await prisma.raceResult.findUnique({
      where: { raceId_driverId: { raceId: MONACO_RACE_ID, driverId: p.driverId } },
    });
    const driverPoints = driverResult?.points ?? 0;

    const constructorResults = await prisma.raceResult.findMany({
      where: { raceId: MONACO_RACE_ID, constructorId: p.constructorId },
    });
    const constructorPoints = constructorResults.reduce((sum, r) => sum + r.points, 0);

    const score = calculateTotalScore("driver_constructor", driverPoints, constructorPoints, 0);

    await prisma.score.upsert({
      where: { pickId: pick.id },
      update: {
        driverPoints: score.driverPoints,
        constructorPoints: score.constructorPoints,
        raceControlPoints: score.raceControlPoints,
        totalPoints: score.totalPoints,
      },
      create: {
        pickId: pick.id,
        raceId: MONACO_RACE_ID,
        userId: p.userId,
        leagueId: p.leagueId,
        driverPoints: score.driverPoints,
        constructorPoints: score.constructorPoints,
        raceControlPoints: score.raceControlPoints,
        totalPoints: score.totalPoints,
      },
    });

    console.log(
      `${p.label}: driver ${driverPoints} + constructor ${constructorPoints} = ${score.totalPoints} pts`
    );
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
