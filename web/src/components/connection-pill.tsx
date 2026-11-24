export function ConnectionPill({ online, label }: { online: boolean; label: string }) {
  const normalized = label.toLowerCase();
  // "Never connected" and unknown presence are an absence of evidence, not a
  // failure. Only a known controller that has gone quiet is red.
  const unknown = !online && (normalized.includes("unknown") || normalized.includes("never"));
  const tone = unknown
    ? "border-zinc-700 bg-zinc-800/60 text-zinc-300"
    : online
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
