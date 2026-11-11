import Link from "next/link";

const NAV = [
  { href: "/", label: "Home", key: "home" },
  { href: "/#how", label: "How it works", key: "how" },
  { href: "/setup", label: "Setup", key: "setup" },
  { href: "/flash", label: "Flash", key: "flash" },
  { href: "/downloads", label: "Downloads", key: "downloads" },
] as const;

export function PublicHeader({ active }: { active?: "home" | "setup" | "flash" | "downloads" }) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-90"
        >
          <span className="text-emerald-500">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 3v9" />
              <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
            </svg>
          </span>
          <span>OnOffMyPC</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, key }) => {
            const current = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={current ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  current
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Get Started
          </Link>
        </div>
      </div>

      <nav
        aria-label="Main mobile"
        className="flex gap-1 overflow-x-auto border-t border-zinc-800/60 px-4 py-2 md:hidden"
      >
        {NAV.filter(({ key }) => key !== "how").map(({ href, label, key }) => {
          const current = key === active;
          return (
            <Link
              key={key}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                current
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
