"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getTeamColor } from "@/lib/team-colors";
import { PageHeader } from "@/components/page-header";
import { LeagueNav } from "@/components/league-nav";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { PickChip } from "@/components/pick-chip";
import { MAX_CONSTRUCTOR_USES, MAX_RACE_CONTROL_PICKS, RACE_CONTROL_POINTS } from "@/types";

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

interface GridDriver {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  number: number;
  constructorId: string;
  constructorName: string;
  constructorJolpicaId: string;
}

interface GridConstructor {
  id: string;
  name: string;
  jolpicaId: string;
}

interface PickData {
  constraints: {
    usedDriverIds: string[];
    usedConstructorCounts: Record<string, number>;
    raceControlCount: number;
    canPickRaceControl: boolean;
  };
  currentPick: {
    pickType: "driver_constructor" | "race_control";
    driverId: string | null;
    constructorId: string | null;
  } | null;
  grid: { drivers: GridDriver[]; constructors: GridConstructor[] };
}

const EVENTS: { key: keyof typeof RACE_CONTROL_POINTS; label: string; color: string; stacks?: boolean }[] = [
  { key: "red_flag", label: "Red flag", color: "var(--kerb-red)" },
  { key: "safety_car", label: "Safety car", color: "var(--flag-yellow)" },
  { key: "vsc", label: "Virtual SC", color: "#f0b429" },
  { key: "wet", label: "Wet race", color: "var(--wet-blue)" },
  { key: "dnf", label: "Each DNF", color: "#ff7a3d", stacks: true },
  { key: "penalty", label: "Each penalty", color: "var(--chalk-dim)", stacks: true },
];

export default function PicksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRaceId = searchParams.get("raceId");

  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>(preselectedRaceId || "");
  const [data, setData] = useState<PickData | null>(null);
  const [pickType, setPickType] = useState<"driver_constructor" | "race_control">("driver_constructor");
  const [driverId, setDriverId] = useState("");
  const [constructorId, setConstructorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  // Races: default to the next race that's still open.
  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/races`)
      .then((r) => r.json())
      .then((list: Race[]) => {
        setRaces(list);
        if (!selectedRaceId && list.length > 0) {
          const now = new Date();
          const open = list.find((r) => r.status === "upcoming" && new Date(r.pickDeadline) > now);
          setSelectedRaceId(open?.id ?? list[list.length - 1].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [leagueId, selectedRaceId]);

  // Grid + constraints + your current pick for the chosen race.
  useEffect(() => {
    if (!selectedRaceId || !session?.user) return;
    fetch(`/api/picks?leagueId=${leagueId}&raceId=${selectedRaceId}`)
      .then((r) => r.json())
      .then((d: PickData) => {
        setData(d);
        if (d.currentPick) {
          setPickType(d.currentPick.pickType);
          setDriverId(d.currentPick.driverId ?? "");
          setConstructorId(d.currentPick.constructorId ?? "");
        } else {
          setPickType("driver_constructor");
          setDriverId("");
          setConstructorId("");
        }
      });
  }, [selectedRaceId, leagueId, session]);

  const selectedRace = races.find((r) => r.id === selectedRaceId);
  const isLocked = selectedRace ? new Date() >= new Date(selectedRace.pickDeadline) : false;

  const usedDrivers = useMemo(() => new Set(data?.constraints.usedDriverIds ?? []), [data]);
  const usesLeft = (cId: string) => MAX_CONSTRUCTOR_USES - (data?.constraints.usedConstructorCounts[cId] ?? 0);

  const selectedDriver = data?.grid.drivers.find((d) => d.id === driverId) ?? null;
  const selectedConstructor = data?.grid.constructors.find((c) => c.id === constructorId) ?? null;
  const isValid = pickType === "race_control" || (!!driverId && !!constructorId);
  const isDirty =
    !data?.currentPick ||
    data.currentPick.pickType !== pickType ||
    (pickType === "driver_constructor" &&
      (data.currentPick.driverId !== driverId || data.currentPick.constructorId !== constructorId));

  const rcLeft = MAX_RACE_CONTROL_PICKS - (data?.constraints.raceControlCount ?? 0);
  const driversLeft = (data?.grid.drivers.length ?? 0) - usedDrivers.size;

  async function submit() {
    if (!isValid || isLocked) return;
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
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(body.error || "Pick didn't save. Try again.");
      return;
    }
    toast.success(data?.currentPick ? "Pick updated" : "Pick locked in");
    router.push(`/leagues/${leagueId}`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64 bg-asphalt-700" />
        <Skeleton className="h-10 w-full bg-asphalt-700" />
        <Skeleton className="h-64 rounded-xl bg-asphalt-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        eyebrow={selectedRace ? `Round ${selectedRace.round} · ${selectedRace.circuitName}` : "Pick"}
        title={selectedRace ? selectedRace.name.replace(" Grand Prix", " GP") : "Make your pick"}
      />

      <LeagueNav leagueId={leagueId} />

      {/* Race chooser + deadline */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 fade-up">
        <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
          <SelectTrigger className="sm:w-72 h-10 bg-asphalt-800 border-asphalt-600 t-code text-base">
            <SelectValue placeholder="Choose a race" />
          </SelectTrigger>
          <SelectContent className="bg-asphalt-700 border-asphalt-500">
            {races.map((race) => (
              <SelectItem key={race.id} value={race.id} className="t-code text-base">
                R{race.round} · {race.name.replace(" Grand Prix", " GP")}
                {race.status !== "upcoming" ? ` · ${race.status}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRace && !isLocked && (
          <p className="text-sm text-chalk-dim">
            Locks in{" "}
            <Countdown to={selectedRace.pickDeadline} className="t-num font-bold text-chalk" />
            {" · "}
            <LocalTime iso={selectedRace.pickDeadline} style="short" />
          </p>
        )}
      </div>

      {isLocked && selectedRace && (
        <div className="pit-board fade-up">
          <div className="kerb" />
          <div className="pit-board-row">
            <span className="t-eyebrow">Round {selectedRace.round}</span>
            <span className="pit-board-value text-3xl sm:text-4xl text-kerb">Picks locked</span>
          </div>
          <div className="pit-board-row items-center">
            <span className="t-eyebrow">Your pick</span>
            {data?.currentPick ? (
              <PickChip
                pick={{
                  pickType: data.currentPick.pickType,
                  driver: selectedDriver,
                  constructor: selectedConstructor,
                }}
                size="lg"
                showName
              />
            ) : (
              <span className="text-chalk-dim italic">No pick was made</span>
            )}
          </div>
        </div>
      )}

      {!isLocked && data && (
        <>
          {/* Mode */}
          <div className="grid grid-cols-2 gap-2 fade-up" role="tablist" aria-label="Pick type">
            <button
              type="button"
              role="tab"
              aria-selected={pickType === "driver_constructor"}
              onClick={() => setPickType("driver_constructor")}
              className={`h-12 rounded-lg border t-code text-lg transition-colors ${
                pickType === "driver_constructor"
                  ? "bg-chalk text-asphalt-950 border-chalk"
                  : "bg-asphalt-800 text-chalk-dim border-asphalt-600 hover:text-chalk"
              }`}
            >
              Driver + Team
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pickType === "race_control"}
              disabled={!data.constraints.canPickRaceControl && pickType !== "race_control"}
              onClick={() => setPickType("race_control")}
              className={`h-12 rounded-lg border t-code text-lg transition-colors disabled:opacity-40 ${
                pickType === "race_control"
                  ? "bg-flag-yellow text-asphalt-950 border-flag-yellow"
                  : "bg-asphalt-800 text-chalk-dim border-asphalt-600 hover:text-chalk"
              }`}
            >
              Race Control
              <span className="ml-2 t-num text-xs font-normal opacity-70">{rcLeft} left</span>
            </button>
          </div>

          {pickType === "driver_constructor" ? (
            <>
              <section className="space-y-3 fade-up" aria-labelledby="driver-heading">
                <div className="flex items-baseline justify-between">
                  <h2 id="driver-heading" className="t-code text-xl text-chalk">Driver</h2>
                  <span className="t-eyebrow">{driversLeft} left this season</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.grid.drivers.map((d) => {
                    const used = usedDrivers.has(d.id);
                    const active = driverId === d.id;
                    const color = getTeamColor(d.constructorJolpicaId);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={used}
                        aria-pressed={active}
                        onClick={() => setDriverId(active ? "" : d.id)}
                        className={`relative flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors livery ${
                          active
                            ? "border-chalk bg-asphalt-700"
                            : "border-asphalt-600 bg-asphalt-800 hover:border-asphalt-500"
                        } disabled:opacity-35 disabled:cursor-not-allowed`}
                        style={{ ["--team" as string]: color }}
                      >
                        <span
                          className="t-code text-lg w-11 h-9 inline-flex items-center justify-center rounded text-white shrink-0"
                          style={{ backgroundColor: active ? color : "var(--asphalt-950)", color: active ? "#fff" : color }}
                        >
                          {d.code}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-semibold truncate ${used ? "line-through" : ""}`}>
                            {d.firstName} {d.lastName}
                          </span>
                          <span className="block text-xs text-chalk-dim truncate">{used ? "Used" : d.constructorName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3 fade-up" aria-labelledby="team-heading">
                <div className="flex items-baseline justify-between">
                  <h2 id="team-heading" className="t-code text-xl text-chalk">Constructor</h2>
                  <span className="t-eyebrow">Two uses each</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.grid.constructors.map((c) => {
                    const left = usesLeft(c.id);
                    const active = constructorId === c.id;
                    const color = getTeamColor(c.jolpicaId);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={left <= 0}
                        aria-pressed={active}
                        onClick={() => setConstructorId(active ? "" : c.id)}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors livery ${
                          active
                            ? "border-chalk bg-asphalt-700"
                            : "border-asphalt-600 bg-asphalt-800 hover:border-asphalt-500"
                        } disabled:opacity-35 disabled:cursor-not-allowed`}
                        style={{ ["--team" as string]: color }}
                      >
                        <span className={`text-sm font-semibold ${left <= 0 ? "line-through" : ""}`}>{c.name}</span>
                        <span className="flex gap-1" aria-label={`${left} uses left`}>
                          {Array.from({ length: MAX_CONSTRUCTOR_USES }).map((_, i) => (
                            <span
                              key={i}
                              className="size-2.5 rounded-full border"
                              style={{
                                borderColor: color,
                                backgroundColor: i < left ? color : "transparent",
                              }}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section className="pit-board fade-up" aria-labelledby="rc-heading">
              <div className="p-5 border-b border-asphalt-700">
                <h2 id="rc-heading" className="t-display text-3xl text-flag-yellow">Bet on chaos</h2>
                <p className="mt-2 text-sm text-chalk-dim max-w-prose">
                  Skip the driver. You score every incident the marshals log during the race. Street
                  circuits and rain are your friends.
                </p>
              </div>
              <ul>
                {EVENTS.map((e) => (
                  <li key={e.key} className="pit-board-row items-center">
                    <span className="flex items-center gap-3">
                      <span className="size-3 rounded-sm" style={{ backgroundColor: e.color }} />
                      <span className="text-sm">{e.label}</span>
                      {e.stacks && <span className="t-eyebrow">stacks</span>}
                    </span>
                    <span className="pit-board-value text-2xl t-num">+{RACE_CONTROL_POINTS[e.key]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sticky confirm bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-asphalt-600 bg-asphalt-900/95 backdrop-blur-md">
            <div className="kerb-thin" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                {pickType === "race_control" ? (
                  <PickChip pick={{ pickType: "race_control" }} />
                ) : selectedDriver || selectedConstructor ? (
                  <PickChip
                    pick={{
                      pickType: "driver_constructor",
                      driver: selectedDriver ?? { code: "?" },
                      constructor: selectedConstructor ?? {
                        name: "Pick a team",
                        jolpicaId: selectedDriver?.constructorJolpicaId,
                      },
                    }}
                  />
                ) : (
                  <span className="text-sm text-chalk-dim">Choose a driver and a constructor</span>
                )}
              </div>
              <Button
                size="lg"
                variant={isValid ? "board" : "secondary"}
                disabled={!isValid || submitting || !isDirty}
                onClick={submit}
              >
                {submitting ? "Saving…" : data.currentPick ? (isDirty ? "Update pick" : "Saved") : "Lock it in"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
