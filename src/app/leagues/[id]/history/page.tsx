import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { playerCodes } from "@/lib/player-code";
import { PageHeader } from "@/components/page-header";
import { LeagueNav } from "@/components/league-nav";
import { PickChip } from "@/components/pick-chip";

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [races, picks] = await Promise.all([
    prisma.race.findMany({ where: { seasonYear: league.seasonYear }, orderBy: { round: "asc" } }),
    prisma.pick.findMany({
      where: { leagueId },
      include: { driver: true, constructor: true, score: true },
    }),
  ]);

  const now = new Date();
  const pickMap = new Map<string, Map<string, (typeof picks)[number]>>();
  for (const p of picks) {
    if (!pickMap.has(p.userId)) pickMap.set(p.userId, new Map());
    pickMap.get(p.userId)!.set(p.raceId, p);
  }

  // Running totals so the matrix doubles as a season graph.
  const running = new Map<string, number>(league.members.map((m) => [m.userId, 0]));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={league.name} title="Season history" description="Every pick, every round. Picks stay hidden until lights out." />
      <LeagueNav leagueId={leagueId} />

      <div className="pit-board overflow-x-auto fade-up">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-asphalt-950 text-left px-3 sm:px-4 py-3 t-eyebrow font-semibold border-b border-asphalt-700">
                Round
              </th>
              {league.members.map((m) => (
                <th key={m.userId} className="px-3 py-3 text-left min-w-[10rem] border-b border-asphalt-700">
                  <span className="t-code text-lg text-chalk">{codes.get(m.userId)}</span>
                  <span className="block text-xs text-chalk-dim font-normal truncate">
                    {m.user.name}
                    {m.userId === userId && <span className="ml-1 text-flag-yellow">· you</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {races.map((race) => {
              const locked = race.pickDeadline <= now;
              const cancelled = race.status === "cancelled";
              const scored = race.status === "completed";
              return (
                <tr
                  key={race.id}
                  className={`border-t border-asphalt-700 ${!locked || cancelled ? "text-chalk-faint" : ""}`}
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-asphalt-950 text-left px-3 sm:px-4 py-2.5 font-normal whitespace-nowrap"
                  >
                    <span className="t-num text-xs text-chalk-dim mr-2">R{String(race.round).padStart(2, "0")}</span>
                    <span className={`t-code text-base ${cancelled ? "line-through" : ""}`}>
                      {race.name.replace(" Grand Prix", "")}
                    </span>
                    {cancelled && <span className="ml-2 t-eyebrow">cancelled</span>}
                  </th>
                  {league.members.map((m) => {
                    const pick = pickMap.get(m.userId)?.get(race.id);
                    if (cancelled) {
                      return <td key={m.userId} className="px-3 py-2.5 text-chalk-faint">—</td>;
                    }
                    if (!locked) {
                      return (
                        <td key={m.userId} className="px-3 py-2.5 text-xs">
                          {pick && m.userId === userId ? (
                            <PickChip pick={pick} size="sm" />
                          ) : pick ? (
                            <span className="text-sector-green">Picked</span>
                          ) : (
                            <span className="text-chalk-faint">Waiting</span>
                          )}
                        </td>
                      );
                    }
                    const pts = pick?.score?.totalPoints ?? 0;
                    if (scored) running.set(m.userId, (running.get(m.userId) ?? 0) + pts);
                    return (
                      <td key={m.userId} className="px-3 py-2.5 align-top">
                        <div className="flex items-center justify-between gap-2">
                          <PickChip pick={pick} size="sm" />
                          {scored && pick && (
                            <span className="t-num text-right shrink-0">
                              <span className={`block font-bold ${pts > 0 ? "text-chalk" : "text-chalk-dim"}`}>+{pts}</span>
                              <span className="block text-[0.65rem] text-chalk-faint">{running.get(m.userId)}</span>
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
