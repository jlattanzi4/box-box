import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRaceResults, getJolpicaRoundMap, lookupJolpicaRound } from "@/lib/jolpica";
import {
  getSessionKeyForRound,
  getRaceControlEvents,
  parseRaceControlEvents,
} from "@/lib/openf1";
import { calculateRaceControlScore, calculateTotalScore } from "@/lib/scoring";
import { sendProcessingAlert } from "@/lib/email";

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
    const now = new Date();

    // Find races that are past their date but not yet completed or cancelled
    const unscoredRaces = await prisma.race.findMany({
      where: {
        status: "upcoming",
        raceDate: { lt: now },
      },
      orderBy: { round: "asc" },
    });

    if (unscoredRaces.length === 0) {
      return NextResponse.json({ message: "No races to process." });
    }

    // Build a Jolpica round map per season year so we look up results
    // using the API's round numbers (which are renumbered after cancellations),
    // not our DB round numbers which are fixed at seed time.
    const jolpicaRoundMaps = new Map<number, Map<string, number>>();
    const years = [...new Set(unscoredRaces.map((r) => r.seasonYear))];
    for (const year of years) {
      try {
        jolpicaRoundMaps.set(year, await getJolpicaRoundMap(year));
      } catch (e) {
        console.error(`Failed to fetch Jolpica calendar for ${year}:`, e);
        jolpicaRoundMaps.set(year, new Map());
      }
    }

    const processed: string[] = [];
    const autoCancelled: string[] = [];
    const stuckRaces: { round: number; name: string; daysOverdue: number }[] = [];
    const cancelledDetails: { round: number; name: string }[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Races with no API results after 5 days are assumed cancelled
    const STALE_THRESHOLD_MS = 5 * DAY_MS;
    // Races still unscored after 2 days trigger an admin alert
    const ALERT_THRESHOLD_MS = 2 * DAY_MS;

    for (const race of unscoredRaces) {
      try {
        const roundMap = jolpicaRoundMaps.get(race.seasonYear) ?? new Map();

        // Resolve the actual Jolpica round using fuzzy circuit-name matching
        // (normalises hyphens, punctuation, accents, spacing differences).
        // Falls back to the DB round number only if no match is found.
        const resolvedRound = lookupJolpicaRound(roundMap, race.circuitName);
        if (resolvedRound === null) {
          console.warn(
            `Round ${race.round} "${race.name}": no Jolpica circuit match for "${race.circuitName}", falling back to DB round`
          );
        }
        const jolpicaRound = resolvedRound ?? race.round;

        // 1. Fetch race results from Jolpica using the correct round number
        const jolpicaResults = await getRaceResults(race.seasonYear, jolpicaRound);

        if (jolpicaResults.length === 0) {
          // No results yet — auto-cancel if stale, alert if overdue
          const msSinceRace = now.getTime() - new Date(race.raceDate).getTime();
          if (msSinceRace > STALE_THRESHOLD_MS) {
            await prisma.race.update({
              where: { id: race.id },
              data: { status: "cancelled" },
            });
            autoCancelled.push(`Round ${race.round}: ${race.name}`);
            cancelledDetails.push({ round: race.round, name: race.name });
            console.log(`Auto-cancelled stale race: Round ${race.round} ${race.name}`);
          } else if (msSinceRace > ALERT_THRESHOLD_MS) {
            stuckRaces.push({
              round: race.round,
              name: race.name,
              daysOverdue: Math.floor(msSinceRace / DAY_MS),
            });
          }
          continue;
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
        // Match by date proximity (not round index) to handle cancelled races
        // and sprint-race weekends that add extra sessions to the list.
        let raceControlScore = 0;
        try {
          const sessionKey = await getSessionKeyForRound(
            race.seasonYear,
            new Date(race.raceDate)
          );
          if (sessionKey) {
            const rawEvents = await getRaceControlEvents(sessionKey);
            const parsed = parseRaceControlEvents(rawEvents);
            raceControlScore = calculateRaceControlScore(parsed);

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
            const driverResult = await prisma.raceResult.findUnique({
              where: {
                raceId_driverId: { raceId: race.id, driverId: pick.driverId },
              },
            });
            driverPoints = driverResult?.points ?? 0;

            const constructorResults = await prisma.raceResult.findMany({
              where: { raceId: race.id, constructorId: pick.constructorId },
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

    // Alert admins if any race is overdue for scoring or was auto-cancelled.
    if (stuckRaces.length > 0 || cancelledDetails.length > 0) {
      let recipients: string[] = [];
      if (process.env.ADMIN_EMAIL) {
        recipients = process.env.ADMIN_EMAIL.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        // Fall back to the emails of all league admins
        const admins = await prisma.leagueMember.findMany({
          where: { role: "admin" },
          include: { user: { select: { email: true } } },
        });
        recipients = [...new Set(admins.map((a) => a.user.email).filter(Boolean))];
      }

      await sendProcessingAlert({
        to: recipients,
        stuckRaces,
        cancelledRaces: cancelledDetails,
      });
    }

    return NextResponse.json({
      message: `Processed ${processed.length} race(s).`,
      races: processed,
      autoCancelled,
      stuckRaces: stuckRaces.map((r) => `Round ${r.round}: ${r.name}`),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Failed to process results." },
      { status: 500 }
    );
  }
}
