import Link from "next/link";
import { Activity, LockKeyhole, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";

export const authFieldClass =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 text-base text-zinc-100 placeholder:text-zinc-400 transition-colors focus:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 md:text-sm";

const benefits = [
  {
    icon: LockKeyhole,
    title: "No open ports",
    body: "Commands travel over an authenticated relay, never a public inbound port.",
  },
  {
    icon: MonitorSmartphone,
    title: "Every screen in sync",
    body: "Use the web, Android, iOS, or the desktop agent against the same fleet.",
  },
  {
    icon: Activity,
    title: "Operational visibility",
    body: "See presence, telemetry, commands, and session activity in one place.",
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400 lg:grid lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden border-r border-zinc-800/80 p-10 lg:flex lg:flex-col xl:p-14">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.16),transparent_36%),radial-gradient(circle_at_88%_92%,rgba(16,185,129,0.07),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:48px_48px] opacity-40" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-zinc-950 to-transparent" />
        </div>

        <div className="relative flex h-full flex-col justify-between gap-12">
          <div>
            <Link
              href="https://onoffmypc.com"
              className="inline-flex min-h-11 items-center transition-opacity hover:opacity-90"
              aria-label="OnOffMyPC home"
            >
              <BrandLockup size={24} />
            </Link>

            <div className="mt-20 max-w-lg xl:mt-24">
              <p className="type-overline text-emerald-400">Remote power, without the sprawl</p>
              <h2 className="type-display mt-4 max-w-md text-zinc-50">
                Your PC, within reach.
              </h2>
              <p className="type-lead mt-5 max-w-md text-zinc-400">
                Keep your desktop available from anywhere, without exposing your
                home network or losing sight of what is actually happening.
              </p>
            </div>

            <div className="mt-12 flex max-w-md flex-col gap-5">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="type-label text-zinc-200">{benefit.title}</p>
                      <p className="type-body-sm mt-1 text-zinc-400">{benefit.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center gap-2 border-t border-zinc-800/60 pt-6 type-metadata text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>Encrypted relay · revocable sessions · no open inbound ports</span>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6 lg:justify-end lg:p-8">
          <Link
            href="https://onoffmypc.com"
            className="inline-flex min-h-11 items-center lg:hidden"
            aria-label="OnOffMyPC home"
          >
            <BrandLockup size={22} />
          </Link>
          <Link
            href="https://onoffmypc.com"
            className="type-metadata inline-flex min-h-11 items-center text-zinc-400 transition-colors hover:text-zinc-100"
          >
            ← Back to onoffmypc.com
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6 lg:px-10 lg:py-12">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/55 p-5 shadow-2xl shadow-black/25 backdrop-blur sm:p-7">
      {children}
    </section>
  );
}
