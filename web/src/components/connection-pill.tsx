export function ConnectionPill({ online, label }: { online: boolean; label: string }) {
  const unknown = label.toLowerCase().includes("unknown");
  const tone = unknown
    ? "border-zinc-700 bg-zinc-800/60 text-zinc-300"
    : online
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}
