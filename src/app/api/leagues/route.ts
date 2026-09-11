import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeagueStandings } from "@/lib/standings";
import { z } from "zod";
import { randomBytes } from "crypto";
import { SEASON_YEAR } from "@/types";

const createLeagueSchema = z.object({
  name: z.string().min(2).max(50),
});

// GET /api/leagues — the user's leagues with their standing in each
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    include: { league: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  const nextRace = await prisma.race.findFirst({
    where: { seasonYear: SEASON_YEAR, status: "upcoming", pickDeadline: { gt: new Date() } },
    orderBy: { round: "asc" },
    select: { id: true, round: true, name: true, raceDate: true, pickDeadline: true },
  });

  const leagues = await Promise.all(
    memberships.map(async (m) => {
      const standings = await getLeagueStandings(m.leagueId);
      const me = standings.rows.find((r) => r.userId === userId);
      const leader = standings.rows[0];
      const pickCount = nextRace
        ? await prisma.pick.count({ where: { leagueId: m.leagueId, userId, raceId: nextRace.id } })
        : 0;
      return {
        id: m.league.id,
        name: m.league.name,
        inviteCode: m.league.inviteCode,
        seasonYear: m.league.seasonYear,
        role: m.role,
        memberCount: m.league._count.members,
        position: me?.position ?? null,
        totalPoints: me?.totalPoints ?? 0,
        gap: me?.gap ?? 0,
        leaderCode: leader?.code ?? null,
        leaderName: leader?.name ?? null,
        hasPickForNextRace: pickCount > 0,
      };
    })
  );

  return NextResponse.json({ leagues, nextRace });
}

// POST /api/leagues — create a new league
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name } = createLeagueSchema.parse(body);

    const inviteCode = randomBytes(4).toString("hex").toUpperCase();

    const league = await prisma.league.create({
      data: {
        name,
        inviteCode,
        seasonYear: SEASON_YEAR,
        members: {
          create: { userId: session.user.id, role: "admin" },
        },
      },
    });

    return NextResponse.json(league, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
