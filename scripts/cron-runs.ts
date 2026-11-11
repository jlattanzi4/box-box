/**
 * Show the most recent runs of the results job: when each ran, how it was
 * triggered, whether it succeeded, and what it did.
 *
 *   npx tsx --env-file=.env scripts/cron-runs.ts [count]
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const take = Number(process.argv[2]) || 10;
  const runs = await prisma.cronRun.findMany({ orderBy: { startedAt: "desc" }, take });
  if (runs.length === 0) console.log("No runs recorded yet.");
  for (const run of runs) {
    const seconds = ((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000).toFixed(1);
    console.log(`${run.startedAt.toISOString()}  ${run.trigger.padEnd(6)}  ${run.ok ? "ok    " : "FAILED"}  ${seconds}s`);
    console.log(`  ${JSON.stringify(run.summary)}`);
  }
}

main().finally(() => prisma.$disconnect());
