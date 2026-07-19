"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // Honeypot field
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" | "info" | null }>({
    text: "",
    type: null,
  });
  const [loading, setLoading] = useState(false);

  const SUPPORT_EMAIL = "support@onoffmypc.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus({ text: "Sending message…", type: "info" });

    const payload = {
      name,
      email,
      message,
      company,
    };

    try {
      const res = await fetch("https://api.onoffmypc.com/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setName("");
        setEmail("");
        setMessage("");
        setStatus({
          text: "Thanks — your message has been sent successfully. We’ll be in touch soon.",
          type: "success",
        });
      } else {
        setStatus({
          text: data.error || `Something went wrong. Please email us directly at ${SUPPORT_EMAIL}.`,
          type: "error",
        });
      }
    } catch (err) {
      setStatus({
        text: `Network connection failed. Please contact support via email at ${SUPPORT_EMAIL}.`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Contact &amp; Support</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Get help, request features, or report firmware bugs. We reply within 24–48 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card className="bg-zinc-900/40 border-zinc-800 p-4">
            <h3 className="text-sm font-bold text-zinc-200">Email Support</h3>
            <p className="text-xs text-zinc-500 mt-1">For accounts, billing, security disclosures, or enterprise setups.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-xs text-emerald-400 hover:underline font-semibold block mt-3">
              {SUPPORT_EMAIL}
            </a>
          </Card>
          <Card className="bg-zinc-900/40 border-zinc-800 p-4">
            <h3 className="text-sm font-bold text-zinc-200">Report a Bug</h3>
            <p className="text-xs text-zinc-500 mt-1">Spotted an issue on the firmware, dashboard, or apps? Open a GitHub ticket.</p>
            <a href="https://github.com/onoffmypc/onoffmypc-release/issues" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline font-semibold block mt-3">
              github.com/onoffmypc/issues
            </a>
          </Card>
        </div>

        {/* Message Form */}
        <Card className="bg-zinc-900/50 border-zinc-800 max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-zinc-100">Send a Message</CardTitle>
            <CardDescription className="text-xs text-zinc-400">Fill in the details below to message support.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-zinc-400">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 h-9 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-zinc-400">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={200}
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 h-9 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="message" className="text-xs font-semibold text-zinc-400">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[100px] transition-colors"
                />
              </div>

              {/* Honeypot field (hidden from screen reader and keyboard, bots will fill it) */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="absolute opacity-0 pointer-events-none -z-50"
                aria-hidden="true"
              />

              {status.text && (
                <div className={`text-xs p-3 rounded border font-medium ${
                  status.type === "success" ? "bg-emerald-950/80 border-emerald-900/50 text-emerald-400" :
                  status.type === "error" ? "bg-red-950/80 border-red-900/50 text-red-400" :
                  "bg-zinc-950/80 border-zinc-800 text-zinc-400"
                }`}>
                  {status.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 w-full mt-2 cursor-pointer"
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
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
