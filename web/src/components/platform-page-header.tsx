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
    <div className="flex flex-col gap-4 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">
          {eyebrow}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
