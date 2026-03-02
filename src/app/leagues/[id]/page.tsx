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

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!league) redirect("/dashboard");

  const isMember = league.members.some((m) => m.userId === session.user!.id);
  if (!isMember) redirect("/dashboard");

  // Get standings: total points per member
  const scores = await prisma.score.groupBy({
    by: ["userId"],
    where: { leagueId: id },
    _sum: { totalPoints: true },
  });

  const scoreMap = new Map(
    scores.map((s) => [s.userId, s._sum.totalPoints ?? 0])
  );

  const standings = league.members
    .map((m) => ({
      userId: m.userId,
      name: m.user.name,
      role: m.role,
      totalPoints: scoreMap.get(m.userId) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Get next upcoming race
  const nextRace = await prisma.race.findFirst({
    where: { seasonYear: league.seasonYear, status: "upcoming" },
    orderBy: { round: "asc" },
  });

  // Get current user's pick for the next race
  const currentPickRaw = nextRace
    ? await prisma.pick.findUnique({
        where: {
          leagueId_userId_raceId: {
            leagueId: id,
            userId: session.user!.id,
            raceId: nextRace.id,
          },
        },
        include: { driver: true, constructor: true },
      })
    : null;

  // Extract constructor separately to avoid JS reserved word conflict
  const currentPick = currentPickRaw
    ? {
        ...currentPickRaw,
        pickDriver: currentPickRaw.driver,
        pickConstructor: currentPickRaw.constructor as { id: string; name: string; jolpicaId: string; code: string } | null,
      }
    : null;

  // Get completed races count
  const completedRaces = await prisma.race.count({
    where: { seasonYear: league.seasonYear, status: "completed" },
  });

  const totalRaces = await prisma.race.count({
    where: { seasonYear: league.seasonYear },
  });

  const deadlinePassed = nextRace
    ? new Date() >= new Date(nextRace.pickDeadline)
    : false;

  const teamColor = currentPick?.pickConstructor
    ? getTeamColor(currentPick.pickConstructor.jolpicaId)
    : null;

  const positionColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{league.name}</h1>
          <p className="text-muted-foreground mt-1">
            {league.seasonYear} Season &middot; {completedRaces}/{totalRaces}{" "}
            races completed
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/leagues/${id}/picks`}>
            <Button className="font-semibold">Make Picks</Button>
          </Link>
          <Link href={`/leagues/${id}/results`}>
            <Button variant="outline" className="border-border/50">Results</Button>
          </Link>
          <Link href={`/leagues/${id}/history`}>
            <Button variant="outline" className="border-border/50">History</Button>
          </Link>
        </div>
      </div>

      {/* Invite Code */}
      <Card className="border-border/50 bg-card/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF8700] via-[#E80020] via-[#3671C6] via-[#27F4D2] to-[#FF87BC]" />
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Invite Code
            </p>
            <code className="text-2xl font-mono font-black tracking-[0.2em]">
              {league.inviteCode}
            </code>
          </div>
          <Badge variant="secondary" className="text-sm">
            {league.members.length} member
            {league.members.length !== 1 ? "s" : ""}
          </Badge>
        </CardContent>
      </Card>

      {/* Next Race + Current Pick */}
      {nextRace && (
        <Card className="border-border/50 bg-card/50 overflow-hidden">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wider">
              <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                Next Race &middot; Round {nextRace.round}
              </span>
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {nextRace.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {nextRace.circuitName} &middot; {nextRace.country}
                <br />
                <span className="text-foreground/70">
                  {new Date(nextRace.raceDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {!deadlinePassed && (
                <Link href={`/leagues/${id}/picks?raceId=${nextRace.id}`}>
                  <Button size="sm" className="font-semibold">
                    {currentPick ? "Change Pick" : "Pick Now"}
                  </Button>
                </Link>
              )}
            </div>

            {/* Current Pick Display */}
            {currentPick ? (
              <div
                className="rounded-xl border p-4 team-border-l"
                style={{
                  "--team-color": teamColor,
                  borderColor: `color-mix(in oklch, ${teamColor} 30%, transparent)`,
                  backgroundColor: `color-mix(in oklch, ${teamColor} 5%, transparent)`,
                  boxShadow: `0 0 25px -8px ${teamColor}`,
                } as React.CSSProperties}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Your Pick
                </p>
                {currentPick.pickType === "race_control" ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">RC</span>
                    </div>
                    <div>
                      <p className="font-bold">Race Control</p>
                      <p className="text-xs text-muted-foreground">
                        Scoring from race events
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center border"
                        style={{
                          borderColor: `color-mix(in oklch, ${teamColor} 40%, transparent)`,
                          backgroundColor: `color-mix(in oklch, ${teamColor} 10%, transparent)`,
                        }}
                      >
                        <span className="text-sm font-bold font-mono" style={{ color: teamColor ?? undefined }}>
                          {currentPick.pickDriver?.code}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {currentPick.pickDriver?.firstName} {currentPick.pickDriver?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">Driver</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground font-bold">+</span>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center border"
                        style={{
                          borderColor: `color-mix(in oklch, ${teamColor} 40%, transparent)`,
                          backgroundColor: `color-mix(in oklch, ${teamColor} 10%, transparent)`,
                        }}
                      >
                        <span className="text-xs font-bold" style={{ color: teamColor ?? undefined }}>
                          {currentPick.pickConstructor?.name?.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {currentPick.pickConstructor?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Constructor</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : !deadlinePassed ? (
              <div className="rounded-xl border border-dashed border-border/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t made a pick yet.{" "}
                  <Link
                    href={`/leagues/${id}/picks?raceId=${nextRace.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Make your pick
                  </Link>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                <p className="text-sm text-destructive">
                  Picks are locked. The deadline has passed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Standings */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((s, i) => (
                <TableRow
                  key={s.userId}
                  className={`border-border/20 ${i === 0 && s.totalPoints > 0 ? "bg-primary/5" : ""}`}
                >
                  <TableCell>
                    {i < 3 && s.totalPoints > 0 ? (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${positionColors[i]} 15%, transparent)`,
                          color: positionColors[i],
                        }}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="font-black text-lg text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {s.name}
                    {s.userId === session.user!.id && (
                      <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-lg tabular-nums">
                    {s.totalPoints}
                    <span className="text-xs text-muted-foreground ml-1 font-normal">pts</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
