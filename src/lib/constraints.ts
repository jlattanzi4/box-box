import { prisma } from "./prisma";
import { MAX_CONSTRUCTOR_USES, MAX_DRIVER_USES, MAX_RACE_CONTROL_PICKS, SEASON_YEAR } from "@/types";
import type { PickConstraints } from "@/types";

export async function getPickConstraints(
  userId: string,
  leagueId: string,
  seasonYear: number = SEASON_YEAR,
  excludeRaceId?: string
): Promise<PickConstraints> {
  // Get all existing picks for this user in this league
  const existingPicks = await prisma.pick.findMany({
    where: {
      userId,
      leagueId,
      race: { seasonYear },
      ...(excludeRaceId ? { raceId: { not: excludeRaceId } } : {}),
    },
    include: { driver: true, constructor: true },
  });

  const usedDriverIds: string[] = [];
  const usedConstructorCounts: Record<string, number> = {};
  let raceControlCount = 0;

  for (const pick of existingPicks) {
    if (pick.pickType === "race_control") {
      raceControlCount++;
    } else {
      if (pick.driverId) usedDriverIds.push(pick.driverId);
      if (pick.constructorId) {
        usedConstructorCounts[pick.constructorId] =
          (usedConstructorCounts[pick.constructorId] || 0) + 1;
      }
    }
  }

  // Get all drivers and constructors
  const allDrivers = await prisma.driver.findMany({
    orderBy: { lastName: "asc" },
    include: { constructor: true },
  });
  const allConstructors = await prisma.constructor.findMany({
    orderBy: { name: "asc" },
  });

  const remainingDrivers = allDrivers
    .filter((d) => !usedDriverIds.includes(d.id))
    .map((d) => ({
      id: d.id,
      code: d.code,
      firstName: d.firstName,
      lastName: d.lastName,
      constructorId: d.constructorId,
      constructorName: d.constructor.name,
      constructorJolpicaId: d.constructor.jolpicaId,
    }));

  const remainingConstructors = allConstructors.map((c) => ({
    id: c.id,
    name: c.name,
    usesLeft: MAX_CONSTRUCTOR_USES - (usedConstructorCounts[c.id] || 0),
  })).filter((c) => c.usesLeft > 0);

  return {
    usedDriverIds,
    usedConstructorCounts,
    raceControlCount,
    remainingDrivers,
    remainingConstructors,
    canPickRaceControl: raceControlCount < MAX_RACE_CONTROL_PICKS,
  };
}

export function validatePick(
  constraints: PickConstraints,
  pickType: string,
  driverId?: string,
  constructorId?: string
): { valid: boolean; error?: string } {
  if (pickType === "race_control") {
    if (!constraints.canPickRaceControl) {
      return {
        valid: false,
        error: `You have already used all ${MAX_RACE_CONTROL_PICKS} Race Control picks.`,
      };
    }
    return { valid: true };
  }

  if (pickType === "driver_constructor") {
    if (!driverId || !constructorId) {
      return {
        valid: false,
        error: "You must select both a driver and a constructor.",
      };
    }

    if (constraints.usedDriverIds.includes(driverId)) {
      return {
        valid: false,
        error: "You have already used this driver this season.",
      };
    }

    const constructorUses = constraints.usedConstructorCounts[constructorId] || 0;
    if (constructorUses >= MAX_CONSTRUCTOR_USES) {
      return {
        valid: false,
        error: `You have already used this constructor ${MAX_CONSTRUCTOR_USES} times this season.`,
      };
    }

    return { valid: true };
  }

  return { valid: false, error: "Invalid pick type." };
}
