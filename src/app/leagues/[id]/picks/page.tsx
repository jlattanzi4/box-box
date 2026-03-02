"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getTeamColor } from "@/lib/team-colors";

interface Race {
  id: string;
  round: number;
  name: string;
  circuitName: string;
  country: string;
  raceDate: string;
  pickDeadline: string;
  status: string;
}

interface DriverOption {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  constructorId: string;
  constructorName: string;
  constructorJolpicaId: string;
}

interface ConstructorOption {
  id: string;
  name: string;
  usesLeft: number;
}

interface Constraints {
  remainingDrivers: DriverOption[];
  remainingConstructors: ConstructorOption[];
  canPickRaceControl: boolean;
  raceControlCount: number;
}

export default function PicksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRaceId = searchParams.get("raceId");

  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>(
    preselectedRaceId || ""
  );
  const [constraints, setConstraints] = useState<Constraints | null>(null);
  const [pickType, setPickType] = useState<"driver_constructor" | "race_control">(
    "driver_constructor"
  );
  const [driverId, setDriverId] = useState("");
  const [constructorId, setConstructorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  // Fetch races
  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/races`)
      .then((r) => r.json())
      .then((data) => {
        setRaces(data);
        if (!selectedRaceId && data.length > 0) {
          const now = new Date();
          const upcoming = data
            .filter((r: Race) => r.status === "upcoming")
            .sort((a: Race, b: Race) => {
              const dateA = new Date(a.raceDate).getTime();
              const dateB = new Date(b.raceDate).getTime();
              return dateA - dateB;
            });

          if (upcoming.length > 0) {
            const nextOpen = upcoming.find(
              (r: Race) => new Date(r.pickDeadline) > now
            );
            setSelectedRaceId(nextOpen?.id || upcoming[0].id);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [leagueId, selectedRaceId]);

  // Fetch constraints when race changes
  useEffect(() => {
    if (!selectedRaceId || !session?.user) return;

    fetch(`/api/picks?leagueId=${leagueId}&raceId=${selectedRaceId}`)
      .then((r) => r.json())
      .then((data) => {
        setConstraints(data.constraints);
        if (data.currentPick) {
          setPickType(data.currentPick.pickType);
          setDriverId(data.currentPick.driverId || "");
          setConstructorId(data.currentPick.constructorId || "");
        } else {
          setPickType("driver_constructor");
          setDriverId("");
          setConstructorId("");
        }
      });
  }, [selectedRaceId, leagueId, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leagueId,
        raceId: selectedRaceId,
        pickType,
        ...(pickType === "driver_constructor" ? { driverId, constructorId } : {}),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(data.error || "Failed to submit pick.");
      return;
    }

    toast.success("Pick submitted!");
    router.push(`/leagues/${leagueId}`);
  }

  const selectedRace = races.find((r) => r.id === selectedRaceId);
  const isLocked = selectedRace
    ? new Date() >= new Date(selectedRace.pickDeadline)
    : false;

  // Get team color for selected driver
  const selectedDriver = constraints?.remainingDrivers.find((d) => d.id === driverId);
  const selectedTeamColor = selectedDriver
    ? getTeamColor(selectedDriver.constructorJolpicaId)
    : null;

  const isFormValid =
    pickType === "race_control" || (driverId && constructorId);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Make Your Pick</h1>
        <Button
          variant="outline"
          className="border-border/50"
          onClick={() => router.push(`/leagues/${leagueId}`)}
        >
          Back
        </Button>
      </div>

      {/* Race Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Select Race</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a race" />
            </SelectTrigger>
            <SelectContent>
              {races.map((race) => (
                <SelectItem key={race.id} value={race.id}>
                  R{race.round}: {race.name}{" "}
                  {race.status === "completed" ? "(completed)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRace && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedRace.circuitName} &middot; {selectedRace.country}
              </p>
              <p className="text-xs text-muted-foreground">
                Deadline:{" "}
                {new Date(selectedRace.pickDeadline).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLocked && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive font-medium text-center">
              Picks are locked for this race. The deadline has passed.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLocked && constraints && selectedRaceId && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pick Type */}
          <Card className="border-border/50 bg-card/50 overflow-hidden relative">
            {pickType === "driver_constructor" && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF8700] via-[#E80020] to-[#3671C6]" />
            )}
            {pickType === "race_control" && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
            )}
            <CardHeader>
              <CardTitle className="text-lg font-bold">Pick Type</CardTitle>
              <CardDescription>
                Choose a driver + constructor, or Race Control
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant={
                  pickType === "driver_constructor" ? "default" : "outline"
                }
                onClick={() => setPickType("driver_constructor")}
                className={`flex-1 font-semibold ${
                  pickType !== "driver_constructor" ? "border-border/50" : ""
                }`}
              >
                Driver + Constructor
              </Button>
              <Button
                type="button"
                variant={pickType === "race_control" ? "default" : "outline"}
                onClick={() => setPickType("race_control")}
                disabled={!constraints.canPickRaceControl}
                className={`flex-1 font-semibold ${
                  pickType !== "race_control" ? "border-border/50" : ""
                }`}
              >
                Race Control
                <Badge variant="secondary" className="ml-2">
                  {2 - constraints.raceControlCount} left
                </Badge>
              </Button>
            </CardContent>
          </Card>

          {pickType === "driver_constructor" ? (
            <>
              {/* Driver Select */}
              <Card
                className="border-border/50 bg-card/50 overflow-hidden transition-all duration-300"
                style={
                  selectedTeamColor
                    ? {
                        borderColor: `color-mix(in oklch, ${selectedTeamColor} 30%, transparent)`,
                        boxShadow: `0 0 20px -8px ${selectedTeamColor}`,
                      }
                    : undefined
                }
              >
                {selectedTeamColor && (
                  <div
                    className="h-[2px]"
                    style={{ backgroundColor: selectedTeamColor }}
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Driver</CardTitle>
                  <CardDescription>
                    {constraints.remainingDrivers.length} drivers remaining this season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {constraints.remainingDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getTeamColor(d.constructorJolpicaId) }}
                            />
                            {d.firstName} {d.lastName}
                            <span className="text-muted-foreground font-mono text-xs">
                              {d.code}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Constructor Select */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Constructor</CardTitle>
                  <CardDescription>
                    Each constructor can be used twice per season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={constructorId}
                    onValueChange={setConstructorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a constructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {constraints.remainingConstructors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-6 h-1 rounded-full shrink-0"
                              style={{ backgroundColor: getTeamColor(c.name) }}
                            />
                            {c.name}
                            <span className="text-muted-foreground text-xs">
                              ({c.usesLeft} use{c.usesLeft !== 1 ? "s" : ""} left)
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-8">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto shadow-[0_0_20px_-5px_var(--f1-red)]">
                    <span className="text-xl font-black text-primary">RC</span>
                  </div>
                  <p className="text-lg font-bold">Race Control</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    You&apos;ll earn points based on race events: Red Flags
                    (15 pts), Safety Cars (5 pts), VSCs (3 pts), DNFs (2 pts
                    each), Wet Race (5 pts), Penalties (1 pt each).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            className={`w-full font-semibold text-base py-6 transition-shadow duration-300 ${
              isFormValid ? "hover:shadow-[0_0_25px_-5px_var(--f1-red)]" : ""
            }`}
            disabled={
              submitting ||
              (pickType === "driver_constructor" &&
                (!driverId || !constructorId))
            }
          >
            {submitting ? "Submitting..." : "Submit Pick"}
          </Button>
        </form>
      )}
    </div>
  );
}
