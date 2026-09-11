"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

function format(iso: string, style: "full" | "short", tz?: string) {
  const d = new Date(iso);
  if (style === "short") {
    return d.toLocaleString("en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) + (tz ? " UTC" : "");
  }
  return d.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: tz ? undefined : "short",
  }) + (tz ? " UTC" : "");
}

/** Renders an ISO timestamp in the viewer's own timezone; the server renders UTC. */
export function LocalTime({ iso, className = "", style = "full" }: { iso: string; className?: string; style?: "full" | "short" }) {
  const text = useSyncExternalStore(
    noop,
    () => format(iso, style),
    () => format(iso, style, "UTC")
  );
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
