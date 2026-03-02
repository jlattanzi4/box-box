import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRaceResults } from "@/lib/jolpica";
import {
  getSessionKeyForRound,
  getRaceControlEvents,
  parseRaceControlEvents,
} from "@/lib/openf1";
import { calculateRaceControlScore, calculateTotalScore } from "@/lib/scoring";

export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return processResults();
}

// Also support POST for manual admin triggers
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return processResults();
}

async function processResults() {
  try {
    // Find races that are past their date but not yet completed
    const unscoredRaces = await prisma.race.findMany({
      where: {
        status: "upcoming",
        raceDate: { lt: new Date() },
      },
      orderBy: { round: "asc" },
    });

    if (unscoredRaces.length === 0) {
      return NextResponse.json({ message: "No races to process." });
    }

    const processed: string[] = [];

    for (const race of unscoredRaces) {
      try {
        // 1. Fetch race results from Jolpica
        const jolpicaResults = await getRaceResults(race.seasonYear, race.round);
        if (jolpicaResults.length === 0) {
          continue; // Results not available yet
        }

        // 2. Save race results
        for (const result of jolpicaResults) {
          const driver = await prisma.driver.findUnique({
            where: { jolpicaId: result.Driver.driverId },
          });
          const constructor = await prisma.constructor.findUnique({
            where: { jolpicaId: result.Constructor.constructorId },
          });

          if (!driver || !constructor) continue;

          await prisma.raceResult.upsert({
            where: {
              raceId_driverId: { raceId: race.id, driverId: driver.id },
            },
            update: {
              position: result.positionText === "R" ? null : parseInt(result.position),
              points: parseFloat(result.points),
              status: result.status,
              fastestLap: result.FastestLap?.rank === "1",
              constructorId: constructor.id,
            },
            create: {
              raceId: race.id,
              driverId: driver.id,
              constructorId: constructor.id,
              position: result.positionText === "R" ? null : parseInt(result.position),
              points: parseFloat(result.points),
              status: result.status,
              fastestLap: result.FastestLap?.rank === "1",
            },
          });
        }

        // 3. Fetch and save race control events from OpenF1
        let raceControlScore = 0;
        try {
          const sessionKey = await getSessionKeyForRound(
            race.seasonYear,
            race.round
          );
          if (sessionKey) {
            const rawEvents = await getRaceControlEvents(sessionKey);
            const parsed = parseRaceControlEvents(rawEvents);
            raceControlScore = calculateRaceControlScore(parsed);

            // Save individual events
            // First, clear old events for this race
            await prisma.raceControlEvent.deleteMany({
              where: { raceId: race.id },
            });

            for (const detail of parsed.details) {
              await prisma.raceControlEvent.create({
                data: {
                  raceId: race.id,
                  eventType: detail.eventType,
                  description: detail.description,
                  source: "api",
                },
              });
            }
          }
        } catch (e) {
          console.error(`Failed to fetch race control events for round ${race.round}:`, e);
          // Continue scoring without race control events
        }

        // 4. Score all picks for this race
        const picks = await prisma.pick.findMany({
          where: { raceId: race.id },
          include: { driver: true, constructor: true },
        });

        for (const pick of picks) {
          let driverPoints = 0;
          let constructorPoints = 0;

          if (pick.pickType === "driver_constructor" && pick.driverId && pick.constructorId) {
            // Get driver's points
            const driverResult = await prisma.raceResult.findUnique({
              where: {
                raceId_driverId: { raceId: race.id, driverId: pick.driverId },
              },
            });
            driverPoints = driverResult?.points ?? 0;

            // Get constructor's combined points (both drivers)
            const constructorResults = await prisma.raceResult.findMany({
              where: {
                raceId: race.id,
                constructorId: pick.constructorId,
              },
            });
            constructorPoints = constructorResults.reduce(
              (sum, r) => sum + r.points,
              0
            );
          }

          const score = calculateTotalScore(
            pick.pickType,
            driverPoints,
            constructorPoints,
            raceControlScore
          );

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
              raceId: race.id,
              userId: pick.userId,
              leagueId: pick.leagueId,
              driverPoints: score.driverPoints,
              constructorPoints: score.constructorPoints,
              raceControlPoints: score.raceControlPoints,
              totalPoints: score.totalPoints,
            },
          });
        }

        // 5. Mark race as completed
        await prisma.race.update({
          where: { id: race.id },
          data: { status: "completed" },
        });

        processed.push(`Round ${race.round}: ${race.name}`);
      } catch (e) {
        console.error(`Failed to process round ${race.round}:`, e);
      }
    }

    return NextResponse.json({
      message: `Processed ${processed.length} race(s).`,
      races: processed,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Failed to process results." },
      { status: 500 }
    );
  }
}
