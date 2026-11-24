import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/downloads", label: "Downloads" },
      { href: "/setup", label: "Setup guide" },
      { href: "/flash", label: "Flash a gateway" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/login", label: "Open dashboard" },
      { href: "/register", label: "Create account" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/changelog", label: "What's new" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/dpa", label: "DPA" },
      { href: "/msa", label: "MSA" },
    ],
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-9 px-4 py-12 md:grid-cols-5 md:py-14">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Link href="/" className="w-fit" aria-label="OnOffMyPC home">
            <BrandLockup size={22} />
          </Link>
          <p className="type-body-sm max-w-xs text-zinc-400">
            Remote power and out-of-band management for the desktop PC you rely on.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-2">
            <p className="type-overline text-zinc-400">{column.title}</p>
            <nav aria-label={column.title} className="flex flex-col">
              {column.links.map((link) => (
                <Link
                  key={`${column.title}-${link.href}-${link.label}`}
                  href={link.href}
                  className="type-body-sm w-fit py-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 border-t border-zinc-900/70 px-4 py-5 type-metadata text-zinc-400 sm:flex-row">
        <span>© 2026 OnOffMyPC. All rights reserved.</span>
        <span>Built for Windows, Linux, Android, and ESP32.</span>
      </div>
    </footer>
  );
}
