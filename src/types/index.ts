export type PickType = "driver_constructor" | "race_control";
export type RaceStatus = "upcoming" | "completed";
export type MemberRole = "admin" | "member";
export type EventType = "red_flag" | "safety_car" | "vsc" | "dnf" | "wet" | "penalty";

export interface PickConstraints {
  usedDriverIds: string[];
  usedConstructorCounts: Record<string, number>;
  raceControlCount: number;
  remainingDrivers: { id: string; code: string; firstName: string; lastName: string; constructorId: string; constructorName: string; constructorJolpicaId: string }[];
  remainingConstructors: { id: string; name: string; usesLeft: number }[];
  canPickRaceControl: boolean;
}

export const RACE_CONTROL_POINTS = {
  red_flag: 15,
  safety_car: 5,
  vsc: 3,
  dnf: 2,
  wet: 5,
  penalty: 1,
} as const;

// 2026: 11 teams, 22 drivers, 24 races → 2 Race Control picks
export const MAX_RACE_CONTROL_PICKS = 2;
export const MAX_CONSTRUCTOR_USES = 2;
export const MAX_DRIVER_USES = 1;
export const SEASON_YEAR = 2026;
