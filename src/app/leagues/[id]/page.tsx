import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeagueStandings } from "@/lib/standings";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { LeagueNav } from "@/components/league-nav";
import { CopyCode } from "@/components/copy-code";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { PickChip } from "@/components/pick-chip";
import { TimingTower } from "@/components/timing-tower";

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;

  const league = await prisma.league.findUnique({
    where: { id },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!league) redirect("/dashboard");
  if (!league.members.some((m) => m.userId === userId)) redirect("/dashboard");

  const now = new Date();

  const [standings, nextRace, recentRace, completedRaces, totalRaces] = await Promise.all([
    getLeagueStandings(id),
    prisma.race.findFirst({
      where: { seasonYear: league.seasonYear, status: "upcoming", pickDeadline: { gt: now } },
      orderBy: { round: "asc" },
    }),
    prisma.race.findFirst({
      where: { seasonYear: league.seasonYear, status: { not: "cancelled" }, pickDeadline: { lte: now } },
      orderBy: { pickDeadline: "desc" },
    }),
    prisma.race.count({ where: { seasonYear: league.seasonYear, status: "completed" } }),
    prisma.race.count({ where: { seasonYear: league.seasonYear, status: { not: "cancelled" } } }),
  ]);

  const currentPick = nextRace
    ? await prisma.pick.findUnique({
        where: { leagueId_userId_raceId: { leagueId: id, userId, raceId: nextRace.id } },
        include: { driver: true, constructor: true },
      })
    : null;

  // Show the group's picks for the most recent race for a few days around it.
  const RECENT_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
  const showRecent =
    !!recentRace && now.getTime() - recentRace.pickDeadline.getTime() < RECENT_WINDOW_MS;

  const recentPicks = showRecent && recentRace
    ? await prisma.pick.findMany({
        where: { leagueId: id, raceId: recentRace.id },
        include: { driver: true, constructor: true, score: true },
      })
    : [];
  const recentByUser = new Map(recentPicks.map((p) => [p.userId, p]));
  const recentScored = recentRace?.status === "completed";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${league.seasonYear} season · ${completedRaces} of ${totalRaces} races scored`}
        title={league.name}
        actions={<CopyCode code={league.inviteCode} />}
      />

      <LeagueNav leagueId={id} />

      {/* Pit board: the next race and your pick for it */}
      {nextRace ? (
        <section className="pit-board fade-up" aria-labelledby="next-race">
          <div className="kerb" />
          <div className="pit-board-row">
            <span className="t-eyebrow">Round {nextRace.round}</span>
            <span id="next-race" className="pit-board-value text-3xl sm:text-5xl text-right">
              {nextRace.name.replace(" Grand Prix", " GP")}
            </span>
          </div>
          <div className="pit-board-row">
            <span className="t-eyebrow">Lights out</span>
            <span className="text-right">
              <Countdown to={nextRace.raceDate.toISOString()} className="pit-board-value text-3xl sm:text-5xl t-num" />
              <LocalTime iso={nextRace.raceDate.toISOString()} className="block text-xs text-chalk-dim mt-1" />
            </span>
          </div>
          <div className="pit-board-row items-center">
            <span className="t-eyebrow">Your pick</span>
            {currentPick ? (
              <PickChip pick={currentPick} size="lg" showName />
            ) : (
              <span className="t-code text-xl text-kerb blink">Not picked</span>
            )}
          </div>
          <div className="px-5 py-4 border-t border-asphalt-700 flex items-center justify-between gap-4">
            <span className="text-xs text-chalk-dim">
              {nextRace.circuitName} · {nextRace.country}
            </span>
            <Button asChild variant={currentPick ? "outline" : "board"}>
              <Link href={`/leagues/${id}/picks?raceId=${nextRace.id}`}>
                {currentPick ? "Change pick" : "Pick now"}
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="pit-board fade-up">
          <div className="kerb" />
          <div className="pit-board-row">
            <span className="t-eyebrow">Season</span>
            <span className="pit-board-value text-3xl sm:text-4xl">Chequered flag</span>
          </div>
        </section>
      )}

      {/* The grid's picks for the race that just happened */}
      {showRecent && recentRace && (
        <section className="panel p-4 sm:p-5 fade-up" aria-labelledby="recent-picks">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="recent-picks" className="t-code text-xl text-chalk">
              Round {recentRace.round} · {recentRace.name.replace(" Grand Prix", " GP")}
            </h2>
            <span className="t-eyebrow">{recentScored ? "Scored" : "Awaiting results"}</span>
          </div>
          <ul className="divide-y divide-asphalt-700">
            {standings.rows.map((m) => {
              const pick = recentByUser.get(m.userId);
              return (
                <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="t-code text-base text-chalk w-10">{m.code}</span>
                    <span className="text-sm text-chalk-dim truncate">{m.name}</span>
                  </span>
                  <span className="flex items-center gap-4 shrink-0">
                    <PickChip pick={pick} size="sm" />
                    {recentScored && pick?.score && (
                      <span className="t-num text-sm font-bold text-chalk w-12 text-right">
                        {pick.score.totalPoints}
                        <span className="text-xs font-normal text-chalk-dim"> pts</span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Standings */}
      <section className="space-y-3 fade-up" aria-labelledby="standings">
        <div className="flex items-baseline justify-between">
          <h2 id="standings" className="t-code text-xl text-chalk">Standings</h2>
          <Link href={`/leagues/${id}/results`} className="t-eyebrow hover:text-chalk">
            Race by race →
          </Link>
        </div>
        <TimingTower
          rows={standings.rows}
          currentUserId={userId}
          lastRoundLabel={standings.lastRace ? `R${standings.lastRace.round}` : null}
        />
      </section>
    </div>
  );
}
