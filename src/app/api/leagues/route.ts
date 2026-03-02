import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { SEASON_YEAR } from "@/types";

const createLeagueSchema = z.object({
  name: z.string().min(2).max(50),
});

// GET /api/leagues — list user's leagues
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.leagueMember.findMany({
    where: { userId: session.user.id },
    include: {
      league: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const leagues = memberships.map((m) => ({
    ...m.league,
    role: m.role,
    memberCount: m.league.members.length,
  }));

  return NextResponse.json(leagues);
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
