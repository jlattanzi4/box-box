import { getTeamColor } from "@/lib/team-colors";

export interface PickLike {
  pickType: string;
  driver?: { code: string; firstName?: string; lastName?: string } | null;
  constructor?: { name: string; jolpicaId?: string } | null;
}

/**
 * One consistent way to render a pick everywhere: a team-coloured number
 * panel with the driver code, plus the constructor name. Race Control is a
 * yellow-on-black marshal panel.
 */
export function PickChip({
  pick,
  size = "md",
  showName = false,
}: {
  pick: PickLike | null | undefined;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const panel =
    size === "lg" ? "h-12 min-w-14 px-2 text-xl" : size === "sm" ? "h-7 min-w-9 px-1.5 text-xs" : "h-9 min-w-11 px-2 text-sm";
  const text = size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm";

  if (!pick) {
    return (
      <span className={`inline-flex items-center gap-2 ${text} text-chalk-faint italic`}>
        <span className={`${panel} inline-flex items-center justify-center rounded border border-dashed border-asphalt-500 t-code text-chalk-faint`}>
          —
        </span>
        No pick
      </span>
    );
  }

  if (pick.pickType === "race_control") {
    return (
      <span className={`inline-flex items-center gap-2 ${text}`}>
        <span className={`${panel} inline-flex items-center justify-center rounded bg-flag-yellow text-asphalt-950 t-code`}>
          RC
        </span>
        <span className="font-semibold">Race Control</span>
      </span>
    );
  }

  const color = getTeamColor(pick.constructor?.jolpicaId ?? pick.constructor?.name);
  const constructorName = pick.constructor?.name ?? "?";

  return (
    <span className={`inline-flex items-center gap-2 ${text}`}>
      <span
        className={`${panel} inline-flex items-center justify-center rounded t-code text-white`}
        style={{ backgroundColor: color, textShadow: "0 1px 0 rgba(0,0,0,0.35)" }}
      >
        {pick.driver?.code ?? "?"}
      </span>
      <span className="leading-tight">
        {showName && pick.driver?.lastName && (
          <span className="block font-semibold">
            {pick.driver.firstName} {pick.driver.lastName}
          </span>
        )}
        <span className={showName ? "block text-chalk-dim" : "font-semibold"}>{constructorName}</span>
      </span>
    </span>
  );
}
