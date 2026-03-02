import { RACE_CONTROL_POINTS } from "@/types";
import type { ParsedRaceEvents } from "./openf1";

export function calculateRaceControlScore(events: ParsedRaceEvents): number {
  return (
    events.redFlags * RACE_CONTROL_POINTS.red_flag +
    events.safetyCars * RACE_CONTROL_POINTS.safety_car +
    events.vscs * RACE_CONTROL_POINTS.vsc +
    events.dnfs * RACE_CONTROL_POINTS.dnf +
    (events.wet ? RACE_CONTROL_POINTS.wet : 0) +
    events.penalties * RACE_CONTROL_POINTS.penalty
  );
}

export function calculateDriverScore(driverPoints: number): number {
  return driverPoints;
}

export function calculateConstructorScore(
  driver1Points: number,
  driver2Points: number
): number {
  return driver1Points + driver2Points;
}

export function calculateTotalScore(
  pickType: string,
  driverPoints: number,
  constructorPoints: number,
  raceControlPoints: number
): {
  driverPoints: number;
  constructorPoints: number;
  raceControlPoints: number;
  totalPoints: number;
} {
  if (pickType === "race_control") {
    return {
      driverPoints: 0,
      constructorPoints: 0,
      raceControlPoints,
      totalPoints: raceControlPoints,
    };
  }

  return {
    driverPoints,
    constructorPoints,
    raceControlPoints: 0,
    totalPoints: driverPoints + constructorPoints,
  };
}
