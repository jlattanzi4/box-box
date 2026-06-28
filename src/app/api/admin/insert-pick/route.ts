import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SEASON_YEAR } from "@/types";

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, driverName, constructorName, raceCountry, leagueId } =
    await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const race = await prisma.race.findFirst({
    where: {
      seasonYear: SEASON_YEAR,
      country: { contains: raceCountry, mode: "insensitive" },
    },
  });
  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const driver = await prisma.driver.findFirst({
    where: { firstName: { contains: driverName, mode: "insensitive" } },
  });
  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const constructor = await prisma.constructor.findFirst({
    where: { name: { contains: constructorName, mode: "insensitive" } },
  });
  if (!constructor) {
    return NextResponse.json(
      { error: "Constructor not found" },
      { status: 404 }
    );
  }

  // Find leagues to insert into — either a specific one or all the user's leagues
  const memberships = leagueId
    ? await prisma.leagueMember.findMany({
        where: { userId: user.id, leagueId },
      })
    : await prisma.leagueMember.findMany({ where: { userId: user.id } });

  if (memberships.length === 0) {
    return NextResponse.json(
      { error: "User is not in any leagues" },
      { status: 404 }
    );
  }

  const results = [];
  for (const membership of memberships) {
    const pick = await prisma.pick.upsert({
      where: {
        leagueId_userId_raceId: {
          leagueId: membership.leagueId,
          userId: user.id,
          raceId: race.id,
        },
      },
      update: {
        pickType: "driver_constructor",
        driverId: driver.id,
        constructorId: constructor.id,
      },
      create: {
        leagueId: membership.leagueId,
        userId: user.id,
        raceId: race.id,
        pickType: "driver_constructor",
        driverId: driver.id,
        constructorId: constructor.id,
      },
      include: { driver: true, constructor: true, race: true },
    });
    results.push(pick);
  }

  return NextResponse.json({
    message: `Inserted pick for ${driver.firstName} ${driver.lastName} + ${constructor.name} at ${race.name}`,
    picks: results,
  });
}
