import { describe, expect, it } from "vitest";
import type { JolpicaResult } from "@/lib/jolpica";
import { planRace, scorePicks, type RaceFacts } from "@/lib/results-plan";

const RACE = { raceDate: new Date("2026-11-08T17:00:00Z") };
const daysLater = (days: number) => new Date(RACE.raceDate.getTime() + days * 24 * 60 * 60 * 1000);
const RESULTS = [{ position: "1" }] as unknown as JolpicaResult[];

const facts = (over: Partial<RaceFacts> = {}): RaceFacts => ({
  onCalendar: true,
  results: RESULTS,
  raceControl: [],
  ...over,
});

describe("planRace", () => {
  it("scores a race once results and race-control data are both in", () => {
    expect(planRace(RACE, facts(), daysLater(1))).toEqual({ kind: "score", results: RESULTS, raceControl: [] });
  });

  it("never cancels a race because the calendar couldn't be fetched", () => {
    // Ten days overdue: well past the point where a race missing from the calendar is cancelled.
    const action = planRace(RACE, facts({ onCalendar: null, results: [] }), daysLater(10));
    expect(action).toEqual({ kind: "wait", reason: "the official calendar couldn't be fetched", alert: true });
  });

  it("cancels a race the calendar no longer lists, after five days", () => {
    const missing = facts({ onCalendar: false, results: [] });
    expect(planRace(RACE, missing, daysLater(6))).toEqual({ kind: "cancel" });
    expect(planRace(RACE, missing, daysLater(4))).toMatchObject({ kind: "wait", alert: true });
    expect(planRace(RACE, missing, daysLater(1))).toMatchObject({ kind: "wait", alert: false });
  });

  it("does not cancel on a manual run", () => {
    const action = planRace(RACE, facts({ onCalendar: false, results: [] }), daysLater(6), { force: true });
    expect(action.kind).toBe("wait");
  });

  it("waits for results however long they take, and alerts after two days", () => {
    const unpublished = facts({ results: [] });
    expect(planRace(RACE, unpublished, daysLater(1))).toEqual({
      kind: "wait",
      reason: "results aren't published yet",
      alert: false,
    });
    expect(planRace(RACE, unpublished, daysLater(30))).toMatchObject({ kind: "wait", alert: true });
  });

  it("does not complete a race without race-control data", () => {
    // Completing it would leave every Race Control pick on zero, with no retry.
    const action = planRace(RACE, facts({ raceControl: null }), daysLater(1));
    expect(action).toEqual({ kind: "wait", reason: "race-control data isn't available", alert: false });
  });

  it("treats a quiet race (no messages) as data, not as a failure", () => {
    expect(planRace(RACE, facts({ raceControl: [] }), daysLater(1)).kind).toBe("score");
  });

  it("can be told to score without race-control data on a manual run", () => {
    const action = planRace(RACE, facts({ raceControl: null }), daysLater(9), { allowMissingRaceControl: true });
    expect(action).toEqual({ kind: "score", results: RESULTS, raceControl: null });
  });
});

describe("scorePicks", () => {
  const results = [
    { driverId: "nor", constructorId: "mclaren", points: 18 },
    { driverId: "pia", constructorId: "mclaren", points: 10 },
    { driverId: "ver", constructorId: "red_bull", points: 25 },
    { driverId: "tsu", constructorId: "red_bull", points: 0 },
  ];
  const pick = (id: string, pickType: string, driverId: string | null, constructorId: string | null) => ({
    id,
    userId: `user-${id}`,
    leagueId: "league",
    pickType,
    driverId,
    constructorId,
  });

  it("gives a driver their own points and a constructor both of its cars", () => {
    const [score] = scorePicks([pick("a", "driver_constructor", "ver", "mclaren")], results, 40);
    expect(score).toEqual({
      pickId: "a",
      userId: "user-a",
      leagueId: "league",
      driverPoints: 25,
      constructorPoints: 28,
      raceControlPoints: 0,
      totalPoints: 53,
    });
  });

  it("gives a Race Control pick the race-control total and nothing else", () => {
    const [score] = scorePicks([pick("b", "race_control", null, null)], results, 40);
    expect(score).toMatchObject({ driverPoints: 0, constructorPoints: 0, raceControlPoints: 40, totalPoints: 40 });
  });

  it("scores zero for a driver who isn't in the classification", () => {
    const [score] = scorePicks([pick("c", "driver_constructor", "bot", "red_bull")], results, 0);
    expect(score).toMatchObject({ driverPoints: 0, constructorPoints: 25, totalPoints: 25 });
  });
});
