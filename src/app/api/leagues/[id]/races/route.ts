import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leagueId } = await params;

  // Verify membership
  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const races = await prisma.race.findMany({
    where: { seasonYear: league.seasonYear },
    orderBy: { round: "asc" },
  });

  return NextResponse.json(races);
}
