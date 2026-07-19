"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DpaPage() {
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
      <main className="flex-1 max-w-3xl mx-auto px-4 py-16 w-full">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Data Processing Addendum</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Draft template — July 2026
          </p>
        </div>

        <div className="flex flex-col gap-6 text-zinc-300 text-sm leading-relaxed max-w-none">
          <p>
            <strong>Status:</strong> This page is a <em>draft template</em> for business customers. It becomes effective only when Customer and OnOffMyPC execute it in writing or it is incorporated into a signed{" "}
            <Link href="/msa" className="text-emerald-400 hover:underline font-semibold">
              Master Service Agreement
            </Link>
            . Consumer self-serve accounts are governed by the Privacy Policy and Terms of Service, not this DPA.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">1. Parties and Roles</h2>
          <p>
            <strong>“OnOffMyPC” / “Processor”</strong> means the Operator of the OnOffMyPC Service.{" "}
            <strong>“Customer” / “Controller”</strong> means the business entity determining the purposes of processing Personal Data. Processor processes data solely on Customer instructions.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">2. Subject Matter and Nature of Processing</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li><strong>Subject matter:</strong> hosting and operation of remote PC power-control accounts, devices, commands, and telemetry.</li>
            <li><strong>Purpose:</strong> providing the Service to Customer as agreed.</li>
            <li><strong>Types of Personal Data:</strong> account emails, device logs, command histories, push tokens, and diagnostic IPs.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">3. Security Measures</h2>
          <p>
            Processor implements transport encryption (TLS), hashing passwords, rate limits, access controls, and database sanitizations to protect Personal Data.
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
