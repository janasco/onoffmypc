"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Privacy Policy</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Last updated: July 2026
          </p>
        </div>

        <div className="flex flex-col gap-6 text-zinc-300 text-sm leading-relaxed max-w-none">
          <p>
            This Privacy Policy explains how OnOffMyPC (“we”, “us”, “Operator”) collects, uses, and shares
            personal data when you use our websites, web app, mobile apps, and APIs (the “Service”).
            For consumer accounts we act as the <strong>data controller</strong> for account and device
            data we store to provide the Service.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">What we collect</h2>
          <p>
            <strong>Account:</strong> Email address; hashed password when you register with email/password
            (we never store passwords in plain text); account timestamps; and, if you use social sign-in,
            the provider subject identifier and email shared by that provider (Google, Apple, or Microsoft).
          </p>
          <p><strong>Devices and usage:</strong> When your ESP32 device is connected, we receive and store:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li>Commands you send (power on, power off, reset) and their delivery status</li>
            <li>Telemetry: PC power state, room temperature, room humidity, Wi-Fi signal strength</li>
            <li>Device registration details you provide (name, firmware version, last-seen time)</li>
            <li>Scheduled commands you create</li>
          </ul>
          <p>
            <strong>Push notifications:</strong> If you enable notifications in a supported mobile app, we
            store a push-notification token so we can send alerts (for example device offline/online or
            command delivered/failed). Android uses Google Firebase Cloud Messaging (FCM).
          </p>
          <p>
            <strong>Billing:</strong> Checkout is provided by Polar, our merchant of record. Polar collects contact, billing, tax, and payment details. We do not receive or store your full card number. We store Polar checkout, customer, order, receipt, amount, currency, refund status, and device identifiers so we can grant access and show purchase history.
          </p>
          <p>
            <strong>Security and operations:</strong> Client IP addresses are used transiently for rate
            limiting and may be recorded in a security audit log for security-relevant events. We may
            receive messages you send via the contact form. We do not use advertising or analytics SDKs in the OnOffMyPC apps, and we do not sell personal data.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">Why we use it</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li><strong>Provide the Service</strong> — authenticate you, route commands, show status and history, send transactional email, and deliver push alerts.</li>
            <li><strong>Secure the Service</strong> — rate limiting, abuse prevention, audit logging.</li>
            <li><strong>Billing</strong> — grant device unlocks and reconcile Polar notifications when paid features are enabled.</li>
            <li><strong>Support</strong> — respond to privacy or support requests.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">Subprocessors</h2>
          <p>We use these processors to run the Service:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li><strong>Cloudflare</strong> — Workers, D1, Durable Objects, Pages, and edge hosting.</li>
            <li><strong>Resend</strong> — transactional email (verification, password reset).</li>
            <li><strong>Polar</strong> — hosted checkout/payments and invoice reconciliations.</li>
            <li><strong>Google Firebase</strong> — Cloud Messaging push delivery.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">Retention</h2>
          <p>We apply the following retention windows in production:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li><strong>Raw telemetry</strong> — 30 days (max 2,000 rows per device).</li>
            <li><strong>Hourly telemetry aggregates</strong> — 90 days.</li>
            <li><strong>Commands &amp; logs</strong> — 30 days.</li>
            <li><strong>Finished scheduled commands</strong> — 30 days after run/cancellation.</li>
            <li><strong>Security audit logs</strong> — 180 days.</li>
            <li><strong>Accounts and devices</strong> — until you delete them; account deletion has a <strong>15-day grace period</strong> before permanent purge.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">Your rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, delete, restrict, or object to certain processing, and to data portability. You can download a machine-readable copy of your account data anytime from the web app under <strong>Account → Download my data</strong> (JSON export). To exercise these rights, email us at <a href="mailto:privacy@onoffmypc.com" className="text-emerald-400 hover:underline">privacy@onoffmypc.com</a>.
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
