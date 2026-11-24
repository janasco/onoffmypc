import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";

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
        <Link href="/" className="flex shrink-0 items-center hover:opacity-90" aria-label="OnOffMyPC home">
          <BrandLockup size={22} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
          {NAV.map(({ href, label, key }) => {
            const current = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={current ? "page" : undefined}
                className={`type-label inline-flex min-h-10 items-center rounded-lg px-2.5 py-2 transition-colors lg:px-3 ${
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
            className="type-label hidden min-h-10 items-center rounded-lg px-2.5 py-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 min-[380px]:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="type-label inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-500 px-3.5 text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Get Started
          </Link>
        </div>
      </div>

      <nav
        aria-label="Main mobile"
        className="flex gap-0.5 overflow-x-auto border-t border-zinc-800/60 px-3 py-1.5 md:hidden"
      >
        {NAV.filter(({ key }) => key !== "how").map(({ href, label, key }) => {
          const current = key === active;
          return (
            <Link
              key={key}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`type-label inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 py-2 transition-colors ${
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
