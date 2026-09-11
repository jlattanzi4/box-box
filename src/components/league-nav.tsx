"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/picks", label: "Pick" },
  { href: "/results", label: "Results" },
  { href: "/history", label: "History" },
];

export function LeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/leagues/${leagueId}`;

  return (
    <nav aria-label="League sections" className="fade-up">
      <ul className="flex gap-1 border-b border-asphalt-600 overflow-x-auto">
        {TABS.map((t) => {
          const href = base + t.href;
          const active = t.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={t.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-block px-3 sm:px-4 py-2.5 t-code text-base -mb-px border-b-2 transition-colors ${
                  active
                    ? "border-kerb text-chalk"
                    : "border-transparent text-chalk-dim hover:text-chalk"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
