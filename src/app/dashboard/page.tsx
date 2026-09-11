"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { Countdown } from "@/components/countdown";

interface League {
  id: string;
  name: string;
  inviteCode: string;
  seasonYear: number;
  role: string;
  memberCount: number;
  position: number | null;
  totalPoints: number;
  gap: number;
  leaderCode: string | null;
  leaderName: string | null;
  hasPickForNextRace: boolean;
}

interface NextRace {
  id: string;
  round: number;
  name: string;
  raceDate: string;
  pickDeadline: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [nextRace, setNextRace] = useState<NextRace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/leagues")
      .then((r) => r.json())
      .then((data) => {
        setLeagues(data.leagues ?? []);
        setNextRace(data.nextRace ?? null);
      })
      .finally(() => setLoading(false));
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-64 bg-asphalt-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl bg-asphalt-700" />
          <Skeleton className="h-40 rounded-xl bg-asphalt-700" />
        </div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const needsPick = leagues.filter((l) => !l.hasPickForNextRace);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Your leagues"
        actions={
          <>
            <Button asChild>
              <Link href="/leagues/create">Create league</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/leagues/join">Join with code</Link>
            </Button>
          </>
        }
      />

      {nextRace && leagues.length > 0 && (
        <div className="pit-board fade-up">
          <div className="pit-board-row">
            <span>
              <span className="t-eyebrow block">Next up · Round {nextRace.round}</span>
              <span className="t-code text-xl text-chalk">{nextRace.name.replace(" Grand Prix", " GP")}</span>
            </span>
            <span className="text-right">
              <span className="t-eyebrow block">Lights out in</span>
              <Countdown to={nextRace.raceDate} className="pit-board-value text-3xl sm:text-4xl t-num" />
            </span>
          </div>
          <div className="pit-board-row items-center">
            <span className="text-sm text-chalk-dim">
              {needsPick.length === 0
                ? "You've picked in every league. Nothing to do but wait."
                : `${needsPick.length === 1 ? "One league is" : `${needsPick.length} leagues are`} still waiting on your pick.`}
            </span>
            {needsPick.length > 0 && (
              <Button asChild size="sm" variant="board">
                <Link href={`/leagues/${needsPick[0].id}/picks`}>Pick now</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="pit-board fade-up">
          <div className="kerb" />
          <div className="p-8 sm:p-12 text-center space-y-4">
            <p className="t-display text-4xl text-chalk">No leagues yet</p>
            <p className="text-chalk-dim max-w-sm mx-auto">
              Start one and send the invite code to the group chat, or join one a friend already made.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild>
                <Link href="/leagues/create">Create league</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/leagues/join">Join with code</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {leagues.map((league) => {
            const leading = league.position === 1 && league.totalPoints > 0;
            return (
              <li key={league.id}>
                <Link
                  href={`/leagues/${league.id}`}
                  className="group block panel hover:border-asphalt-500 transition-colors overflow-hidden"
                >
                  <div className="flex items-stretch">
                    <div
                      className={`w-20 sm:w-24 shrink-0 flex flex-col items-center justify-center border-r border-asphalt-600 ${
                        leading ? "bg-sector-purple/15" : "bg-asphalt-950"
                      }`}
                    >
                      <span className="t-eyebrow">Pos</span>
                      <span className={`t-display text-5xl ${leading ? "text-sector-purple" : "text-chalk"}`}>
                        {league.position ?? "–"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="t-code text-2xl text-chalk truncate group-hover:text-flag-yellow transition-colors">
                          {league.name}
                        </h2>
                        <span className="t-eyebrow shrink-0 pt-1">
                          {league.memberCount} {league.memberCount === 1 ? "player" : "players"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-4 t-num">
                        <span className="text-2xl font-bold text-chalk">
                          {league.totalPoints}
                          <span className="text-xs text-chalk-dim font-normal ml-1">pts</span>
                        </span>
                        <span className="text-sm text-chalk-dim">
                          {leading
                            ? "Leading"
                            : league.leaderCode
                              ? `+${league.gap} to ${league.leaderCode}`
                              : ""}
                        </span>
                      </div>
                      {nextRace && (
                        <p className="mt-3 text-xs">
                          {league.hasPickForNextRace ? (
                            <span className="text-sector-green">Pick made for R{nextRace.round}</span>
                          ) : (
                            <span className="text-flag-yellow">Pick needed for R{nextRace.round}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
