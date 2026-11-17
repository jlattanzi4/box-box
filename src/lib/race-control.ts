import type { JolpicaResult } from "@/lib/jolpica";
import type { OpenF1RaceControl, OpenF1Stint } from "@/lib/openf1";

/**
 * Race Control scoring rules, matched against real 2026 race-control feeds
 * (see race-control.test.ts and __fixtures__/).
 */

export interface RaceControlTally {
  redFlags: number;
  safetyCars: number;
  vscs: number;
  dnfs: number;
  wet: boolean;
  penalties: number;
  details: { eventType: string; description: string }[];
}

// The stewards' decision, e.g. "FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 27 (HUL) - ...".
// Investigations and the later "PENALTY SERVED - ..." echo don't match.
const PENALTY_ISSUED = /^(FIA STEWARDS: )?(\d+ SECOND TIME|DRIVE THROUGH|STOP-AND-GO) PENALTY FOR CAR/;

// A race is wet when any car runs intermediate or full wet tyres in it. Race
// control never declares a wet race in OpenF1's feed (not even São Paulo 2024,
// run in heavy rain), but the tyres always tell.
const WET_TYRES = new Set(["INTERMEDIATE", "WET"]);

export function tallyRaceControl(
  messages: OpenF1RaceControl[],
  results: JolpicaResult[],
  stints: OpenF1Stint[] = []
): RaceControlTally {
  const details: RaceControlTally["details"] = [];
  const record = (eventType: string, description: string) => details.push({ eventType, description });

  for (const event of messages) {
    const msg = event.message.trim().toUpperCase();
    // Prefix matches only: "CHEQUERED FLAG" contains "RED FLAG", and incident
    // reports mention "RED FLAG", "SAFETY CAR" and "VSC" infringements.
    if (msg.startsWith("RED FLAG")) {
      record("red_flag", event.message);
    } else if (msg.startsWith("SAFETY CAR DEPLOYED")) {
      record("safety_car", event.message);
    } else if (msg.startsWith("VSC DEPLOYED")) {
      record("vsc", event.message);
    } else if (PENALTY_ISSUED.test(msg)) {
      record("penalty", event.message);
    }
  }

  const wetCars = new Set(stints.filter((s) => WET_TYRES.has(s.compound?.toUpperCase() ?? "")).map((s) => s.driver_number));
  const wet = wetCars.size > 0;
  if (wet) record("wet", `${wetCars.size} ${wetCars.size === 1 ? "car" : "cars"} on intermediate or wet tyres`);

  // OpenF1 doesn't announce retirements, so DNFs come from the official
  // classification. Cars that never started aren't DNFs.
  for (const r of results) {
    if (r.positionText === "R" || r.status === "Retired") {
      record("dnf", `${r.Driver.code ?? r.Driver.familyName}: retired after ${r.laps} laps`);
    }
  }

  const count = (eventType: string) => details.filter((d) => d.eventType === eventType).length;
  return {
    redFlags: count("red_flag"),
    safetyCars: count("safety_car"),
    vscs: count("vsc"),
    dnfs: count("dnf"),
    wet,
    penalties: count("penalty"),
    details,
  };
}
