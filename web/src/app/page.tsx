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
import { PublicHeader } from "@/components/public-header";
import { BrandLockup } from "@/components/brand-lockup";
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      <HostRedirect host="app.onoffmypc.com" to="/dashboard" />
      <PublicHeader active="home" />

      <section className="relative isolate overflow-hidden border-b border-zinc-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(16,185,129,0.16),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(39,39,42,0.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,0.24)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_65%_65%_at_50%_0%,black,transparent_78%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
          <div>
            <p className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Remote power, without the guesswork
            </p>
            <h1 className="font-heading mt-6 text-[clamp(2.9rem,7vw,5.8rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-zinc-50">
              Your PC.
              <br />
              <span className="text-emerald-400">On. Off.</span> Anywhere.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Power on, shut down, or reset your desktop from any browser or phone. Use the desktop agent for rich telemetry, or an ESP32 gateway for hardware control when the operating system will not respond.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              >
                Get started free
              </Link>
              <Link
                href="#how"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                See how it works
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
              {["No subscription to start", "Windows, Linux, Android, ESP32", "Pair once, use anywhere"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview className="mx-auto w-full max-w-[560px] lg:max-w-none" />
        </div>
      </section>

      <section className="border-b border-zinc-900 bg-zinc-950/70">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-zinc-900 px-4 sm:grid-cols-4 sm:divide-y-0">
          {capabilities.map(({ icon: Icon, title, body }) => (
            <div key={title} className="px-5 py-6">
              <Icon className="h-4 w-4 text-emerald-400" />
              <h2 className="font-heading mt-3 text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-zinc-900 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">Built for trust</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-50 sm:text-4xl">
              A control surface, not a guessing game.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              The dashboard never turns a request into a promise. A queued command, a delivered command, a device acknowledgement, and the PC actually changing state are separate facts.
            </p>
          </div>

          <div className="mt-10 grid gap-8 border-t border-zinc-900 pt-8 sm:grid-cols-3">
            <div>
              <Activity className="h-4 w-4 text-emerald-400" />
              <h3 className="font-heading mt-3 text-base font-semibold text-zinc-100">Honest state</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Device online is not PC on. Every reading carries its own timestamp and recency.
              </p>
            </div>
            <div>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="font-heading mt-3 text-base font-semibold text-zinc-100">Two control paths</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Software actions for clean operations; hardware power and reset when the operating system is down.
              </p>
            </div>
            <div>
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="font-heading mt-3 text-base font-semibold text-zinc-100">One quiet dashboard</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                The same fleet on web, Android, and the desktop agent. No noisy dashboards or celebration states.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-24 border-b border-zinc-900 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">How it works</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-50 sm:text-4xl">
              From box to first command.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
              Start with the path that fits the machine. Both use the same account, pairing flow, and dashboard.
            </p>
            <Link
              href="/setup"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Read the setup guide
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="border-l border-zinc-800 pl-6 sm:pl-8">
            {steps.map((step, index) => (
              <div key={step.number} className={index > 0 ? "mt-8 border-t border-zinc-900 pt-8" : ""}>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-emerald-400">{step.number}</span>
                  <div>
                    <h3 className="font-heading text-lg font-semibold tracking-tight text-zinc-100">{step.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">{step.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-900 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">Two paths</p>
              <h2 className="font-heading mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-50 sm:text-4xl">
                Choose how you reach the machine.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-zinc-500">
              They can coexist on the same PC. Use the agent for software depth and the ESP32 for the path that survives a hung OS.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {paths.map(({ icon: Icon, eyebrow, title, body, points, href, action }) => (
              <div key={title} className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/25 p-6 transition-colors hover:border-zinc-700/80">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{eyebrow}</span>
                </div>
                <h3 className="font-heading mt-5 text-2xl font-semibold tracking-[-0.035em] text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{body}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-zinc-400">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href={href} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
                  {action}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-900 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">Available everywhere</p>
              <h2 className="font-heading mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-50 sm:text-4xl">
                A quiet client for every screen.
              </h2>
            </div>
            <Link href="/downloads" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
              View all downloads
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {downloads.map(({ icon: Icon, title, note, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/25 p-5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/40"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                </div>
                <div className="mt-8">
                  <h3 className="font-heading text-base font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{note}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(16,185,129,0.14),transparent_70%)]" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">Start remote</p>
              <h2 className="font-heading mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.045em] text-zinc-50 sm:text-5xl">
                Your PC is waiting.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                Create an account, choose the control path, and make the first connection in minutes.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/register" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400">
                  Create account
                </Link>
                <Link href="/downloads" className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 px-6 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900">
                  Explore downloads
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 text-sm md:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <BrandLockup size={18} />
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-zinc-500">
              Remote power and out-of-band management for the desktop PC you rely on.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-heading text-xs font-semibold text-zinc-300">Product</h4>
            <Link href="#how" className="text-zinc-500 transition-colors hover:text-zinc-300">How it works</Link>
            <Link href="/downloads" className="text-zinc-500 transition-colors hover:text-zinc-300">Downloads</Link>
            <Link href="/setup" className="text-zinc-500 transition-colors hover:text-zinc-300">Setup guide</Link>
            <Link href="/flash" className="text-zinc-500 transition-colors hover:text-zinc-300">Flash a gateway</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-heading text-xs font-semibold text-zinc-300">Platform</h4>
            <Link href="/login" className="text-zinc-500 transition-colors hover:text-zinc-300">Open dashboard</Link>
            <Link href="/register" className="text-zinc-500 transition-colors hover:text-zinc-300">Create account</Link>
            <Link href="/about" className="text-zinc-500 transition-colors hover:text-zinc-300">About</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-heading text-xs font-semibold text-zinc-300">Company</h4>
            <Link href="/contact" className="text-zinc-500 transition-colors hover:text-zinc-300">Contact</Link>
            <Link href="/changelog" className="text-zinc-500 transition-colors hover:text-zinc-300">What&apos;s new</Link>
            <Link href="/login" className="text-zinc-500 transition-colors hover:text-zinc-300">Log in</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-heading text-xs font-semibold text-zinc-300">Legal</h4>
            <Link href="/privacy-policy" className="text-zinc-500 transition-colors hover:text-zinc-300">Privacy Policy</Link>
            <Link href="/terms" className="text-zinc-500 transition-colors hover:text-zinc-300">Terms of Service</Link>
            <Link href="/dpa" className="text-zinc-500 transition-colors hover:text-zinc-300">DPA</Link>
            <Link href="/msa" className="text-zinc-500 transition-colors hover:text-zinc-300">MSA</Link>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col justify-between gap-2 border-t border-zinc-900/70 px-4 pt-6 text-xs text-zinc-600 sm:flex-row">
          <span>© 2026 OnOffMyPC. All rights reserved.</span>
          <span>Built for Windows, Linux, Android, and ESP32.</span>
        </div>
      </footer>
    </div>
  );
}
