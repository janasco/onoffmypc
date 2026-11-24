export function PublicPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-b border-zinc-900 pb-6">
      <p className="type-overline text-emerald-400">{eyebrow}</p>
      <h1 className="type-screen-title mt-2 text-zinc-50">{title}</h1>
      <p className="type-body mt-3 max-w-2xl text-zinc-400">{description}</p>
    </header>
  );
}
