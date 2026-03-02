"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface League {
  id: string;
  name: string;
  inviteCode: string;
  seasonYear: number;
  role: string;
  memberCount: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/leagues")
        .then((r) => r.json())
        .then((data) => {
          setLeagues(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/leagues/create">
            <Button className="font-semibold">Create League</Button>
          </Link>
          <Link href="/leagues/join">
            <Button variant="outline" className="border-border/50">
              Join League
            </Button>
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <Card className="border-border/50 bg-card/50 bg-dot-pattern">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-[0_0_25px_-5px_var(--f1-red)]">
              <span className="text-2xl font-black text-primary">BB</span>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">No leagues yet</p>
              <p className="text-muted-foreground max-w-sm">
                Create a new league and invite your friends, or join an existing
                one with an invite code.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/leagues/create">
                <Button className="font-semibold">Create a League</Button>
              </Link>
              <Link href="/leagues/join">
                <Button variant="outline" className="border-border/50">
                  Join with Code
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_var(--f1-red)] transition-all duration-300 cursor-pointer group overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF8700] via-[#E80020] to-[#3671C6] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                      {league.name}
                    </CardTitle>
                    <Badge
                      variant={league.role === "admin" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {league.role}
                    </Badge>
                  </div>
                  <CardDescription>
                    {league.memberCount} member
                    {league.memberCount !== 1 ? "s" : ""} &middot;{" "}
                    {league.seasonYear} Season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Invite:</span>
                    <code className="text-sm font-mono font-semibold bg-muted/50 px-2 py-0.5 rounded">
                      {league.inviteCode}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
