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
  "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground shadow-sm placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card md:text-sm";

export const authFieldClassLight = authFieldClass;

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

function Brand() {
  return (
    <Link
      href="https://onoffmypc.com"
      className="inline-flex min-h-11 items-center text-foreground transition-opacity hover:opacity-80"
      aria-label="OnOffMyPC home"
    >
      <BrandLockup size={24} />
    </Link>
  );
}

function BackLink() {
  return (
    <Link
      href="https://onoffmypc.com"
      className="type-metadata inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="sm:hidden">← Back</span>
      <span className="hidden sm:inline">← Back to onoffmypc.com</span>
    </Link>
  );
}

function ToggleVisual() {
  return (
    <div className="mt-14 flex items-center gap-4" aria-hidden="true">
      <div className="flex h-[4.5rem] w-[8.5rem] items-center rounded-full border border-foreground/15 bg-foreground p-2 shadow-[0_18px_45px_rgba(18,22,18,0.18)]">
        <span className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 font-mono text-xs font-bold tracking-wider text-[#062016]">
          ON
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">System state</span>
        <span className="type-label text-foreground">Ready for access</span>
      </div>
    </div>
  );
}

function LoginAside() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-r border-border bg-[#F4F0E6] p-10 text-foreground lg:flex lg:flex-col xl:p-14">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute -right-24 top-8 h-72 w-72 rounded-full border border-foreground/5" />
        <div className="absolute -right-12 top-20 h-48 w-48 rounded-full border border-foreground/5" />
        <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-secondary to-transparent" />
      </div>
      <div className="relative flex h-full flex-col justify-between gap-12">
        <div>
          <Brand />
          <div className="mt-20 max-w-lg xl:mt-24">
            <p className="type-overline text-emerald-800">Access / 01</p>
            <p className="type-display mt-4 max-w-md">One switch. Total control.</p>
            <p className="type-lead mt-5 max-w-md text-muted-foreground">
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
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-card/70 text-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="type-label text-foreground">{benefit.title}</p>
                    <p className="type-body-sm mt-1 text-muted-foreground">{benefit.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative flex items-center gap-2 border-t border-foreground/10 pt-6 type-metadata text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-800" aria-hidden="true" />
          <span>Encrypted relay · revocable sessions · no open inbound ports</span>
        </div>
      </div>
    </aside>
  );
}

function RegisterAside() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-l border-border bg-secondary p-10 text-foreground lg:flex lg:flex-col xl:p-14">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute -left-20 bottom-24 h-72 w-72 rounded-full border border-foreground/5" />
        <div className="absolute left-4 bottom-40 h-44 w-44 rounded-full border border-foreground/5" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-card/60 to-transparent" />
      </div>
      <div className="relative flex h-full flex-col justify-between gap-12">
        <div>
          <div className="flex items-start justify-between gap-6">
            <Brand />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">New account / 02</span>
          </div>
          <div className="mt-20 max-w-lg xl:mt-24">
            <p className="type-overline text-emerald-800">Start here</p>
            <p className="type-display mt-4 max-w-md">Build your fleet.</p>
            <p className="type-lead mt-5 max-w-md text-muted-foreground">
              One account for the desktop you rely on and the gateway that keeps it
              reachable.
            </p>
          </div>
          <ol className="mt-12 flex max-w-md flex-col gap-0">
            {setupSteps.map((step, index) => (
              <li key={step.index} className="relative flex gap-4 pb-7 last:pb-0">
                {index < setupSteps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[13px] top-8 h-[calc(100%-1.25rem)] w-px bg-foreground/15"
                  />
                )}
                <span
                  className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
                    index === 0
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card/70 text-muted-foreground"
                  }`}
                >
                  {step.index}
                </span>
                <div>
                  <p className={`type-label ${index === 0 ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</p>
                  <p className="type-body-sm mt-1 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative flex items-center gap-2 border-t border-foreground/10 pt-6 type-metadata text-muted-foreground">
          <Power className="h-4 w-4 text-emerald-800" aria-hidden="true" />
          <span>Pair once. Stay in control from anywhere.</span>
        </div>
      </div>
    </aside>
  );
}

function SimpleHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 p-4 sm:p-6 lg:p-8">
      <Brand />
      <BackLink />
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
      <div className="min-h-screen bg-card text-foreground selection:bg-emerald-600/15 selection:text-emerald-900 lg:grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <LoginAside />
        <main className="relative flex min-h-screen flex-col bg-card">
          <header className="flex items-center justify-between p-4 sm:p-6 lg:justify-end lg:p-8">
            <div className="lg:hidden"><Brand /></div>
            <BackLink />
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
      <div className="min-h-screen bg-background text-foreground selection:bg-emerald-600/15 selection:text-emerald-900 lg:grid lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <main className="relative flex min-h-screen flex-col bg-background">
          <header className="flex items-center justify-between p-4 sm:p-6 lg:justify-end lg:p-8">
            <div className="lg:hidden"><Brand /></div>
            <BackLink />
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
      <div className="min-h-screen overflow-hidden bg-background text-foreground selection:bg-emerald-600/15 selection:text-emerald-900">
        <SimpleHeader />
        <main className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:pt-16">
          <div className="relative max-w-2xl border-l-2 border-foreground/80 pl-5 sm:pl-7">
            <span aria-hidden="true" className="pointer-events-none absolute -left-3 -top-14 select-none font-heading text-[9rem] font-semibold leading-none tracking-[-0.08em] text-foreground/[0.04]">
              03
            </span>
            <p className="type-overline relative text-emerald-800">Recovery / 03</p>
            <p className="type-display relative mt-4 max-w-xl">Find your way back in.</p>
            <p className="type-lead relative mt-5 max-w-xl text-muted-foreground">
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
      <div className="min-h-screen bg-[#F2F5EF] text-foreground selection:bg-emerald-600/15 selection:text-emerald-900">
        <SimpleHeader />
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
          <div className="rounded-xl border border-border bg-card/70 p-3 sm:p-4">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute left-[16.6667%] right-[16.6667%] top-4 h-px bg-border"
              />
              <ol className="relative grid grid-cols-3 gap-2" aria-label="Password recovery progress">
                <li className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-semibold text-muted-foreground">
                    1
                  </span>
                  <span className="type-metadata text-muted-foreground">Recovery link</span>
                </li>
                <li className="flex flex-col items-center gap-2 text-center" aria-current="step">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground ring-4 ring-primary/15">
                    2
                  </span>
                  <span className="type-label text-foreground">New password</span>
                </li>
                <li className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-semibold text-muted-foreground">
                    3
                  </span>
                  <span className="type-metadata text-muted-foreground">Sign in</span>
                </li>
              </ol>
            </div>
          </div>
          <div className="mx-auto mt-8 w-full max-w-[32rem]">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-emerald-600/15 selection:text-emerald-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,#E3EDE5_0%,transparent_55%)]"
      />
      <SimpleHeader />
      <main className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[30rem]">{children}</div>
      </main>
    </div>
  );
}

export function AuthPanel({
  children,
  raised = false,
  className = "",
}: {
  children: React.ReactNode;
  raised?: boolean;
  className?: string;
}) {
  const shadow = raised
    ? "shadow-[0_30px_80px_rgba(18,22,18,0.14)]"
    : "shadow-[0_24px_60px_rgba(18,22,18,0.08)]";

  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7 ${shadow} ${className}`}
    >
      {children}
    </section>
  );
}
