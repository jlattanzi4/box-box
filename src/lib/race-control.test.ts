import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { JolpicaResult } from "@/lib/jolpica";
import type { OpenF1RaceControl } from "@/lib/openf1";
import { tallyRaceControl } from "@/lib/race-control";
import { calculateRaceControlScore } from "@/lib/scoring";

// Raw API responses saved 2026-11-09: OpenF1 /race_control for the race
// session, and Jolpica /2026/{round}/results.json Results.
function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));
}
const messagesFor = (race: string) => fixture<OpenF1RaceControl[]>(`2026-${race}.openf1-race-control.json`);
const resultsFor = (race: string) => fixture<JolpicaResult[]>(`2026-${race}.jolpica-results.json`);

function rc(category: string, message: string, flag?: string): OpenF1RaceControl {
  return { date: "2026-11-08T17:30:00+00:00", category, message, ...(flag ? { flag } : {}) };
}

const brazilResults = resultsFor("sao-paulo");
function result(positionText: string, status: string): JolpicaResult {
  return { ...brazilResults[0], positionText, status };
}

describe("tallyRaceControl on real 2026 races", () => {
  // Expected values hand-counted from the raw messages and results, not from this code.
  it.each([
    ["canada", { redFlags: 0, safetyCars: 0, vscs: 3, penalties: 6, dnfs: 5, wet: false }, 25],
    ["madrid", { redFlags: 0, safetyCars: 0, vscs: 1, penalties: 2, dnfs: 4, wet: false }, 13],
    ["singapore", { redFlags: 0, safetyCars: 0, vscs: 2, penalties: 0, dnfs: 4, wet: false }, 14],
    ["mexico", { redFlags: 1, safetyCars: 2, vscs: 1, penalties: 4, dnfs: 5, wet: false }, 42],
    ["sao-paulo", { redFlags: 0, safetyCars: 0, vscs: 0, penalties: 2, dnfs: 1, wet: false }, 4],
  ])("%s", (race, want, points) => {
    const tally = tallyRaceControl(messagesFor(race), resultsFor(race));

    expect(tally).toMatchObject(want);
    expect(calculateRaceControlScore(tally)).toBe(points);
  });
});

describe("tallyRaceControl rules", () => {
  it("doesn't mistake the chequered flag or an infringement for a red flag", () => {
    const tally = tallyRaceControl(
      [
        rc("Flag", "CHEQUERED FLAG", "CHEQUERED"),
        rc("Other", "INCIDENT INVOLVING CAR 14 (ALO) NOTED - RED FLAG INFRINGEMENT"),
        rc("Other", "RED FLAG - RACE SUSPENDED"),
      ],
      []
    );

    expect(tally.redFlags).toBe(1);
  });

  it("counts a safety car only when it is deployed", () => {
    const tally = tallyRaceControl(
      [
        rc("SafetyCar", "SAFETY CAR DEPLOYED"),
        rc("Other", "SAFETY CAR LIGHTS ON"),
        rc("Other", "LAPPED CARS MAY NOW OVERTAKE THE SAFETY CAR: 2, 5, 9"),
        rc("SafetyCar", "SAFETY CAR IN THIS LAP"),
        rc("Other", "INCIDENT INVOLVING CAR 44 (HAM) NOTED - SAFETY CAR INFRINGEMENT"),
      ],
      []
    );

    expect(tally.safetyCars).toBe(1);
  });

  it("counts a VSC only when it is deployed", () => {
    const tally = tallyRaceControl(
      [
        rc("SafetyCar", "VSC DEPLOYED"),
        rc("SafetyCar", "VSC ENDING"),
        rc("Other", "INCIDENT INVOLVING CAR 1 (NOR) NOTED - VSC INFRINGEMENT"),
      ],
      []
    );

    expect(tally.vscs).toBe(1);
  });

  it("counts each penalty once, when the stewards issue it", () => {
    const tally = tallyRaceControl(
      [
        rc("Other", "FIA STEWARDS: INCIDENT INVOLVING CAR 27 (HUL) UNDER INVESTIGATION - SPEEDING IN THE PIT LANE"),
        rc("Other", "FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 27 (HUL) - SPEEDING IN THE PIT LANE"),
        rc("Other", "FIA STEWARDS: PENALTY SERVED - 5 SECOND TIME PENALTY FOR CAR 27 (HUL) - SPEEDING IN THE PIT LANE"),
        rc("Other", "FIA STEWARDS: DRIVE THROUGH PENALTY FOR CAR 77 (BOT) - SPEEDING IN THE PIT LANE"),
        rc("Other", "FIA STEWARDS: STOP-AND-GO PENALTY FOR CAR 43 (COL) - STARTING PROCEDURE INFRINGEMENT"),
        rc("Other", "FIA STEWARDS: INCIDENT INVOLVING CAR 6 (HAD) UNDER INVESTIGATION - FAILING TO SERVE TIME PENALTY CORRECTLY"),
        rc("Other", "FIA STEWARDS: WARNING FOR CAR 12 (ANT) - MOVING UNDER BRAKING"),
      ],
      []
    );

    expect(tally.penalties).toBe(3);
  });

  it("counts cars that retire, classified or not, but not cars that never started", () => {
    const tally = tallyRaceControl(
      [],
      [
        result("R", "Retired"),
        result("17", "Retired"),
        result("W", "Did not start"),
        result("1", "Finished"),
        result("12", "Lapped"),
      ]
    );

    expect(tally.dnfs).toBe(2);
  });
});
