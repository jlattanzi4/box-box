import { describe, expect, it } from "vitest";
import type { JolpicaCalendarEntry } from "@/lib/jolpica";
import { planScheduleSync, type ScheduledRace } from "@/lib/schedule-sync";

const NOW = new Date("2026-11-09T15:00:00Z");

function dbRace(id: string, name: string, circuitName: string, start: string, status = "upcoming"): ScheduledRace {
  const raceDate = new Date(start);
  return { id, name, circuitName, status, raceDate, pickDeadline: raceDate };
}

function official(raceName: string, circuitName: string, date: string, time: string | null): JolpicaCalendarEntry {
  return {
    round: 0,
    raceName,
    circuitName,
    date,
    startsAt: time ? new Date(`${date}T${time}`) : null,
  };
}

// The production row as seeded, two hours after the official 04:00Z start.
const lasVegas = dbRace("lv", "Las Vegas Grand Prix", "Las Vegas Strip Circuit", "2026-11-22T06:00:00Z");
const lasVegasOfficial = official("Las Vegas Grand Prix", "Las Vegas Strip Street Circuit", "2026-11-22", "04:00:00Z");

const qatar = dbRace("qa", "Qatar Grand Prix", "Lusail International Circuit", "2026-11-29T16:00:00Z");
const qatarOfficial = official("Qatar Grand Prix", "Lusail International Circuit", "2026-11-29", "16:00:00Z");

describe("planScheduleSync", () => {
  it("moves an upcoming race to the official start time", () => {
    const plan = planScheduleSync([lasVegas], [lasVegasOfficial], NOW);

    expect(plan.changes).toEqual([
      {
        raceId: "lv",
        name: "Las Vegas Grand Prix",
        from: new Date("2026-11-22T06:00:00Z"),
        to: new Date("2026-11-22T04:00:00Z"),
      },
    ]);
    expect(plan.warnings).toEqual([]);
  });

  it("leaves a race alone when it already matches", () => {
    const plan = planScheduleSync([qatar], [qatarOfficial], NOW);

    expect(plan).toEqual({ changes: [], warnings: [] });
  });

  it("never moves a race whose picks have already locked", () => {
    // Started yesterday and still awaiting results; reopening picks would be a bug.
    const brazil = dbRace("br", "São Paulo Grand Prix", "Interlagos", "2026-11-08T17:00:00Z");
    const brazilOfficial = official("Brazilian Grand Prix", "Autódromo José Carlos Pace", "2026-11-08", "18:00:00Z");

    const plan = planScheduleSync([brazil], [brazilOfficial], NOW);

    expect(plan.changes).toEqual([]);
  });

  it("leaves a race alone when Jolpica hasn't published a time", () => {
    const plan = planScheduleSync([lasVegas], [{ ...lasVegasOfficial, startsAt: null }], NOW);

    expect(plan.changes).toEqual([]);
  });

  it("flags a reschedule of more than a day instead of applying it", () => {
    const qatarMoved = official("Qatar Grand Prix", "Lusail International Circuit", "2026-12-13", "16:00:00Z");

    const plan = planScheduleSync([qatar], [qatarMoved], NOW);

    expect(plan.changes).toEqual([]);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0]).toContain("Qatar Grand Prix");
  });

  it("flags an upcoming official race that is missing from the database", () => {
    const newRace = official("Bahrain Grand Prix in Malaysia", "Sepang International Circuit", "2026-12-13", "07:00:00Z");

    const plan = planScheduleSync([qatar], [qatarOfficial, newRace], NOW);

    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0]).toContain("Bahrain Grand Prix in Malaysia");
  });

  it("does not flag past official races missing from the database", () => {
    const pastRace = official("Bahrain Grand Prix in Malaysia", "Sepang International Circuit", "2026-10-04", "07:00:00Z");

    const plan = planScheduleSync([qatar], [qatarOfficial, pastRace], NOW);

    expect(plan.warnings).toEqual([]);
  });

  it("flags an upcoming race that is no longer on the official calendar", () => {
    const plan = planScheduleSync([lasVegas, qatar], [qatarOfficial], NOW);

    expect(plan.changes).toEqual([]);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0]).toContain("Las Vegas Grand Prix");
  });
});
