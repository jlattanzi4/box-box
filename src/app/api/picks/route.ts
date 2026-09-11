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

// GET /api/picks?leagueId=...&raceId=... — constraints, the full grid, and the current pick
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

  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const raceId = searchParams.get("raceId");

  const [constraints, currentPick, drivers, constructors] = await Promise.all([
    getPickConstraints(session.user.id, leagueId, SEASON_YEAR, raceId ?? undefined),
    raceId
      ? prisma.pick.findUnique({
          where: { leagueId_userId_raceId: { leagueId, userId: session.user.id, raceId } },
          include: { driver: true, constructor: true },
        })
      : Promise.resolve(null),
    prisma.driver.findMany({ include: { constructor: true } }),
    prisma.constructor.findMany({ orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    constraints,
    currentPick,
    grid: {
      drivers: drivers
        .map((d) => {
          // "constructor" collides with Object.prototype in Prisma's types
          const team = d.constructor as unknown as { name: string; jolpicaId: string };
          return {
            id: d.id,
            code: d.code,
            firstName: d.firstName,
            lastName: d.lastName,
            number: d.number,
            constructorId: d.constructorId,
            constructorName: team.name,
            constructorJolpicaId: team.jolpicaId,
          };
        })
        .sort((a, b) => a.constructorName.localeCompare(b.constructorName) || a.number - b.number),
      constructors: constructors.map((c) => ({ id: c.id, name: c.name, jolpicaId: c.jolpicaId })),
    },
  });
}

// POST /api/picks — create or update a pick
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leagueId, raceId, pickType, driverId, constructorId } = pickSchema.parse(body);

    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: session.user.id } },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }
    if (new Date() >= race.pickDeadline) {
      return NextResponse.json({ error: "Picks are locked. Lights already went out for this race." }, { status: 400 });
    }

    const constraints = await getPickConstraints(session.user.id, leagueId, SEASON_YEAR, raceId);
    const validation = validatePick(constraints, pickType, driverId, constructorId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = {
      pickType,
      driverId: pickType === "race_control" ? null : driverId,
      constructorId: pickType === "race_control" ? null : constructorId,
    };
    const pick = await prisma.pick.upsert({
      where: { leagueId_userId_raceId: { leagueId, userId: session.user.id, raceId } },
      update: data,
      create: { leagueId, userId: session.user.id, raceId, ...data },
      include: { driver: true, constructor: true, race: true },
    });

    return NextResponse.json(pick);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
