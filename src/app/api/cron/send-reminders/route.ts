import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPickReminder } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find races happening tomorrow (within 18-42 hour window to handle timezone variance)
  const now = new Date();
  const from = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 42 * 60 * 60 * 1000);

  const upcomingRaces = await prisma.race.findMany({
    where: {
      status: "upcoming",
      raceDate: { gte: from, lte: to },
    },
  });

  if (upcomingRaces.length === 0) {
    return NextResponse.json({ message: "No races tomorrow", sent: 0 });
  }

  let totalSent = 0;

  for (const race of upcomingRaces) {
    // Find all leagues for this season
    const leagues = await prisma.league.findMany({
      where: { seasonYear: race.seasonYear },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    for (const league of leagues) {
      // Find members who haven't picked for this race
      const existingPicks = await prisma.pick.findMany({
        where: { leagueId: league.id, raceId: race.id },
      });

      const pickedUserIds = new Set(existingPicks.map((p) => p.userId));

      const membersWithoutPicks = league.members.filter(
        (m) => !pickedUserIds.has(m.userId)
      );

      for (const member of membersWithoutPicks) {
        if (!member.user.email) continue;

        try {
          await sendPickReminder({
            to: member.user.email,
            userName: member.user.name ?? "Racer",
            raceName: race.name,
            raceRound: race.round,
            leagueName: league.name,
            leagueId: league.id,
          });
          totalSent++;
        } catch (err) {
          console.error(
            `Failed to send reminder to ${member.user.email}:`,
            err
          );
        }
      }
    }
  }

  return NextResponse.json({
    message: `Sent ${totalSent} reminder(s)`,
    sent: totalSent,
    races: upcomingRaces.map((r) => r.name),
  });
}
