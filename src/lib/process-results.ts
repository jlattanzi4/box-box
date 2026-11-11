import { prisma } from "@/lib/prisma";
import {
  getRaceResults,
  getJolpicaCalendar,
  lookupJolpicaRound,
  type JolpicaCalendarEntry,
} from "@/lib/jolpica";
import { getSessionKeyForRound, getRaceControlEvents } from "@/lib/openf1";
import { tallyRaceControl } from "@/lib/race-control";
import { planRace, scorePicks, type RaceFacts } from "@/lib/results-plan";
import { calculateRaceControlScore } from "@/lib/scoring";
import { sendProcessingAlert } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ProcessOptions {
  /** Only process these race ids (default: every overdue "upcoming" race). */
  raceIds?: string[];
  /** Reprocess even if the race is already marked completed/cancelled. */
  force?: boolean;
  /**
   * Score even if OpenF1 has no race-control data. Race Control picks then
   * score retirements only, which come from the official classification.
   * For a manual run, once it's clear the data isn't coming.
   */
  allowMissingRaceControl?: boolean;
  /** Skip the admin alert email (useful for manual runs). */
  silent?: boolean;
}

export interface ProcessSummary {
  message: string;
  races: string[];
  /** Races left for the next run, each with the reason. */
  waiting: string[];
  autoCancelled: string[];
  stuckRaces: string[];
  errors: string[];
}

const liveSources = { getRaceResults, getSessionKeyForRound, getRaceControlEvents };

/**
 * Asks the calendar, the classification and race control about one race.
 * `sources` are the network calls, passed in so the failure cases can be tested.
 */
export async function gatherFacts(
  race: { seasonYear: number; raceDate: Date; circuitName: string },
  calendar: JolpicaCalendarEntry[] | null,
  label: string,
  sources: typeof liveSources = liveSources
): Promise<RaceFacts> {
  if (calendar === null) return { onCalendar: null, results: [], raceControl: null };

  // Jolpica renumbers rounds after cancellations, so the race is found on the
  // live calendar by date, never by our own round number.
  const entry = lookupJolpicaRound(calendar, race);
  if (!entry) return { onCalendar: false, results: [], raceControl: null };

  const results = await sources.getRaceResults(race.seasonYear, entry.round);
  if (results.length === 0) return { onCalendar: true, results, raceControl: null };

  // The session is matched by date, so a sprint the day before isn't mistaken for the race.
  try {
    const sessionKey = await sources.getSessionKeyForRound(race.seasonYear, race.raceDate);
    if (sessionKey === null) console.warn(`${label}: OpenF1 has no race session for this date`);
    const raceControl = sessionKey === null ? null : await sources.getRaceControlEvents(sessionKey);
    return { onCalendar: true, results, raceControl };
  } catch (e) {
    console.error(`${label}: failed to fetch race control events:`, e);
    return { onCalendar: true, results, raceControl: null };
  }
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
    return { message: "No races to process.", races: [], waiting: [], autoCancelled: [], stuckRaces: [], errors: [] };
  }

  // null marks a calendar that couldn't be fetched, which is not the same as
  // an empty one: only a calendar we actually have can show a race is gone.
  const calendars = new Map<number, JolpicaCalendarEntry[] | null>();
  for (const year of new Set(races.map((r) => r.seasonYear))) {
    try {
      calendars.set(year, await getJolpicaCalendar(year));
    } catch (e) {
      console.error(`Failed to fetch Jolpica calendar for ${year}:`, e);
      calendars.set(year, null);
    }
  }

  const processed: string[] = [];
  const waiting: string[] = [];
  const autoCancelled: string[] = [];
  const errors: string[] = [];
  const stuckRaces: { round: number; name: string; daysOverdue: number }[] = [];
  const cancelledDetails: { round: number; name: string }[] = [];

  for (const race of races) {
    const label = `Round ${race.round}: ${race.name}`;
    try {
      const facts = await gatherFacts(race, calendars.get(race.seasonYear) ?? null, label);
      const action = planRace(race, facts, now, opts);

      if (action.kind === "wait") {
        console.warn(`${label}: ${action.reason}; will retry`);
        waiting.push(`${label}: ${action.reason}`);
        if (action.alert) {
          const daysOverdue = Math.floor((now.getTime() - race.raceDate.getTime()) / DAY_MS);
          stuckRaces.push({ round: race.round, name: race.name, daysOverdue });
        }
        continue;
      }
      if (action.kind === "cancel") {
        await prisma.race.update({ where: { id: race.id }, data: { status: "cancelled" } });
        autoCancelled.push(label);
        cancelledDetails.push({ round: race.round, name: race.name });
        continue;
      }

      // 1. Save race results
      for (const result of action.results) {
        const constructor = await prisma.constructor.findUnique({ where: { jolpicaId: result.Constructor.constructorId } });
        if (!constructor) {
          console.warn(`${label}: unknown constructor ${result.Constructor.constructorId}, skipping ${result.Driver.driverId}`);
          continue;
        }
        // Stand-ins and mid-season swaps: any driver Jolpica classifies gets a
        // row, so constructor totals never silently miss a car.
        const driver = await prisma.driver.upsert({
          where: { jolpicaId: result.Driver.driverId },
          update: {},
          create: {
            jolpicaId: result.Driver.driverId,
            code: result.Driver.code ?? result.Driver.familyName.slice(0, 3).toUpperCase(),
            firstName: result.Driver.givenName,
            lastName: result.Driver.familyName,
            number: parseInt(result.Driver.permanentNumber ?? result.number) || 0,
            constructorId: constructor.id,
          },
        });

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

      // 2. Race control: flags, safety cars and penalties from OpenF1; DNFs
      //    from the official classification.
      const tally = tallyRaceControl(action.raceControl ?? [], action.results);
      const raceControlScore = calculateRaceControlScore(tally);
      await prisma.raceControlEvent.deleteMany({ where: { raceId: race.id } });
      if (tally.details.length > 0) {
        await prisma.raceControlEvent.createMany({
          data: tally.details.map((d) => ({
            raceId: race.id,
            eventType: d.eventType,
            description: d.description,
            source: "api",
          })),
        });
      }

      // 3. Score every pick for this race
      const picks = await prisma.pick.findMany({ where: { raceId: race.id } });
      const results = await prisma.raceResult.findMany({ where: { raceId: race.id } });
      for (const { pickId, userId, leagueId, ...score } of scorePicks(picks, results, raceControlScore)) {
        await prisma.score.upsert({
          where: { pickId },
          update: score,
          create: { pickId, raceId: race.id, userId, leagueId, ...score },
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
    waiting,
    autoCancelled,
    stuckRaces: stuckRaces.map((r) => `Round ${r.round}: ${r.name}`),
    errors,
  };
}
