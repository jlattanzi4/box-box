"use client";

/**
 * The five-light start gantry. Lights come on left to right, hold, then all
 * go out together — the one moment every F1 fan feels in their chest.
 * Purely CSS-timed so it runs once on load and respects reduced motion.
 */
export function StartLights({ className = "" }: { className?: string }) {
  const onDelay = (i: number) => `${0.3 + i * 0.4}s`;
  // hold after last light, then everything out at the same instant
  const outAt = `${0.3 + 4 * 0.4 + 0.9}s`; // 2.8s

  return (
    <div
      className={`inline-grid grid-cols-5 gap-3 sm:gap-4 rounded-xl border border-asphalt-600 bg-asphalt-950 p-3 sm:p-4 ${className}`}
      role="img"
      aria-label="Five red start lights that go out"
    >
      {Array.from({ length: 5 }).map((_, col) => (
        <div key={col} className="flex flex-col gap-2 sm:gap-2.5">
          {[0, 1].map((row) => (
            <span
              key={row}
              className="block size-6 sm:size-9 rounded-full bg-[#3a0b12] border border-[#4a121a]"
              style={{
                animation: `light-on 0.12s ease-out ${onDelay(col)} both, lights-out 0.08s ease-out ${outAt} both`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
