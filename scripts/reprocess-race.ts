/**
 * Re-score one or more races against the live F1 APIs, regardless of status.
 *
 *   npx tsx --env-file=.env scripts/reprocess-race.ts 14 15
 *
 * Arguments are DB round numbers for the current season. Safe to re-run:
 * results and scores are upserted, race-control events are replaced.
 */
import { prisma } from "../src/lib/prisma";
import { processResults } from "../src/lib/process-results";
import { SEASON_YEAR } from "../src/types";

async function main() {
  const rounds = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n));
  if (rounds.length === 0) {
    console.error("Usage: npx tsx --env-file=.env scripts/reprocess-race.ts <round> [round...]");
    process.exit(1);
  }

  const races = await prisma.race.findMany({
    where: { seasonYear: SEASON_YEAR, round: { in: rounds } },
    orderBy: { round: "asc" },
  });
  if (races.length === 0) {
    console.error("No races found for rounds", rounds);
    process.exit(1);
  }

  for (const r of races) console.log(`Reprocessing R${r.round} ${r.name} (was: ${r.status})`);

  const summary = await processResults({
    raceIds: races.map((r) => r.id),
    force: true,
    silent: true,
  });
  console.log(JSON.stringify(summary, null, 2));

  for (const r of races) {
    const scores = await prisma.score.findMany({
      where: { raceId: r.id },
      include: { user: { select: { name: true } }, pick: { include: { driver: true, constructor: true } } },
      orderBy: { totalPoints: "desc" },
    });
    console.log(`\nR${r.round} ${r.name}:`);
    for (const s of scores) {
      const pick =
        s.pick.pickType === "race_control"
          ? "Race Control"
          : `${s.pick.driver?.code} + ${(s.pick.constructor as { name?: string } | null)?.name}`;
      console.log(`  ${s.user.name.padEnd(20)} ${pick.padEnd(24)} ${s.totalPoints} pts`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
