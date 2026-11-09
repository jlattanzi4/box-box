import type { PrismaClient } from "@/generated/prisma/client";
import {
  getJolpicaCalendar,
  lookupJolpicaRound,
  type JolpicaCalendarEntry,
} from "@/lib/jolpica";

// Official start times drift by hours. A bigger move is a reschedule (or a bad
// circuit-name match), and changing a pick deadline by days needs a human.
const MAX_AUTO_SHIFT_MS = 24 * 60 * 60 * 1000;

export interface ScheduledRace {
  id: string;
  name: string;
  circuitName: string;
  status: string;
  raceDate: Date;
  pickDeadline: Date;
}

export interface StartTimeChange {
  raceId: string;
  name: string;
  from: Date;
  to: Date;
}

export interface SchedulePlan {
  changes: StartTimeChange[];
  warnings: string[];
}

/**
 * Compares our races with the official calendar and decides what to change.
 * Only races still open for picks move; once a deadline passes, it stays put.
 */
export function planScheduleSync(
  races: ScheduledRace[],
  calendar: JolpicaCalendarEntry[],
  now: Date
): SchedulePlan {
  const changes: StartTimeChange[] = [];
  const warnings: string[] = [];
  const matched = new Set<JolpicaCalendarEntry>();

  for (const race of races) {
    const entry = lookupJolpicaRound(calendar, race);
    if (entry) matched.add(entry);

    const openForPicks = race.status === "upcoming" && race.pickDeadline > now;
    if (!openForPicks) continue;

    if (!entry) {
      warnings.push(`${race.name} is no longer on the official calendar.`);
      continue;
    }
    if (!entry.startsAt || entry.startsAt.getTime() === race.raceDate.getTime()) continue;

    if (Math.abs(entry.startsAt.getTime() - race.raceDate.getTime()) > MAX_AUTO_SHIFT_MS) {
      warnings.push(
        `${race.name} moved from ${race.raceDate.toISOString()} to ${entry.startsAt.toISOString()}; not applied automatically.`
      );
      continue;
    }

    changes.push({ raceId: race.id, name: race.name, from: race.raceDate, to: entry.startsAt });
  }

  for (const entry of calendar) {
    const start = entry.startsAt ?? new Date(`${entry.date}T00:00:00Z`);
    if (!matched.has(entry) && start > now) {
      warnings.push(`${entry.raceName} (${entry.date}) is on the official calendar but not in the database.`);
    }
  }

  return { changes, warnings };
}

/** Pulls the official calendar and moves start times and pick deadlines to match. */
export async function syncSchedule(db: PrismaClient, year: number): Promise<SchedulePlan> {
  const [races, calendar] = await Promise.all([
    db.race.findMany({ where: { seasonYear: year } }),
    getJolpicaCalendar(year),
  ]);
  const plan = planScheduleSync(races, calendar, new Date());

  for (const change of plan.changes) {
    await db.race.update({
      where: { id: change.raceId },
      data: { raceDate: change.to, pickDeadline: change.to },
    });
    console.log(`Schedule: ${change.name} start ${change.from.toISOString()} -> ${change.to.toISOString()}`);
  }
  for (const warning of plan.warnings) console.warn(`Schedule: ${warning}`);

  return plan;
}
