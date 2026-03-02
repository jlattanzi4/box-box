import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeamColor } from "@/lib/team-colors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RACE_CONTROL_POINTS } from "@/types";

const EVENT_COLORS: Record<string, string> = {
  red_flag: "bg-red-500/15 text-red-400 border-red-500/30",
  safety_car: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  vsc: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  dnf: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  wet: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  penalty: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: leagueId } = await params;

  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: session.user!.id } },
  });
  if (!member) redirect("/dashboard");

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!league) redirect("/dashboard");

  const completedRaces = await prisma.race.findMany({
    where: { seasonYear: league.seasonYear, status: "completed" },
    orderBy: { round: "desc" },
    include: {
      events: true,
    },
  });

  const scores = await prisma.score.findMany({
    where: { leagueId },
    include: {
      pick: {
        include: { driver: true, constructor: true },
      },
      user: { select: { id: true, name: true } },
      race: true,
    },
    orderBy: { race: { round: "desc" } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Race Results</h1>
        <Link href={`/leagues/${leagueId}`}>
          <Button variant="outline" className="border-border/50">
            Back to League
          </Button>
        </Link>
      </div>

      {completedRaces.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-black text-muted-foreground">?</span>
            </div>
            <p className="text-muted-foreground">
              No races have been completed yet. Results will appear here after
              each race.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 stagger-children">
          {completedRaces.map((race) => {
            const raceScores = scores
              .filter((s) => s.raceId === race.id)
              .sort((a, b) => b.totalPoints - a.totalPoints);

            // Get winner's constructor for the top accent
            const winnerPick = raceScores[0]?.pick;
            const winnerConstructor = winnerPick?.constructor as { jolpicaId?: string } | null;
            const topColor = winnerConstructor?.jolpicaId
              ? getTeamColor(winnerConstructor.jolpicaId)
              : null;

            return (
              <Card key={race.id} className="border-border/50 bg-card/50 overflow-hidden">
                {topColor && (
                  <div className="h-[2px]" style={{ backgroundColor: topColor }} />
                )}
                <CardHeader>
                  <CardDescription className="text-xs uppercase tracking-wider">
                    Round {race.round}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold">{race.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {race.events.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {race.events.map((e, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={`text-xs border ${EVENT_COLORS[e.eventType] ?? "bg-muted/50 text-muted-foreground"}`}
                        >
                          {e.eventType.replace("_", " ")} (+
                          {RACE_CONTROL_POINTS[
                            e.eventType as keyof typeof RACE_CONTROL_POINTS
                          ] ?? 0}
                          )
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30">
                        <TableHead>Player</TableHead>
                        <TableHead>Pick</TableHead>
                        <TableHead className="text-right">Driver</TableHead>
                        <TableHead className="text-right">Constructor</TableHead>
                        <TableHead className="text-right">RC</TableHead>
                        <TableHead className="text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {raceScores.map((s, i) => {
                        const pickConstructor = s.pick.constructor as { jolpicaId?: string; name?: string } | null;
                        const teamCol = pickConstructor?.jolpicaId
                          ? getTeamColor(pickConstructor.jolpicaId)
                          : null;

                        return (
                          <TableRow
                            key={s.id}
                            className={`border-border/20 ${i === 0 ? "bg-primary/5" : ""}`}
                          >
                            <TableCell className="font-semibold">
                              {s.user.name}
                              {s.userId === session.user!.id && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs border-primary/30 text-primary"
                                >
                                  You
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {s.pick.pickType === "race_control" ? (
                                <Badge className="bg-primary/10 text-primary border-primary/20">
                                  Race Control
                                </Badge>
                              ) : (
                                <span className="text-sm flex items-center gap-1.5">
                                  {teamCol && (
                                    <span
                                      className="inline-block w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: teamCol }}
                                    />
                                  )}
                                  {s.pick.driver?.code ?? "?"} +{" "}
                                  {pickConstructor?.name ?? "?"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {s.driverPoints}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {s.constructorPoints}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {s.raceControlPoints}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-lg tabular-nums">
                              {s.totalPoints}
                              <span className="text-xs text-muted-foreground ml-0.5 font-normal">pts</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {raceScores.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-8"
                          >
                            No picks were made for this race.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
