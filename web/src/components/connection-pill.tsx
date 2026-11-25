export function ConnectionPill({ online, label }: { online: boolean; label: string }) {
  const normalized = label.toLowerCase();
  // "Never connected" and unknown presence are an absence of evidence, not a
  // failure. Only a known controller that has gone quiet is red.
  const unknown = !online && (normalized.includes("unknown") || normalized.includes("never"));
  const tone = unknown
    ? "border-border bg-muted text-muted-foreground"
    : online
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
