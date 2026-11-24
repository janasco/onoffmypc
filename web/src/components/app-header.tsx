"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, LogOut, Monitor, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-lockup";

const NAV = [
  { href: "/dashboard", label: "Devices", icon: Monitor },
  { href: "/account", label: "Account", icon: UserRound },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex min-h-11 items-center hover:opacity-90"
    >
      <BrandLockup size={22} />
    </Link>
  );
}

export function AppHeader({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await api.logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`type-label flex min-h-11 items-center gap-2 rounded-lg px-3 transition-colors ${
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {email && (
            <span className="type-metadata hidden max-w-[180px] truncate text-zinc-400 lg:inline">
              {email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="min-h-11 text-zinc-400 hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
            <span className="sr-only sm:hidden">Log out</span>
          </Button>
        </div>
      </div>

      <nav
        aria-label="Main mobile"
        className="flex gap-1 overflow-x-auto border-t border-zinc-800/80 px-3 py-1.5 md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`type-label flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
