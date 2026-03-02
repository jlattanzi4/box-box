import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeamColor } from "@/lib/team-colors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

export default async function HistoryPage({
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

  const races = await prisma.race.findMany({
    where: { seasonYear: league.seasonYear },
    orderBy: { round: "asc" },
  });

  const picks = await prisma.pick.findMany({
    where: { leagueId },
    include: {
      driver: true,
      constructor: true,
      score: true,
    },
  });

  const pickMap = new Map<string, Map<string, (typeof picks)[0]>>();
  for (const pick of picks) {
    if (!pickMap.has(pick.userId)) pickMap.set(pick.userId, new Map());
    pickMap.get(pick.userId)!.set(pick.raceId, pick);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">
          Season Pick History
        </h1>
        <Link href={`/leagues/${leagueId}`}>
          <Button variant="outline" className="border-border/50">
            Back to League
          </Button>
        </Link>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold">All Picks by Race</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="sticky left-0 bg-card/90 backdrop-blur z-10">
                  Race
                </TableHead>
                {league.members.map((m) => (
                  <TableHead
                    key={m.userId}
                    className="text-center min-w-[140px]"
                  >
                    {m.user.name}
                    {m.userId === session.user!.id && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-xs border-primary/30 text-primary"
                      >
                        You
                      </Badge>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {races.map((race) => (
                <TableRow
                  key={race.id}
                  className={`border-border/20 ${race.status === "upcoming" ? "opacity-50" : ""}`}
                >
                  <TableCell className="sticky left-0 bg-card/90 backdrop-blur z-10 font-medium whitespace-nowrap">
                    <span className="text-muted-foreground font-mono text-xs mr-2">
                      R{race.round}
                    </span>
                    {race.name.replace(" Grand Prix", " GP")}
                  </TableCell>
                  {league.members.map((m) => {
                    const pick = pickMap.get(m.userId)?.get(race.id);
                    if (!pick) {
                      return (
                        <TableCell
                          key={m.userId}
                          className="text-center text-muted-foreground text-sm"
                        >
                          {race.status === "upcoming" ? "\u2014" : "No pick"}
                        </TableCell>
                      );
                    }

                    const pickConstructor = pick.constructor as { jolpicaId?: string; name?: string } | null;
                    const teamCol = pickConstructor?.jolpicaId
                      ? getTeamColor(pickConstructor.jolpicaId)
                      : null;

                    return (
                      <TableCell key={m.userId} className="text-center">
                        <div className="text-sm">
                          {pick.pickType === "race_control" ? (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-primary/10 text-primary"
                            >
                              RC
                            </Badge>
                          ) : (
                            <span className="font-mono inline-flex items-center gap-1.5">
                              {teamCol && (
                                <span
                                  className="inline-block w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: teamCol }}
                                />
                              )}
                              {pick.driver?.code} + {pickConstructor?.name}
                            </span>
                          )}
                        </div>
                        {pick.score && (
                          <div className={`text-xs font-mono font-bold mt-0.5 ${pick.score.totalPoints > 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {pick.score.totalPoints} pts
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
