import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { playerCodes } from "@/lib/player-code";
import { PageHeader } from "@/components/page-header";
import { LeagueNav } from "@/components/league-nav";
import { PickChip } from "@/components/pick-chip";
import { RACE_CONTROL_POINTS } from "@/types";

const EVENT_STYLE: Record<string, { label: string; color: string }> = {
  red_flag: { label: "Red flag", color: "var(--kerb-red)" },
  safety_car: { label: "Safety car", color: "var(--flag-yellow)" },
  vsc: { label: "VSC", color: "#f0b429" },
  wet: { label: "Wet", color: "var(--wet-blue)" },
  dnf: { label: "DNF", color: "#ff7a3d" },
  penalty: { label: "Penalty", color: "var(--chalk-dim)" },
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id: leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!league || !league.members.some((m) => m.userId === userId)) redirect("/dashboard");

  const codes = playerCodes(league.members.map((m) => ({ id: m.userId, name: m.user.name })));

  const [races, scores] = await Promise.all([
    prisma.race.findMany({
      where: { seasonYear: league.seasonYear, status: "completed" },
      orderBy: { round: "desc" },
      include: { events: true },
    }),
    prisma.score.findMany({
      where: { leagueId },
      include: {
        pick: { include: { driver: true, constructor: true } },
        user: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={league.name} title="Results" />
      <LeagueNav leagueId={leagueId} />

      {races.length === 0 ? (
        <div className="pit-board fade-up">
          <div className="pit-board-row">
            <span className="t-eyebrow">Season</span>
            <span className="pit-board-value text-3xl">No results yet</span>
          </div>
          <p className="px-5 py-4 text-sm text-chalk-dim border-t border-asphalt-700">
            Scores land the morning after each race.
          </p>
        </div>
      ) : (
        <div className="space-y-5 stagger">
          {races.map((race) => {
            const rows = scores
              .filter((s) => s.raceId === race.id)
              .sort((a, b) => b.totalPoints - a.totalPoints || a.user.name.localeCompare(b.user.name));
            const top = rows[0]?.totalPoints ?? 0;

            // Tally events: "3 × DNF" reads better than three chips.
            const tally = new Map<string, number>();
            for (const e of race.events) tally.set(e.eventType, (tally.get(e.eventType) ?? 0) + 1);
            const rcTotal = [...tally.entries()].reduce(
              (sum, [type, n]) => sum + n * (RACE_CONTROL_POINTS[type as keyof typeof RACE_CONTROL_POINTS] ?? 0),
              0
            );

            return (
              <section key={race.id} className="pit-board" aria-labelledby={`race-${race.id}`}>
                <div className="flex items-baseline justify-between gap-4 px-4 sm:px-5 py-4">
                  <h2 id={`race-${race.id}`} className="min-w-0">
                    <span className="t-eyebrow block">Round {race.round}</span>
                    <span className="t-display text-3xl sm:text-4xl text-chalk">
                      {race.name.replace(" Grand Prix", " GP")}
                    </span>
                  </h2>
                  <span className="text-right shrink-0">
                    <span className="t-eyebrow block">Race Control</span>
                    <span className="pit-board-value text-2xl t-num">{rcTotal} pts</span>
                  </span>
                </div>

                {tally.size > 0 && (
                  <ul className="flex flex-wrap gap-1.5 px-4 sm:px-5 pb-4">
                    {[...tally.entries()].map(([type, n]) => {
                      const style = EVENT_STYLE[type] ?? { label: type, color: "var(--chalk-dim)" };
                      return (
                        <li
                          key={type}
                          className="inline-flex items-center gap-1.5 rounded border border-asphalt-600 px-2 py-0.5 text-xs"
                        >
                          <span className="size-2 rounded-sm" style={{ backgroundColor: style.color }} />
                          {n > 1 && <span className="t-num text-chalk-dim">{n}×</span>}
                          {style.label}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {rows.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-chalk-dim border-t border-asphalt-700">Nobody picked this round.</p>
                ) : (
                  <ol>
                    <li className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_1fr_4rem_4rem_4rem_4.5rem] items-center gap-2 px-4 sm:px-5 py-2 border-t border-asphalt-700">
                      <span className="t-eyebrow">Pos</span>
                      <span className="t-eyebrow">Player</span>
                      <span className="t-eyebrow hidden sm:block">Pick</span>
                      <span className="t-eyebrow text-right hidden sm:block">Drv</span>
                      <span className="t-eyebrow text-right hidden sm:block">Con</span>
                      <span className="t-eyebrow text-right hidden sm:block">RC</span>
                      <span className="t-eyebrow text-right">Total</span>
                    </li>
                    {rows.map((s, i) => {
                      const isYou = s.userId === userId;
                      const best = i === 0 && s.totalPoints > 0 && s.totalPoints === top;
                      return (
                        <li
                          key={s.id}
                          className={`grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_1fr_4rem_4rem_4rem_4.5rem] items-center gap-2 px-4 sm:px-5 py-2.5 border-t border-asphalt-700 ${
                            isYou ? "bg-asphalt-800/70" : ""
                          }`}
                        >
                          <span className={`t-display text-2xl ${best ? "text-sector-purple" : "text-chalk"}`}>{i + 1}</span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="t-code text-base text-chalk">{codes.get(s.userId)}</span>
                              <span className="text-sm text-chalk-dim truncate">{s.user.name}</span>
                            </span>
                            <span className="sm:hidden mt-1 block">
                              <PickChip pick={s.pick} size="sm" />
                            </span>
                          </span>
                          <span className="hidden sm:block">
                            <PickChip pick={s.pick} size="sm" />
                          </span>
                          <span className="t-num text-sm text-right text-chalk-dim hidden sm:block">{s.driverPoints}</span>
                          <span className="t-num text-sm text-right text-chalk-dim hidden sm:block">{s.constructorPoints}</span>
                          <span className="t-num text-sm text-right text-chalk-dim hidden sm:block">{s.raceControlPoints}</span>
                          <span className={`t-num text-lg font-bold text-right ${best ? "text-sector-purple" : "text-chalk"}`}>
                            {s.totalPoints}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
