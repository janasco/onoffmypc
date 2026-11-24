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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <HostRedirect host="app.onoffmypc.com" to="/dashboard" />
      <PublicHeader active="home" />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(16,185,129,0.14),transparent_70%)]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-10 sm:gap-10 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:py-24">
            <div>
              <p className="type-overline inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                Remote power, without the guesswork
              </p>
              <h1 className="type-display mt-5 text-zinc-50 sm:mt-6">
                Your PC.
                <br />
                <span className="text-emerald-400">On. Off.</span> Anywhere.
              </h1>
              <p className="type-lead mt-5 max-w-xl text-zinc-400 sm:mt-6">
                Power on, shut down, or reset your desktop from any browser or phone. Use the desktop agent for rich telemetry, or an ESP32 gateway for hardware control when the operating system will not respond.
              </p>

              <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
                <Link
                  href="/register"
                  className="type-label inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-zinc-950 transition-colors hover:bg-emerald-400"
                >
                  Get started free
                </Link>
                <Link
                  href="#how"
                  className="type-label inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="type-metadata mt-6 flex flex-wrap gap-x-5 gap-y-2 text-zinc-400">
                {["No subscription to start", "Windows, Linux, Android, ESP32", "Pair once, use anywhere"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <ProductPreview className="mx-auto w-full max-w-[560px] lg:max-w-none" />
          </div>
        </section>

        <section aria-label="Platform capabilities" className="mx-auto w-full max-w-6xl px-4 pt-4 sm:pt-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-t border-zinc-900 pt-8 sm:grid-cols-4 sm:gap-8">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h2 className="type-label mt-3 text-zinc-100">{title}</h2>
                <p className="type-body-sm mt-1.5 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="type-overline text-emerald-400">Built for trust</p>
            <h2 className="type-section-title mt-3 text-zinc-50">
              A control surface, not a guessing game.
            </h2>
            <p className="type-body mt-3 text-zinc-400 sm:mt-4">
              The dashboard never turns a request into a promise. A queued command, a delivered command, a device acknowledgement, and the PC actually changing state are separate facts.
            </p>
          </div>

          <div className="mt-9 grid gap-7 border-t border-zinc-900 pt-8 sm:grid-cols-3 sm:gap-8">
            <div>
              <Activity className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="type-card-title mt-3 text-zinc-100">Honest state</h3>
              <p className="type-body-sm mt-2 text-zinc-400">
                Device online is not PC on. Every reading carries its own timestamp and recency.
              </p>
            </div>
            <div>
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="type-card-title mt-3 text-zinc-100">Two control paths</h3>
              <p className="type-body-sm mt-2 text-zinc-400">
                Software actions for clean operations; hardware power and reset when the operating system is down.
              </p>
            </div>
            <div>
              <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="type-card-title mt-3 text-zinc-100">One quiet dashboard</h3>
              <p className="type-body-sm mt-2 text-zinc-400">
                The same fleet on web, Android, and the desktop agent. No noisy dashboards or celebration states.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-32 px-4 py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
            <div>
              <p className="type-overline text-emerald-400">How it works</p>
              <h2 className="type-section-title mt-3 text-zinc-50">From box to first command.</h2>
              <p className="type-body mt-3 max-w-md text-zinc-400 sm:mt-4">
                Start with the path that fits the machine. Both use the same account, pairing flow, and dashboard.
              </p>
              <Link
                href="/setup"
                className="type-label mt-5 inline-flex items-center gap-2 text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Read the setup guide
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="border-l border-zinc-800/80 pl-5 sm:pl-8">
              {steps.map((step, index) => (
                <div key={step.number} className={index > 0 ? "mt-7 border-t border-zinc-900 pt-7" : ""}>
                  <div className="flex items-baseline gap-3 sm:gap-4">
                    <span className="type-mono text-emerald-400">{step.number}</span>
                    <div>
                      <h3 className="type-card-title text-zinc-100">{step.title}</h3>
                      <p className="type-body-sm mt-1.5 max-w-xl text-zinc-400">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="type-overline text-emerald-400">Two paths</p>
              <h2 className="type-section-title mt-3 text-zinc-50">
                Choose how you reach the machine.
              </h2>
            </div>
            <p className="type-body-sm max-w-md text-zinc-400">
              They can coexist on the same PC. Use the agent for software depth and the ESP32 for the path that survives a hung OS.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {paths.map(({ icon: Icon, eyebrow, title, body, points, href, action }) => (
              <div key={title} className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/25 p-5 transition-colors hover:border-zinc-700/80 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="type-overline text-zinc-400">{eyebrow}</span>
                </div>
                <h3 className="type-section-title mt-4 text-zinc-100">{title}</h3>
                <p className="type-body-sm mt-2 text-zinc-400">{body}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {points.map((point) => (
                    <li key={point} className="type-body-sm flex items-start gap-2 text-zinc-400">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href={href} className="type-label mt-6 inline-flex items-center gap-2 text-emerald-400 transition-colors hover:text-emerald-300">
                  {action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="type-overline text-emerald-400">Available everywhere</p>
              <h2 className="type-section-title mt-3 text-zinc-50">
                A quiet client for every screen.
              </h2>
            </div>
            <Link href="/downloads" className="type-label inline-flex items-center gap-2 text-emerald-400 transition-colors hover:text-emerald-300">
              View all downloads
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {downloads.map(({ icon: Icon, title, note, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/25 p-4 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/40 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200" aria-hidden="true" />
                </div>
                <div className="mt-6 sm:mt-8">
                  <h3 className="type-card-title text-zinc-100">{title}</h3>
                  <p className="type-metadata mt-1 text-zinc-400">{note}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:pb-20">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 px-5 py-10 text-center sm:px-12 sm:py-14">
            <p className="type-overline text-emerald-400">Start remote</p>
            <h2 className="type-section-title mx-auto mt-3 max-w-2xl text-zinc-50">
              Your PC is waiting.
            </h2>
            <p className="type-body mx-auto mt-3 max-w-xl text-zinc-400 sm:mt-4">
              Create an account, choose the control path, and make the first connection in minutes.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="type-label inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-6 text-zinc-950 transition-colors hover:bg-emerald-400">
                Create account
              </Link>
              <Link href="/downloads" className="type-label inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 px-6 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900">
                Explore downloads
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
