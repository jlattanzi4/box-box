import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
      <div className="min-w-0">
        {eyebrow && <p className="t-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="t-display text-4xl sm:text-5xl text-chalk break-words">{title}</h1>
        {description && <p className="mt-2 text-chalk-dim max-w-prose">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap shrink-0">{actions}</div>}
    </header>
  );
}
