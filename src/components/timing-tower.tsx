import type { StandingRow } from "@/lib/standings";
import { getTeamColor } from "@/lib/team-colors";

/**
 * League standings drawn like a broadcast timing tower: position, livery
 * stripe, three-letter code, gap to leader. The leader's position block goes
 * sector-purple — "fastest" — and last-round points show as a green delta.
 */
export function TimingTower({
  rows,
  currentUserId,
  lastRoundLabel,
}: {
  rows: StandingRow[];
  currentUserId: string;
  lastRoundLabel?: string | null;
}) {
  if (rows.length === 0) {
    return <p className="text-chalk-dim text-sm">No members yet.</p>;
  }

  return (
    <div className="pit-board">
      <div className="grid grid-cols-[3rem_1fr_auto_auto] sm:grid-cols-[3.5rem_1fr_6rem_5rem_5rem] items-center px-3 sm:px-4 py-2 border-b border-asphalt-700">
        <span className="t-eyebrow">Pos</span>
        <span className="t-eyebrow">Player</span>
        <span className="t-eyebrow text-right hidden sm:block">{lastRoundLabel ? `Last (${lastRoundLabel})` : "Last"}</span>
        <span className="t-eyebrow text-right">Points</span>
        <span className="t-eyebrow text-right">Gap</span>
      </div>
      <ol className="stagger">
        {rows.map((r) => {
          const isYou = r.userId === currentUserId;
          const leader = r.position === 1 && r.totalPoints > 0;
          const livery = r.liveryKey ? getTeamColor(r.liveryKey) : "var(--asphalt-500)";
          return (
            <li
              key={r.userId}
              className={`grid grid-cols-[3rem_1fr_auto_auto] sm:grid-cols-[3.5rem_1fr_6rem_5rem_5rem] items-center px-3 sm:px-4 py-2.5 border-t border-asphalt-700 ${
                isYou ? "bg-asphalt-800/70" : ""
              }`}
            >
              <span
                className={`t-display text-xl sm:text-2xl leading-none ${
                  leader ? "text-sector-purple" : "text-chalk"
                }`}
              >
                {r.position}
              </span>
              <span className="flex items-center gap-3 min-w-0 livery pl-3" style={{ ["--team" as string]: livery }}>
                <span className="t-code text-lg sm:text-xl text-chalk leading-none">{r.code}</span>
                <span className="min-w-0 truncate text-sm text-chalk-dim">
                  {r.name}
                  {isYou && <span className="ml-1.5 text-[0.65rem] t-eyebrow text-flag-yellow">you</span>}
                </span>
              </span>
              <span className="t-num text-right text-sm hidden sm:block">
                {r.lastRoundPoints === null ? (
                  <span className="text-chalk-faint">—</span>
                ) : (
                  <span className={r.lastRoundPoints > 0 ? "text-sector-green" : "text-chalk-dim"}>
                    +{r.lastRoundPoints}
                  </span>
                )}
              </span>
              <span className="t-num text-right font-bold text-base sm:text-lg text-chalk pl-3">{r.totalPoints}</span>
              <span className="t-num text-right text-sm text-chalk-dim pl-3 min-w-[3.5rem]">
                {leader ? <span className="text-sector-purple">Leader</span> : r.gap === 0 ? "+0" : `+${r.gap}`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
