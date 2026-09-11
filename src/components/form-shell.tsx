import type { ReactNode } from "react";
import Link from "next/link";

/** Shared frame for the small forms: sign in, register, create, join. */
export function FormShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm fade-up">
        <Link href="/" className="inline-block mb-6" aria-label="Box Box home">
          <Logo />
        </Link>
        <div className="pit-board">
          <div className="kerb" />
          <div className="p-6">
            <p className="t-eyebrow mb-2">{eyebrow}</p>
            <h1 className="t-display text-4xl text-chalk">{title}</h1>
            {description && <p className="mt-2 text-sm text-chalk-dim">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && (
            <div className="border-t border-asphalt-700 px-6 py-4 text-sm text-chalk-dim">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-stretch rounded-md overflow-hidden border border-asphalt-600 bg-asphalt-950">
      <span
        className={`t-display text-board-yellow px-2 ${compact ? "text-base py-0.5" : "text-2xl py-1"}`}
        style={{ color: "var(--board-yellow)" }}
      >
        Box
      </span>
      <span
        className={`t-display text-chalk px-2 border-l border-asphalt-600 ${compact ? "text-base py-0.5" : "text-2xl py-1"}`}
      >
        Box
      </span>
    </span>
  );
}
