import { describe, expect, it, vi } from "vitest";

// gatherFacts is pure apart from its sources; the module also imports the
// database client and the mailer, which a unit test shouldn't construct.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendProcessingAlert: vi.fn() }));

import type { JolpicaCalendarEntry, JolpicaResult } from "@/lib/jolpica";
import type { OpenF1RaceControl } from "@/lib/openf1";
import { gatherFacts } from "@/lib/process-results";

const RACE = { seasonYear: 2026, raceDate: new Date("2026-11-08T17:00:00Z"), circuitName: "Autódromo José Carlos Pace" };
const CALENDAR: JolpicaCalendarEntry[] = [
  { round: 20, raceName: "Brazilian Grand Prix", circuitName: "Autódromo José Carlos Pace", date: "2026-11-08", startsAt: RACE.raceDate },
];
const RESULTS = [{ position: "1" }] as unknown as JolpicaResult[];
const MESSAGES = [{ message: "SAFETY CAR DEPLOYED" }] as unknown as OpenF1RaceControl[];

function sources(over: Partial<Parameters<typeof gatherFacts>[3]> = {}) {
  return {
    getRaceResults: vi.fn(async () => RESULTS),
    getSessionKeyForRound: vi.fn(async () => 9999 as number | null),
    getRaceControlEvents: vi.fn(async () => MESSAGES),
    ...over,
  };
}

describe("gatherFacts", () => {
  it("returns everything when all three sources answer", async () => {
    const src = sources();
    expect(await gatherFacts(RACE, CALENDAR, "R20", src)).toEqual({ onCalendar: true, results: RESULTS, raceControl: MESSAGES });
    expect(src.getRaceResults).toHaveBeenCalledWith(2026, 20);   // Jolpica's round, found by date
  });

  it("reports a calendar that couldn't be fetched as unknown, and asks nothing else", async () => {
    const src = sources();
    expect(await gatherFacts(RACE, null, "R20", src)).toEqual({ onCalendar: null, results: [], raceControl: null });
    expect(src.getRaceResults).not.toHaveBeenCalled();
  });

  it("reports a race the calendar doesn't list as missing", async () => {
    const elsewhere = [{ ...CALENDAR[0], circuitName: "Lusail International Circuit", date: "2026-11-29" }];
    expect(await gatherFacts(RACE, elsewhere, "R20", sources())).toMatchObject({ onCalendar: false });
  });

  it("does not ask for race control before results exist", async () => {
    const src = sources({ getRaceResults: vi.fn(async () => []) });
    expect(await gatherFacts(RACE, CALENDAR, "R20", src)).toEqual({ onCalendar: true, results: [], raceControl: null });
    expect(src.getSessionKeyForRound).not.toHaveBeenCalled();
  });

  it("reports an OpenF1 failure as missing race-control data, not as a quiet race", async () => {
    const down = sources({ getRaceControlEvents: vi.fn(async () => { throw new Error("OpenF1 API error: 503"); }) });
    expect(await gatherFacts(RACE, CALENDAR, "R20", down)).toEqual({ onCalendar: true, results: RESULTS, raceControl: null });

    const noSession = sources({ getSessionKeyForRound: vi.fn(async () => null) });
    expect(await gatherFacts(RACE, CALENDAR, "R20", noSession)).toMatchObject({ raceControl: null });
    expect(noSession.getRaceControlEvents).not.toHaveBeenCalled();
  });

  it("lets a results failure propagate, so the race is retried and the error reported", async () => {
    const broken = sources({ getRaceResults: vi.fn(async () => { throw new Error("Jolpica API error: 500"); }) });
    await expect(gatherFacts(RACE, CALENDAR, "R20", broken)).rejects.toThrow("Jolpica API error: 500");
  });
});
