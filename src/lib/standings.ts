import { prisma } from "@/lib/prisma";
import { playerCodes } from "@/lib/player-code";

export interface StandingRow {
  userId: string;
  name: string;
  code: string;
  role: string;
  position: number;
  totalPoints: number;
  /** Points behind the leader (0 for the leader). */
  gap: number;
  /** Points scored in the most recent completed race, null if no pick. */
  lastRoundPoints: number | null;
  /** Team colour key (constructor jolpicaId) of the member's latest pick. */
  liveryKey: string | null;
}

export interface LeagueStandings {
  rows: StandingRow[];
  lastRace: { id: string; round: number; name: string } | null;
  racesScored: number;
}

export interface LiveryPick {
  userId: string;
  /** null for a Race Control pick. */
  constructorJolpicaId: string | null;
  race: { round: number; pickDeadline: Date; status: string };
}

/**
 * The team colour beside each member: the constructor of their most recent
 * pick that has locked. A pick for a race that hasn't started is still secret,
 * and its colour would give it away, so it doesn't count yet. Picks on
 * cancelled races never count.
 */
export function liveryByUser(picks: LiveryPick[], now: Date): Map<string, string | null> {
  const latest = new Map<string, LiveryPick>();
  for (const pick of picks) {
    if (pick.race.status === "cancelled" || pick.race.pickDeadline > now) continue;
    const current = latest.get(pick.userId);
    if (!current || pick.race.round > current.race.round) latest.set(pick.userId, pick);
  }
  return new Map([...latest].map(([userId, pick]) => [userId, pick.constructorJolpicaId]));
}

/**
 * Season standings for a league, ordered like a timing tower: leader first,
 * gap to leader on every row, last-round delta, and a livery colour from the
 * member's most recent pick.
 */
export async function getLeagueStandings(leagueId: string): Promise<LeagueStandings> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!league) return { rows: [], lastRace: null, racesScored: 0 };

  const [totals, lastRace] = await Promise.all([
    prisma.score.groupBy({
      by: ["userId"],
      where: { leagueId },
      _sum: { totalPoints: true },
    }),
    prisma.race.findFirst({
      where: { seasonYear: league.seasonYear, status: "completed" },
      orderBy: { round: "desc" },
      select: { id: true, round: true, name: true },
    }),
  ]);

  const lastScores = lastRace
    ? await prisma.score.findMany({
        where: { leagueId, raceId: lastRace.id },
        select: { userId: true, totalPoints: true },
      })
    : [];

  const leaguePicks = await prisma.pick.findMany({
    where: { leagueId, race: { seasonYear: league.seasonYear } },
    include: { constructor: true, race: true },
  });

  const racesScored = await prisma.race.count({
    where: { seasonYear: league.seasonYear, status: "completed" },
  });

  const totalMap = new Map(totals.map((t) => [t.userId, t._sum.totalPoints ?? 0]));
  const lastMap = new Map(lastScores.map((s) => [s.userId, s.totalPoints]));
  const liveryMap = liveryByUser(
    leaguePicks.map((p) => ({
      userId: p.userId,
      // "constructor" collides with Object.prototype in Prisma's types
      constructorJolpicaId: (p.constructor as unknown as { jolpicaId: string } | null)?.jolpicaId ?? null,
      race: p.race,
    })),
    new Date()
  );
  const codes = playerCodes(league.members.map((m) => ({ id: m.userId, name: m.user.name })));

  const sorted = league.members
    .map((m) => ({
      userId: m.userId,
      name: m.user.name,
      role: m.role,
      code: codes.get(m.userId) ?? "PLR",
      totalPoints: totalMap.get(m.userId) ?? 0,
      lastRoundPoints: lastMap.has(m.userId) ? lastMap.get(m.userId)! : null,
      liveryKey: liveryMap.get(m.userId) ?? null,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));

  const leader = sorted[0]?.totalPoints ?? 0;
  const rows: StandingRow[] = sorted.map((r, i) => ({
    ...r,
    position: i + 1,
    gap: leader - r.totalPoints,
  }));

  return { rows, lastRace, racesScored };
}
