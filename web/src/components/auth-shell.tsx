import Link from "next/link";
import {
  Activity,
  LockKeyhole,
  MonitorSmartphone,
  Power,
  ShieldCheck,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";

export const authFieldClass =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 text-base text-zinc-100 placeholder:text-zinc-400 transition-colors focus:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 md:text-sm";

export const authFieldClassLight =
  "h-11 w-full rounded-lg border border-[#D5DBD0] bg-white/70 px-3.5 text-base text-[#121612] placeholder:text-[#5C675E] transition-colors focus:border-emerald-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/70 md:text-sm";

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

const setupSteps = [
  { index: "01", title: "Create your identity", body: "Email and password. No hardware required yet." },
  { index: "02", title: "Add a computer", body: "A short pairing code connects your desktop agent or ESP32." },
  { index: "03", title: "Take control", body: "Power, telemetry, and sessions from any signed-in device." },
];

function Brand({ tone }: { tone: "light" | "dark" }) {
  return (
    <Link
      href="https://onoffmypc.com"
      className={`inline-flex min-h-11 items-center transition-opacity hover:opacity-80 ${
        tone === "light" ? "text-[#121612]" : "text-zinc-50"
      }`}
      aria-label="OnOffMyPC home"
    >
      <BrandLockup size={24} />
    </Link>
  );
}

function BackLink({ tone }: { tone: "light" | "dark" }) {
  return (
    <Link
      href="https://onoffmypc.com"
      className={`type-metadata inline-flex min-h-11 items-center transition-colors ${
        tone === "light"
          ? "text-[#5C675E] hover:text-[#121612]"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      <span className="sm:hidden">← Back</span>
      <span className="hidden sm:inline">← Back to onoffmypc.com</span>
    </Link>
  );
}

function ToggleVisual() {
  return (
    <div className="mt-14 flex items-center gap-4" aria-hidden="true">
      <div className="flex h-[4.5rem] w-[8.5rem] items-center rounded-full border border-[#121612]/15 bg-[#121612] p-2 shadow-[0_18px_50px_rgba(6,18,37,0.22)]">
        <span className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 font-mono text-[10px] font-bold tracking-wider text-[#061225]">
          ON
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5C675E]">System state</span>
        <span className="type-label text-[#121612]">Ready for access</span>
      </div>
    </div>
  );
}

function LoginAside() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-r border-[#D5DBD0] bg-[#F7F8F5] p-10 text-[#121612] lg:flex lg:flex-col xl:p-14">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute -right-24 top-8 h-72 w-72 rounded-full border border-[#121612]/5" />
        <div className="absolute -right-12 top-20 h-48 w-48 rounded-full border border-[#121612]/5" />
        <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-[#EEF1EB] to-transparent" />
      </div>
      <div className="relative flex h-full flex-col justify-between gap-12">
        <div>
          <Brand tone="light" />
          <div className="mt-20 max-w-lg xl:mt-24">
            <p className="type-overline text-emerald-700">Access / 01</p>
            <h2 className="type-display mt-4 max-w-md">One switch. Total control.</h2>
            <p className="type-lead mt-5 max-w-md text-[#3A463E]">
              Sign in to the quiet control room for the computers that keep your
              work moving.
            </p>
            <ToggleVisual />
          </div>
          <div className="mt-12 flex max-w-md flex-col gap-5">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#121612]/10 bg-[#EEF1EB] text-[#121612]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="type-label text-[#121612]">{benefit.title}</p>
                    <p className="type-body-sm mt-1 text-[#5C675E]">{benefit.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative flex items-center gap-2 border-t border-[#D5DBD0] pt-6 type-metadata text-[#5C675E]">
          <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <span>Encrypted relay · revocable sessions · no open inbound ports</span>
        </div>
      </div>
    </aside>
  );
}

function RegisterAside() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-l border-[#D5DBD0] bg-[#F7F8F5] p-10 text-[#121612] lg:flex lg:flex-col xl:p-14">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute -left-20 bottom-24 h-72 w-72 rounded-full border border-[#121612]/5" />
        <div className="absolute left-4 bottom-40 h-44 w-44 rounded-full border border-[#121612]/5" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#EEF1EB] to-transparent" />
      </div>
      <div className="relative flex h-full flex-col justify-between gap-12">
        <div>
          <div className="flex items-start justify-between gap-6">
            <Brand tone="light" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5C675E]">New account / 02</span>
          </div>
          <div className="mt-20 max-w-lg xl:mt-24">
            <p className="type-overline text-emerald-700">Start here</p>
            <h2 className="type-display mt-4 max-w-md">Build your fleet.</h2>
            <p className="type-lead mt-5 max-w-md text-[#3A463E]">
              One account for the desktop you rely on and the gateway that keeps it
              reachable.
            </p>
          </div>
          <ol className="mt-12 flex max-w-md flex-col gap-5">
            {setupSteps.map((step, index) => (
              <li key={step.index} className="flex gap-4">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ${
                  index === 0
                    ? "border-[#121612] bg-[#121612] text-[#F7F8F5]"
                    : "border-[#D5DBD0] text-[#5C675E]"
                }`}>
                  {step.index}
                </span>
                <div>
                  <p className={`type-label ${index === 0 ? "text-[#121612]" : "text-[#5C675E]"}`}>{step.title}</p>
                  <p className="type-body-sm mt-1 text-[#5C675E]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative flex items-center gap-2 border-t border-[#D5DBD0] pt-6 type-metadata text-[#5C675E]">
          <Power className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <span>Pair once. Stay in control from anywhere.</span>
        </div>
      </div>
    </aside>
  );
}

function SimpleHeader({ tone }: { tone: "light" | "dark" }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 p-4 sm:p-6 lg:p-8">
      <Brand tone={tone} />
      <BackLink tone={tone} />
    </header>
  );
}

type AuthShellProps = {
  children: React.ReactNode;
  variant?: "login" | "register" | "forgot" | "reset" | "verify";
};

export function AuthShell({ children, variant = "login" }: AuthShellProps) {
  if (variant === "login") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400 lg:grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <LoginAside />
        <main className="relative flex min-h-screen flex-col">
          <header className="flex items-center justify-between p-4 sm:p-6 lg:justify-end lg:p-8">
            <div className="lg:hidden"><Brand tone="dark" /></div>
            <BackLink tone="dark" />
          </header>
          <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6 lg:px-10 lg:py-12">
            <div className="w-full max-w-[26rem]">{children}</div>
          </div>
        </main>
      </div>
    );
  }

  if (variant === "register") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400 lg:grid lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <main className="relative flex min-h-screen flex-col">
          <header className="flex items-center justify-between p-4 sm:p-6 lg:justify-end lg:p-8">
            <div className="lg:hidden"><Brand tone="dark" /></div>
            <BackLink tone="dark" />
          </header>
          <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6 lg:px-10 lg:py-12">
            <div className="w-full max-w-[26rem]">{children}</div>
          </div>
        </main>
        <RegisterAside />
      </div>
    );
  }

  if (variant === "forgot") {
    return (
      <div className="min-h-screen overflow-hidden bg-[#F7F8F5] text-[#121612] selection:bg-emerald-600/20 selection:text-emerald-800">
        <SimpleHeader tone="light" />
        <main className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:pt-16">
          <div className="relative max-w-2xl">
            <span aria-hidden="true" className="pointer-events-none absolute -left-2 -top-14 select-none font-heading text-[9rem] font-semibold leading-none tracking-[-0.08em] text-[#121612]/[0.035]">
              03
            </span>
            <p className="type-overline relative text-emerald-700">Recovery / 03</p>
            <p className="type-display relative mt-4 max-w-xl">Find your way back in.</p>
            <p className="type-lead relative mt-5 max-w-xl text-[#5C675E]">
              A recovery link is the shortest path back to your fleet. Request one
              below; older links stop working the moment a new one is issued.
            </p>
          </div>
          <div className="mt-10 w-full max-w-[32rem]">{children}</div>
        </main>
      </div>
    );
  }

  if (variant === "reset") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
        <SimpleHeader tone="dark" />
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 pb-5 type-metadata">
            <span className="text-zinc-500">Recovery link</span>
            <span className="text-zinc-700">/</span>
            <span className="text-emerald-400">New password</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-500">Sign in</span>
          </div>
          <div className="mx-auto mt-8 w-full max-w-[32rem]">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <SimpleHeader tone="dark" />
      <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[30rem]">{children}</div>
      </main>
    </div>
  );
}

export function AuthPanel({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <section
      className={
        tone === "light"
          ? "rounded-2xl border border-[#D5DBD0] bg-[#F7F8F5] p-5 text-[#121612] shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7"
          : "rounded-2xl border border-zinc-800/80 bg-zinc-900/55 p-5 shadow-2xl shadow-black/25 backdrop-blur sm:p-7"
      }
    >
      {children}
    </section>
  );
}
