import { prisma } from "@/lib/prisma";
import {
  getRaceResults,
  getJolpicaCalendar,
  lookupJolpicaRound,
  type JolpicaCalendarEntry,
} from "@/lib/jolpica";
import {
  getSessionKeyForRound,
  getRaceControlEvents,
  parseRaceControlEvents,
} from "@/lib/openf1";
import { calculateRaceControlScore, calculateTotalScore } from "@/lib/scoring";
import { sendProcessingAlert } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;
// A race with NO entry on the official calendar and no results after this
// long is assumed cancelled. Races that ARE on the calendar are never
// auto-cancelled — they just keep retrying and alerting.
const STALE_THRESHOLD_MS = 5 * DAY_MS;
// Races still unscored after this long trigger an admin alert.
const ALERT_THRESHOLD_MS = 2 * DAY_MS;

export interface ProcessOptions {
  /** Only process these race ids (default: every overdue "upcoming" race). */
  raceIds?: string[];
  /** Reprocess even if the race is already marked completed/cancelled. */
  force?: boolean;
  /** Skip the admin alert email (useful for manual runs). */
  silent?: boolean;
}

export interface ProcessSummary {
  message: string;
  races: string[];
  autoCancelled: string[];
  stuckRaces: string[];
  errors: string[];
}

export async function processResults(opts: ProcessOptions = {}): Promise<ProcessSummary> {
  const now = new Date();

  const races = await prisma.race.findMany({
    where: opts.raceIds
      ? { id: { in: opts.raceIds }, ...(opts.force ? {} : { status: "upcoming" }) }
      : { status: "upcoming", raceDate: { lt: now } },
    orderBy: { round: "asc" },
  });

  if (races.length === 0) {
    return { message: "No races to process.", races: [], autoCancelled: [], stuckRaces: [], errors: [] };
  }

  // Jolpica renumbers rounds after cancellations, so resolve each of our races
  // against the live calendar (by date) rather than trusting our round number.
  const calendars = new Map<number, JolpicaCalendarEntry[]>();
  for (const year of new Set(races.map((r) => r.seasonYear))) {
    try {
      calendars.set(year, await getJolpicaCalendar(year));
    } catch (e) {
      console.error(`Failed to fetch Jolpica calendar for ${year}:`, e);
      calendars.set(year, []);
    }
  }

  const processed: string[] = [];
  const autoCancelled: string[] = [];
  const errors: string[] = [];
  const stuckRaces: { round: number; name: string; daysOverdue: number }[] = [];
  const cancelledDetails: { round: number; name: string }[] = [];

  for (const race of races) {
    const label = `Round ${race.round}: ${race.name}`;
    try {
      const entry = lookupJolpicaRound(calendars.get(race.seasonYear) ?? [], race);
      const msSinceRace = now.getTime() - race.raceDate.getTime();

      if (!entry) {
        console.warn(`${label}: no matching race on the Jolpica calendar`);
        if (msSinceRace > STALE_THRESHOLD_MS && !opts.force) {
          await prisma.race.update({ where: { id: race.id }, data: { status: "cancelled" } });
          autoCancelled.push(label);
          cancelledDetails.push({ round: race.round, name: race.name });
        } else if (msSinceRace > ALERT_THRESHOLD_MS) {
          stuckRaces.push({ round: race.round, name: race.name, daysOverdue: Math.floor(msSinceRace / DAY_MS) });
        }
        continue;
      }

      const jolpicaResults = await getRaceResults(race.seasonYear, entry.round);
      if (jolpicaResults.length === 0) {
        // On the calendar but not yet published — never cancel, just wait/alert.
        if (msSinceRace > ALERT_THRESHOLD_MS) {
          stuckRaces.push({ round: race.round, name: race.name, daysOverdue: Math.floor(msSinceRace / DAY_MS) });
        }
        continue;
      }

      // 1. Save race results
      for (const result of jolpicaResults) {
        const driver = await prisma.driver.findUnique({ where: { jolpicaId: result.Driver.driverId } });
        const constructor = await prisma.constructor.findUnique({ where: { jolpicaId: result.Constructor.constructorId } });
        if (!driver || !constructor) continue;

        const data = {
          constructorId: constructor.id,
          position: result.positionText === "R" ? null : parseInt(result.position),
          points: parseFloat(result.points),
          status: result.status,
          fastestLap: result.FastestLap?.rank === "1",
        };
        await prisma.raceResult.upsert({
          where: { raceId_driverId: { raceId: race.id, driverId: driver.id } },
          update: data,
          create: { raceId: race.id, driverId: driver.id, ...data },
        });
      }

      // 2. Race control events from OpenF1 (matched by date, tolerant of sprints)
      let raceControlScore = 0;
      try {
        const sessionKey = await getSessionKeyForRound(race.seasonYear, race.raceDate);
        if (sessionKey) {
          const parsed = parseRaceControlEvents(await getRaceControlEvents(sessionKey));
          raceControlScore = calculateRaceControlScore(parsed);
          await prisma.raceControlEvent.deleteMany({ where: { raceId: race.id } });
          if (parsed.details.length > 0) {
            await prisma.raceControlEvent.createMany({
              data: parsed.details.map((d) => ({
                raceId: race.id,
                eventType: d.eventType,
                description: d.description,
                source: "api",
              })),
            });
          }
        }
      } catch (e) {
        console.error(`${label}: failed to fetch race control events:`, e);
      }

      // 3. Score every pick for this race
      const picks = await prisma.pick.findMany({ where: { raceId: race.id } });
      const results = await prisma.raceResult.findMany({ where: { raceId: race.id } });

      for (const pick of picks) {
        let driverPoints = 0;
        let constructorPoints = 0;
        if (pick.pickType === "driver_constructor") {
          driverPoints = results.find((r) => r.driverId === pick.driverId)?.points ?? 0;
          constructorPoints = results
            .filter((r) => r.constructorId === pick.constructorId)
            .reduce((sum, r) => sum + r.points, 0);
        }
        const score = calculateTotalScore(pick.pickType, driverPoints, constructorPoints, raceControlScore);
        await prisma.score.upsert({
          where: { pickId: pick.id },
          update: score,
          create: { pickId: pick.id, raceId: race.id, userId: pick.userId, leagueId: pick.leagueId, ...score },
        });
      }

      // 4. Mark race as completed
      await prisma.race.update({ where: { id: race.id }, data: { status: "completed" } });
      processed.push(label);
    } catch (e) {
      console.error(`Failed to process ${label}:`, e);
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!opts.silent && (stuckRaces.length > 0 || cancelledDetails.length > 0)) {
    let recipients: string[] = [];
    if (process.env.ADMIN_EMAIL) {
      recipients = process.env.ADMIN_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      const admins = await prisma.leagueMember.findMany({
        where: { role: "admin" },
        include: { user: { select: { email: true } } },
      });
      recipients = [...new Set(admins.map((a) => a.user.email).filter(Boolean))];
    }
    await sendProcessingAlert({ to: recipients, stuckRaces, cancelledRaces: cancelledDetails });
  }

  return {
    message: `Processed ${processed.length} race(s).`,
    races: processed,
    autoCancelled,
    stuckRaces: stuckRaces.map((r) => `Round ${r.round}: ${r.name}`),
    errors,
  };
}
