import type { JolpicaResult } from "@/lib/jolpica";
import type { OpenF1RaceControl } from "@/lib/openf1";

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

export function tallyRaceControl(
  messages: OpenF1RaceControl[],
  results: JolpicaResult[]
): RaceControlTally {
  const details: RaceControlTally["details"] = [];
  const record = (eventType: string, description: string) => details.push({ eventType, description });
  let wet = false;

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
    } else if (!wet && (msg.includes("WET RACE") || msg.includes("WET DECLARED"))) {
      wet = true;
      record("wet", event.message);
    }
  }

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
