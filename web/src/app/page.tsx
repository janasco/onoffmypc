import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Check,
  Cpu,
  Globe,
  Laptop,
  Monitor,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap,
} from "lucide-react";
import { HostRedirect } from "@/components/host-redirect";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { ProductPreview } from "@/components/product-preview";

const capabilities = [
  {
    icon: Zap,
    title: "Remote power",
    body: "Power on, shut down, restart, lock, or log out from any browser or phone.",
  },
  {
    icon: Activity,
    title: "Live state",
    body: "Connection, PC power, telemetry, and command progress stay separate and timestamped.",
  },
  {
    icon: ShieldCheck,
    title: "Out-of-band path",
    body: "An ESP32 gateway keeps physical power and reset available when the OS is unresponsive.",
  },
  {
    icon: CalendarClock,
    title: "Schedules",
    body: "Queue commands for later and review the command history when you come back.",
  },
];

const principles = [
  {
    icon: Activity,
    title: "Honest state",
    body: "Device online is not PC on. Every reading carries its own timestamp and recency.",
  },
  {
    icon: ShieldCheck,
    title: "Two control paths",
    body: "Software actions for clean operations; hardware power and reset when the operating system is down.",
  },
  {
    icon: Terminal,
    title: "One quiet dashboard",
    body: "The same fleet on web, Android, and the desktop agent. No noisy dashboards or celebration states.",
  },
];

const steps = [
  {
    number: "01",
    title: "Install the agent or flash a gateway",
    body: "Use the desktop agent for rich telemetry and software commands, or flash an ESP32 for hardware-level control.",
  },
  {
    number: "02",
    title: "Pair once with a short code",
    body: "Add a device in the dashboard and enter the one-time code on the agent or board. No network setup required.",
  },
  {
    number: "03",
    title: "Control with context",
    body: "Send power actions, watch live readings, and know whether the device is online separately from whether the PC is on.",
  },
];

const paths = [
  {
    icon: Monitor,
    eyebrow: "Software path",
    title: "Desktop agent",
    body: "A quiet companion app for Windows and Linux. Reports hardware telemetry and handles clean shutdown, restart, lock, and logout.",
    points: ["CPU, RAM, GPU, and Wi-Fi telemetry", "Software-level sleep and lock", "Same pairing flow as the hardware gateway"],
    href: "/downloads",
    action: "Download the agent",
  },
  {
    icon: Cpu,
    eyebrow: "Hardware path",
    title: "ESP32 gateway",
    body: "Wired to the motherboard's power and reset headers. It keeps working when the operating system does not.",
    points: ["Physical power and reset control", "Room temperature and humidity", "Browser flashing from the setup guide"],
    href: "/setup",
    action: "Flash a gateway",
  },
];

const downloads = [
  {
    icon: Smartphone,
    title: "Android",
    note: "Google Play or direct APK",
    href: "/downloads",
  },
  {
    icon: Laptop,
    title: "Desktop",
    note: "Windows and Linux",
    href: "/downloads",
  },
  {
    icon: Globe,
    title: "Web",
    note: "Open the dashboard",
    href: "/login",
  },
  {
    icon: Cpu,
    title: "ESP32",
    note: "Flash and pair",
    href: "/setup",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <HostRedirect host="app.onoffmypc.com" to="/dashboard" />
      <PublicHeader active="home" />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_55%_at_78%_-10%,rgba(4,120,87,0.09),transparent_72%)]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:py-24">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-px w-7 bg-primary/60" />
                <p className="type-overline text-primary">Remote power, without the guesswork</p>
              </div>
              <h1 className="type-display mt-6 text-foreground">
                Your PC.
                <br />
                <span className="text-primary">On. Off.</span> Anywhere.
              </h1>
              <p className="type-lead mt-5 max-w-xl text-muted-foreground sm:mt-6">
                Power on, shut down, or reset your desktop from any browser or phone. Use the desktop agent for rich telemetry, or an ESP32 gateway for hardware control when the operating system will not respond.
              </p>

              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <Link
                  href="/register"
                  className="type-label inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-primary-foreground transition-colors hover:bg-emerald-800 min-[420px]:w-auto"
                >
                  Get started free
                </Link>
                <Link
                  href="#how"
                  className="type-label inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-foreground transition-colors hover:border-emerald-300 hover:bg-secondary/70 min-[420px]:w-auto"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <ul className="type-metadata mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-muted-foreground">
                {["No subscription to start", "Windows, Linux, Android, ESP32", "Pair once, use anywhere"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <ProductPreview className="mx-auto w-full max-w-[560px] lg:max-w-none" />
          </div>
        </section>

        <section aria-label="Platform capabilities" className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border pt-8 sm:grid-cols-4 sm:gap-8">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <h2 className="type-label text-foreground">{title}</h2>
                </div>
                <p className="type-body-sm mt-2 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="max-w-md">
              <p className="type-overline text-primary">Built for trust</p>
              <h2 className="type-section-title mt-3 text-foreground">
                A control surface, not a guessing game.
              </h2>
              <p className="type-body mt-3 text-muted-foreground sm:mt-4">
                The dashboard never turns a request into a promise. A queued command, a delivered command, a device acknowledgement, and the PC actually changing state are separate facts.
              </p>
            </div>

            <div className="border-t border-border">
              {principles.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="grid grid-cols-[auto_1fr] gap-4 border-b border-border py-6 sm:gap-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="type-card-title text-foreground">{title}</h3>
                    <p className="type-body-sm mt-2 text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-32 px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div>
              <p className="type-overline text-primary">How it works</p>
              <h2 className="type-section-title mt-3 text-foreground">From box to first command.</h2>
              <p className="type-body mt-3 max-w-md text-muted-foreground sm:mt-4">
                Start with the path that fits the machine. Both use the same account, pairing flow, and dashboard.
              </p>
              <Link
                href="/setup"
                className="type-label mt-5 inline-flex items-center gap-2 text-primary transition-colors hover:text-emerald-800"
              >
                Read the setup guide
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {steps.map((step) => (
                <div key={step.number} className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="type-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-primary">
                      {step.number}
                    </span>
                    <div className="min-w-0">
                      <h3 className="type-card-title text-foreground">{step.title}</h3>
                      <p className="type-body-sm mt-1.5 max-w-xl text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="type-overline text-primary">Two paths</p>
              <h2 className="type-section-title mt-3 text-foreground">
                Choose how you reach the machine.
              </h2>
            </div>
            <p className="type-body-sm max-w-md text-muted-foreground">
              They can coexist on the same PC. Use the agent for software depth and the ESP32 for the path that survives a hung OS.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {paths.map(({ icon: Icon, eyebrow, title, body, points, href, action }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-emerald-300 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-emerald-800">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="type-overline text-muted-foreground">{eyebrow}</span>
                </div>
                <h3 className="type-section-title mt-4 text-foreground">{title}</h3>
                <p className="type-body-sm mt-2 text-muted-foreground">{body}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {points.map((point) => (
                    <li key={point} className="type-body-sm flex items-start gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className="type-label mt-auto inline-flex items-center gap-2 pt-6 text-primary transition-colors hover:text-emerald-800"
                >
                  {action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="type-overline text-primary">Available everywhere</p>
              <h2 className="type-section-title mt-3 text-foreground">
                A quiet client for every screen.
              </h2>
            </div>
            <Link
              href="/downloads"
              className="type-label inline-flex items-center gap-2 text-primary transition-colors hover:text-emerald-800"
            >
              View all downloads
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {downloads.map(({ icon: Icon, title, note, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-emerald-300 hover:bg-secondary/30 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-6 sm:mt-8">
                  <h3 className="type-card-title text-foreground">{title}</h3>
                  <p className="type-metadata mt-1 text-muted-foreground">{note}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-accent px-5 py-12 sm:px-12 sm:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 hidden h-56 w-56 rounded-full border-[20px] border-emerald-200/60 lg:block"
            />
            <div className="relative max-w-2xl">
              <p className="type-overline text-emerald-800">Start remote</p>
              <h2 className="type-section-title mt-3 text-foreground">Your PC is waiting.</h2>
              <p className="type-body mt-3 text-emerald-950/80 sm:mt-4">
                Create an account, choose the control path, and make the first connection in minutes.
              </p>
              <div className="mt-7 flex flex-col gap-3 min-[480px]:flex-row">
                <Link
                  href="/register"
                  className="type-label inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-primary-foreground transition-colors hover:bg-emerald-800"
                >
                  Create account
                </Link>
                <Link
                  href="/downloads"
                  className="type-label inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-card px-6 text-foreground transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                >
                  Explore downloads
                </Link>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-14 top-1/2 hidden h-14 w-28 -translate-y-1/2 items-center rounded-full border border-emerald-300 bg-card/80 p-1.5 lg:flex"
            >
              <span className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary">
                <span className="h-5 w-0.5 rounded-full bg-primary-foreground" />
              </span>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
