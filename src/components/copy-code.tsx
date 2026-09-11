"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Invite code as a tappable chip. Tap copies it. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the code instead.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-2 rounded-md border border-asphalt-500 bg-asphalt-950 px-3 py-1.5 hover:border-chalk-dim transition-colors"
      aria-label={`Copy invite code ${code}`}
    >
      <span className="t-eyebrow">Invite</span>
      <span className="t-num font-bold tracking-[0.2em] text-chalk">{code}</span>
      <span className="t-eyebrow text-flag-yellow w-10 text-left">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
