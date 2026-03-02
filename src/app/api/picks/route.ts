import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPickConstraints, validatePick } from "@/lib/constraints";
import { SEASON_YEAR } from "@/types";
import { z } from "zod";

const pickSchema = z.object({
  leagueId: z.string(),
  raceId: z.string(),
  pickType: z.enum(["driver_constructor", "race_control"]),
  driverId: z.string().optional(),
  constructorId: z.string().optional(),
});

// GET /api/picks?leagueId=...&raceId=... — get picks + constraints
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId");

  if (!leagueId) {
    return NextResponse.json({ error: "leagueId required" }, { status: 400 });
  }

  // Verify membership
  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const raceId = searchParams.get("raceId");

  // Get constraints
  const constraints = await getPickConstraints(
    session.user.id,
    leagueId,
    SEASON_YEAR,
    raceId ?? undefined
  );

  // Get current pick for this race if raceId provided
  let currentPick = null;
  if (raceId) {
    currentPick = await prisma.pick.findUnique({
      where: {
        leagueId_userId_raceId: {
          leagueId,
          userId: session.user.id,
          raceId,
        },
      },
      include: { driver: true, constructor: true },
    });
  }

  // Get all picks for this user in this league
  const allPicks = await prisma.pick.findMany({
    where: { leagueId, userId: session.user.id },
    include: {
      race: true,
      driver: true,
      constructor: true,
      score: true,
    },
    orderBy: { race: { round: "asc" } },
  });

  return NextResponse.json({ constraints, currentPick, allPicks });
}

// POST /api/picks — create or update a pick
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leagueId, raceId, pickType, driverId, constructorId } =
      pickSchema.parse(body);

    // Verify membership
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: session.user.id } },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Check pick deadline
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }
    if (new Date() >= race.pickDeadline) {
      return NextResponse.json(
        { error: "Pick deadline has passed for this race." },
        { status: 400 }
      );
    }

    // Validate constraints (exclude current race to allow edits)
    const constraints = await getPickConstraints(
      session.user.id,
      leagueId,
      SEASON_YEAR,
      raceId
    );

    const validation = validatePick(constraints, pickType, driverId, constructorId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Upsert pick
    const pick = await prisma.pick.upsert({
      where: {
        leagueId_userId_raceId: {
          leagueId,
          userId: session.user.id,
          raceId,
        },
      },
      update: {
        pickType,
        driverId: pickType === "race_control" ? null : driverId,
        constructorId: pickType === "race_control" ? null : constructorId,
      },
      create: {
        leagueId,
        userId: session.user.id,
        raceId,
        pickType,
        driverId: pickType === "race_control" ? null : driverId,
        constructorId: pickType === "race_control" ? null : constructorId,
      },
      include: { driver: true, constructor: true, race: true },
    });

    return NextResponse.json(pick);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
