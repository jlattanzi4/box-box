import type { JolpicaResult } from "@/lib/jolpica";
import type { OpenF1RaceControl } from "@/lib/openf1";
import { calculateTotalScore } from "@/lib/scoring";

const DAY_MS = 24 * 60 * 60 * 1000;
// A race that is NOT on the official calendar and has no results after this
// long is assumed cancelled.
export const STALE_THRESHOLD_MS = 5 * DAY_MS;
// A race still unscored after this long triggers an admin alert.
export const ALERT_THRESHOLD_MS = 2 * DAY_MS;

/**
 * What the outside world told us about one overdue race. The three sources
 * fail in different ways, and the plan depends on telling those apart:
 * "the calendar doesn't list this race" is a reason to cancel it, while "the
 * calendar couldn't be fetched" is a reason to try again tomorrow.
 */
export interface RaceFacts {
  /** Is the race on the official calendar? null when the calendar couldn't be fetched. */
  onCalendar: boolean | null;
  /** The official classification; empty until it's published. */
  results: JolpicaResult[];
  /** Race-control messages; null when OpenF1 failed or has no session for this race. */
  raceControl: OpenF1RaceControl[] | null;
}

export interface PlanOptions {
  /** A manual run: never cancel a race. */
  force?: boolean;
  /** A manual run: score without race-control data, with Race Control picks scoring 0. */
  allowMissingRaceControl?: boolean;
}

export type RaceAction =
  /** Leave the race as it is and try again on the next run. */
  | { kind: "wait"; reason: string; alert: boolean }
  | { kind: "cancel" }
  | { kind: "score"; results: JolpicaResult[]; raceControl: OpenF1RaceControl[] | null };

/**
 * Decides what to do with one overdue race.
 *
 * A race is scored only when everything needed to score every kind of pick is
 * in hand: marking it completed without race-control data would leave Race
 * Control picks on zero for good. And a race is cancelled only on positive
 * evidence (the calendar was fetched and doesn't list it), never because a
 * request failed.
 */
export function planRace(
  race: { raceDate: Date },
  facts: RaceFacts,
  now: Date,
  opts: PlanOptions = {}
): RaceAction {
  const overdueMs = now.getTime() - race.raceDate.getTime();
  const wait = (reason: string): RaceAction => ({ kind: "wait", reason, alert: overdueMs > ALERT_THRESHOLD_MS });

  if (facts.onCalendar === null) return wait("the official calendar couldn't be fetched");
  if (!facts.onCalendar) {
    if (overdueMs > STALE_THRESHOLD_MS && !opts.force) return { kind: "cancel" };
    return wait("the race isn't on the official calendar");
  }
  if (facts.results.length === 0) return wait("results aren't published yet");
  if (facts.raceControl === null && !opts.allowMissingRaceControl) {
    return wait("race-control data isn't available");
  }
  return { kind: "score", results: facts.results, raceControl: facts.raceControl };
}

export interface PickToScore {
  id: string;
  userId: string;
  leagueId: string;
  pickType: string;
  driverId: string | null;
  constructorId: string | null;
}

export interface ResultRow {
  driverId: string;
  constructorId: string;
  points: number;
}

/** One score per pick: the driver's points plus both of the constructor's cars, or the race-control total. */
export function scorePicks(picks: PickToScore[], results: ResultRow[], raceControlScore: number) {
  return picks.map((pick) => {
    let driverPoints = 0;
    let constructorPoints = 0;
    if (pick.pickType === "driver_constructor") {
      driverPoints = results.find((r) => r.driverId === pick.driverId)?.points ?? 0;
      constructorPoints = results
        .filter((r) => r.constructorId === pick.constructorId)
        .reduce((sum, r) => sum + r.points, 0);
    }
    return {
      pickId: pick.id,
      userId: pick.userId,
      leagueId: pick.leagueId,
      ...calculateTotalScore(pick.pickType, driverPoints, constructorPoints, raceControlScore),
    };
  });
}
