import { NextResponse } from "next/server";
import { processResults } from "@/lib/process-results";

function authorised(req: Request) {
  const header = req.headers.get("authorization");
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

// Vercel cron: score every overdue race that is still "upcoming".
export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}

// Manual trigger. Optional JSON body:
//   { "raceIds": ["..."], "force": true }  — reprocess specific races even if
//   they are already marked completed/cancelled.
export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { raceIds?: string[]; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body — fall through to the default run
  }
  return run(body);
}

async function run(opts: { raceIds?: string[]; force?: boolean } = {}) {
  try {
    const summary = await processResults(opts);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Results processing error:", error);
    return NextResponse.json({ error: "Failed to process results." }, { status: 500 });
  }
}
