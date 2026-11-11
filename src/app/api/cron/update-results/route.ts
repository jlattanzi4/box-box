import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processResults } from "@/lib/process-results";
import { syncSchedule, type SchedulePlan } from "@/lib/schedule-sync";
import { SEASON_YEAR } from "@/types";

function authorised(req: Request) {
  const header = req.headers.get("authorization");
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

// Vercel cron: sync start times with the official calendar, then score every
// overdue race that is still "upcoming".
export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}

// Manual trigger. Optional JSON body:
//   { "raceIds": ["..."], "force": true }  — reprocess specific races even if
//   they are already marked completed/cancelled.
//   { "raceIds": ["..."], "allowMissingRaceControl": true }  — score a race
//   OpenF1 never published race-control data for.
export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { raceIds?: string[]; force?: boolean; allowMissingRaceControl?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body — fall through to the default run
  }
  return run(body);
}

async function run(opts: { raceIds?: string[]; force?: boolean; allowMissingRaceControl?: boolean } = {}) {
  // A Jolpica outage must not block scoring, so the sync fails on its own.
  let schedule: SchedulePlan | { error: string };
  try {
    schedule = await syncSchedule(prisma, SEASON_YEAR);
  } catch (error) {
    console.error("Schedule sync error:", error);
    schedule = { error: "Failed to sync schedule." };
  }

  try {
    const summary = await processResults(opts);
    return NextResponse.json({ ...summary, schedule });
  } catch (error) {
    console.error("Results processing error:", error);
    return NextResponse.json({ error: "Failed to process results." }, { status: 500 });
  }
}
