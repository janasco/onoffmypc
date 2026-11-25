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
    <header className="border-b border-border pb-6">
      <p className="type-overline text-primary">{eyebrow}</p>
      <h1 className="type-screen-title mt-2 text-foreground">{title}</h1>
      <p className="type-body mt-3 max-w-[68ch] text-muted-foreground">{description}</p>
    </header>
  );
}
