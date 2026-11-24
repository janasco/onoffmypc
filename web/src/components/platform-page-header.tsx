import type { ReactNode } from "react";

export function PlatformPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="type-overline text-emerald-400/90">{eyebrow}</p>
        <h1 className="type-screen-title mt-2 text-zinc-50">{title}</h1>
        <p className="type-body mt-2 max-w-2xl text-zinc-400">{description}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
