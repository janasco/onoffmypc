"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Navbar */}
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
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
            <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors">Home</Link>
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

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16 w-full">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">About OnOffMyPC</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Remote PC power control for your desktop computer.
          </p>
        </div>

        <div className="flex flex-col gap-6 text-zinc-300 text-sm leading-relaxed">
          <p>
            OnOffMyPC lets you power your desktop PC on or off from anywhere in the world using a small, inexpensive
            ESP32 microcontroller and a simple web dashboard or native mobile application.
          </p>
          <p>
            The device connects directly to your motherboard power switch headers and sits beside your PC on your local Wi-Fi. It maintains a secure, persistent WSS connection to our backend relay, allowing commands to execute instantly without setting up VPN tunnels, configuring port forwarding, or exposing your local network to security risks.
          </p>
          <p>
            System power-on actions utilize Wake-on-LAN packets dispatched over your local network. The controller also monitors physical status (sensing power supply status lines) and reports real-time state, room temperature, and humidity directly back to your dashboard feed.
          </p>
          <p>
            OnOffMyPC is completely free to get started. All users have full access to hardware status commands, settings, and telemetry history during our public beta.
          </p>
          <p className="pt-4 border-t border-zinc-900 flex flex-wrap gap-4 text-xs">
            <span>
              Need assistance? Drop us a line on our{" "}
              <Link href="/contact" className="text-emerald-400 hover:underline">
                Contact Page
              </Link>.
            </span>
            <span>
              Ready to wire up your board? Read our{" "}
              <Link href="/setup" className="text-emerald-400 hover:underline font-semibold">
                Setup Guide
              </Link>.
            </span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-bold text-lg text-zinc-100">
              <span className="text-emerald-500">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 3v9" />
                  <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
                </svg>
              </span>
              OnOffMyPC
            </span>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Open-source, self-hosted, and cloud-enabled remote power controls for your workstation PCs.
            </p>
          </div>
          <div>
            <h4 className="text-zinc-400 font-semibold text-xs uppercase tracking-wider mb-3">Links</h4>
            <ul className="flex flex-col gap-2 text-xs text-zinc-500 font-medium">
              <li><Link href="/" className="hover:text-zinc-300">Home</Link></li>
              <li><Link href="/setup" className="hover:text-zinc-300">Setup Guide</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-400 font-semibold text-xs uppercase tracking-wider mb-3">Auth</h4>
            <ul className="flex flex-col gap-2 text-xs text-zinc-500 font-medium">
              <li><Link href="/login" className="hover:text-zinc-300">Log in</Link></li>
              <li><Link href="/register" className="hover:text-zinc-300">Create Account</Link></li>
            </ul>
          </div>
          <div className="text-xs text-zinc-600 flex items-end">
            &copy; 2026 OnOffMyPC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
