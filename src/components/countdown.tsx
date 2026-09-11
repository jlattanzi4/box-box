"use client";

import { useSyncExternalStore } from "react";

// One shared 1s ticker for every countdown on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getNow = () => Math.floor(Date.now() / 1000);
const getServerNow = () => null;

function parts(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { d, h, m, s };
}

const Unit = ({ children }: { children: string }) => (
  <span className="text-[0.55em] opacity-70 mr-[0.25em] last:mr-0">{children}</span>
);

/**
 * Live countdown to lights out. Days/hours/minutes while far away, then
 * hours/minutes/seconds, then minutes/seconds in red for the last hour.
 */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  if (now === null) return <span className={className}>—</span>;

  const remaining = Math.floor(new Date(to).getTime() / 1000) - now;
  if (remaining <= 0) return <span className={`${className} text-kerb`}>Lights out</span>;

  const { d, h, m, s } = parts(remaining);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (d > 0) {
    return (
      <span className={className}>
        {d}<Unit>D</Unit>{pad(h)}<Unit>H</Unit>{pad(m)}<Unit>M</Unit>
      </span>
    );
  }
  if (h > 0) {
    return (
      <span className={className}>
        {pad(h)}<Unit>H</Unit>{pad(m)}<Unit>M</Unit>{pad(s)}<Unit>S</Unit>
      </span>
    );
  }
  return (
    <span className={`${className} text-kerb`}>
      {pad(m)}<Unit>M</Unit>{pad(s)}<Unit>S</Unit>
    </span>
  );
}
