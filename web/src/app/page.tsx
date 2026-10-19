import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Navbar */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition-opacity">
            <span className="text-emerald-500">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v9" />
                <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
              </svg>
            </span>
            OnOffMyPC
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="#how" className="text-zinc-400 hover:text-zinc-100 transition-colors">How it works</Link>
            <Link href="/setup" className="text-zinc-400 hover:text-zinc-100 transition-colors">Setup</Link>
            <Link href="/login" className="text-zinc-400 hover:text-zinc-100 transition-colors">Log in</Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-24 px-4 overflow-hidden border-b border-zinc-900 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent_60%)]">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Your PC, on or off <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">from anywhere</span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-400 leading-relaxed">
            Control your desktop remotely with our lightweight software agents for Windows and Linux, or plug in an ESP32 for hardware-level control when the operating system is unresponsive.
          </p>
          <div className="flex gap-4 mt-4">
            <Link href="/register">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6">
                Get Started Free
              </Button>
            </Link>
            <Link href="/setup">
              <Button size="lg" variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 h-12 px-6">
                View setup guide
              </Button>
            </Link>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Software agent & hardware integration options · no subscription required
          </p>
        </div>
      </header>

      {/* How it works */}
      <section id="how" className="py-24 max-w-6xl mx-auto px-4 w-full border-b border-zinc-900">
        <div className="text-center mb-16">
          <span className="text-emerald-500 text-sm font-semibold tracking-wider uppercase">How it works</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Three steps to remote power</h2>
          <p className="text-zinc-400 mt-3 max-w-md mx-auto">Flash a board, pair it once, then control your PC from any browser or phone.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="text-4xl font-extrabold text-emerald-500/20 mb-2">01</div>
              <CardTitle className="text-zinc-100">Flash your ESP32</CardTitle>
              <CardDescription className="text-zinc-400">
                Use the browser flasher on the setup page — Chrome or Edge, one click, no toolchain.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="text-4xl font-extrabold text-emerald-500/20 mb-2">02</div>
              <CardTitle className="text-zinc-100">Pair with a code</CardTitle>
              <CardDescription className="text-zinc-400">
                Create a device in the dashboard, enter the short pairing code on the board, and you’re linked.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="text-4xl font-extrabold text-emerald-500/20 mb-2">03</div>
              <CardTitle className="text-zinc-100">Power from anywhere</CardTitle>
              <CardDescription className="text-zinc-400">
                Send on, off, reset, or force-off. Live status and room sensors follow within seconds.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Downloads & Setup Showcase */}
      <section className="py-24 max-w-6xl mx-auto px-4 w-full border-b border-zinc-900">
        <div className="text-center mb-16">
          <span className="text-emerald-500 text-sm font-semibold tracking-wider uppercase">Downloads & setup</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Control from any platform</h2>
          <p className="text-zinc-400 mt-3 max-w-md mx-auto">Download our companion apps, desktop agents, and custom hardware firmware configurations.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/40 border-zinc-800/80 flex flex-col h-full hover:border-zinc-700/80 transition-colors">
            <CardHeader className="flex-1">
              <span className="text-4xl text-emerald-500 mb-2 block">⏻</span>
              <CardTitle className="text-zinc-100 text-lg">ESP32 Firmware</CardTitle>
              <CardDescription className="text-zinc-400 mt-2 text-sm leading-relaxed">
                Direct motherboard integration for physical hardware power control via WoL / relays.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/setup">
                <Button variant="ghost" className="w-full text-emerald-500 hover:text-emerald-400 hover:bg-zinc-900 justify-start px-0">
                  Firmware Setup →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800/80 flex flex-col h-full hover:border-zinc-700/80 transition-colors">
            <CardHeader className="flex-1">
              <span className="text-4xl text-emerald-500 mb-2 block">🖳</span>
              <CardTitle className="text-zinc-100 text-lg">Desktop Agent</CardTitle>
              <CardDescription className="text-zinc-400 mt-2 text-sm leading-relaxed">
                Companion software for Windows and Linux. Reports telemetry (CPU, RAM, GPU) and processes commands.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/downloads">
                <Button variant="ghost" className="w-full text-emerald-500 hover:text-emerald-400 hover:bg-zinc-900 justify-start px-0">
                  Download Installers →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800/80 flex flex-col h-full hover:border-zinc-700/80 transition-colors">
            <CardHeader className="flex-1">
              <span className="text-4xl text-emerald-500 mb-2 block">🤖</span>
              <CardTitle className="text-zinc-100 text-lg">Android App</CardTitle>
              <CardDescription className="text-zinc-400 mt-2 text-sm leading-relaxed">
                Manage and monitor your computers on the go with real-time status updates and native controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/downloads">
                <Button variant="ghost" className="w-full text-emerald-500 hover:text-emerald-400 hover:bg-zinc-900 justify-start px-0">
                  Get Android APK →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800/80 flex flex-col h-full opacity-60">
            <CardHeader className="flex-1">
              <span className="text-4xl text-zinc-500 mb-2 block">🍎</span>
              <CardTitle className="text-zinc-100 text-lg">iOS App</CardTitle>
              <CardDescription className="text-zinc-400 mt-2 text-sm leading-relaxed">
                SwiftUI-powered mobile client with modern layout and hardware telemetry views.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button disabled variant="ghost" className="w-full text-zinc-500 justify-start px-0">
                Coming to iOS App Store
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing section removed */}

      {/* Footer */}
      <footer className="py-16 bg-zinc-950 border-t border-zinc-900 mt-auto">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-sm">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span className="text-emerald-500">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 3v9" />
                  <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
                </svg>
              </span>
              OnOffMyPC
            </Link>
            <p className="text-zinc-500 leading-relaxed text-xs">
              Remote power control and out-of-band management for your desktop PC.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-zinc-300">Product</h4>
            <Link href="#how" className="text-zinc-500 hover:text-zinc-300 transition-colors">How it works</Link>
            <Link href="/setup" className="text-zinc-500 hover:text-zinc-300 transition-colors">Setup guide</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-zinc-300">Company</h4>
            <Link href="/login" className="text-zinc-500 hover:text-zinc-300 transition-colors">Log in</Link>
            <Link href="/register" className="text-zinc-500 hover:text-zinc-300 transition-colors">Create account</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-zinc-300">Legal</h4>
            <Link href="/privacy-policy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 text-xs text-zinc-600 text-center border-t border-zinc-900/60 pt-8">
          © 2026 OnOffMyPC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
