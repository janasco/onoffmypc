"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RefundPolicyPage() {
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
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Refund Policy</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Last updated: July 2026
          </p>
        </div>

        <div className="flex flex-col gap-6 text-zinc-300 text-sm leading-relaxed max-w-none">
          <p>
            This Refund Policy applies to paid OnOffMyPC device unlocks and related purchases when billing
            is enabled. During the public free launch, paid unlocks may not be offered; this policy applies
            when checkout is available. It supplements the{" "}
            <Link href="/terms" className="text-emerald-400 hover:underline">
              Terms of Service
            </Link>
            .
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">Merchant of Record</h2>
          <p>
            When paid unlocks are offered, payment collection, taxes, invoices, receipts, and refund
            processing are handled by Polar, which acts as merchant of record and authorised reseller. By completing checkout you also agree to Polar’s Checkout Buyer Terms. Polar’s systems and policies may set final timing and eligibility for refund issuance to your original payment method.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">What you buy</h2>
          <p>
            A device unlock is typically a one-time purchase that unlocks remote control for the specific logical device record selected at checkout — not a recurring subscription — unless we clearly state otherwise at purchase. Unlock entitlement is tied to that cloud device record in your account, not automatically to a physical ESP32 serial number or a replacement board.
          </p>

          <h2 className="text-xl font-bold text-zinc-100 mt-6 border-b border-zinc-900 pb-2">How to request a refund</h2>
          <p>
            Email us directly at <a href="mailto:support@onoffmypc.com" className="text-emerald-400 hover:underline">support@onoffmypc.com</a> with:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400">
            <li>The email address on your OnOffMyPC account</li>
            <li>Order or receipt reference if you have it (Polar receipt or order ID)</li>
            <li>Which device unlock the request concerns</li>
            <li>A short explanation of the issues or reasons</li>
          </ul>
          <p>
            For unused unlocks (little or no productive use of paid remote control after purchase), please contact us within <strong>14 days</strong> of purchase. Approved refunds revoke the corresponding device unlock entitlement.
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
