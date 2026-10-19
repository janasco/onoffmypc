"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Terms of Service</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Last updated: July 2026
          </p>
        </div>

        <div className="flex flex-col gap-6 text-zinc-300 text-sm leading-relaxed max-w-none">
          <p>
            These Terms of Service (“Terms”) govern your access to and use of OnOffMyPC — the websites,
            web app, mobile apps, APIs, and related services that let you remotely control PC power through
            an ESP32 device (together, the “Service”). The Service is operated under the name
            <strong>OnOffMyPC</strong> (the “Operator”).
          </p>
          <p>
            By creating an account, accessing the Service, or completing a purchase when paid features are
            offered, you agree to these Terms and to our{" "}
            <Link href="/privacy-policy" className="text-emerald-400 hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">1. Eligibility</h2>
          <p>
            You must be at least 16 years old to use the Service. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">2. Accounts</h2>
          <p>
            You must provide a valid email address to register, or sign in with a supported identity provider (for example Google, Apple, or Microsoft). You are responsible for all activity under your account and for keeping credentials and session devices secure. Notify us immediately at support@onoffmypc.com if you believe your account has been compromised.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">3. Acceptable Use</h2>
          <p>You may use the Service only to control hardware that you own or have explicit permission to control. You must not:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li>Access, register, or control devices without authorization from the owner.</li>
            <li>Attempt to bypass authentication, entitlement, rate limits, or security controls.</li>
            <li>Interfere with other users’ devices, accounts, or the Service infrastructure.</li>
            <li>Use the Service for unlawful surveillance, harassment, fraud, or other illegal activity.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">4. Service Availability</h2>
          <p>
            OnOffMyPC is a live production service. We use commercially reasonable efforts to keep it available, but we do not guarantee uninterrupted uptime, and we make no guarantees that commands sent through the Service will be delivered or executed. Do not rely on this Service for time-critical, life-safety, industrial, medical, or other safety-critical operations.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">5. Disclaimer of Warranties</h2>
          <p className="uppercase text-zinc-400 text-xs">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">6. Limitation of Liability</h2>
          <p className="uppercase text-zinc-400 text-xs">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR AND ITS SUPPLIERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, BUSINESS INTERRUPTION, OR COST OF SUBSTITUTE SERVICES, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
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
