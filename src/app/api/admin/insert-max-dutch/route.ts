import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SEASON_YEAR } from "@/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const league = await prisma.league.findFirst({
    where: { name: { contains: "Checking", mode: "insensitive" } },
    include: { members: { include: { user: true } } },
  });
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const maxMember = league.members.find(
    (m) => !m.user.email.includes("lattanzi")
  );
  if (!maxMember) {
    return NextResponse.json({ error: "Max not found" }, { status: 404 });
  }

  const race = await prisma.race.findFirst({
    where: { seasonYear: SEASON_YEAR, country: { contains: "Netherlands", mode: "insensitive" } },
  });
  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const driver = await prisma.driver.findFirst({
    where: { lastName: { contains: "Bortoleto", mode: "insensitive" } },
  });
  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const constructor = await prisma.constructor.findFirst({
    where: { name: { contains: "Audi", mode: "insensitive" } },
  });
  if (!constructor) {
    return NextResponse.json({ error: "Constructor not found" }, { status: 404 });
  }

  const memberships = await prisma.leagueMember.findMany({
    where: { userId: maxMember.userId },
  });

  const results = [];
  for (const membership of memberships) {
    const pick = await prisma.pick.upsert({
      where: {
        leagueId_userId_raceId: {
          leagueId: membership.leagueId,
          userId: maxMember.userId,
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
        userId: maxMember.userId,
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
    message: `Inserted pick for ${maxMember.user.name}: ${driver.firstName} ${driver.lastName} + ${constructor.name} at ${race.name}`,
    picks: results,
  });
}
