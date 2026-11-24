"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

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
    } catch {
      setStatus({
        text: `Network connection failed. Please contact support via email at ${SUPPORT_EMAIL}.`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "type-body w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 placeholder:text-zinc-400 transition-colors focus-visible:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40";
  const inputClass = `${fieldClass} h-11`;
  const textareaClass = `${fieldClass} min-h-[132px] py-2.5`;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Support"
          title="Contact & Support"
          description="Get help, request features, or report firmware bugs. We reply within 24–48 hours."
        />

        <section aria-labelledby="support-channels" className="mt-8">
          <h2 id="support-channels" className="type-section-title text-zinc-50">
            Support channels
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="type-card-title text-zinc-100">Email Support</h3>
              <p className="type-body-sm mt-1.5 text-zinc-400">
                For accounts, billing, security disclosures, or enterprise setups.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="type-label mt-3 inline-block break-all text-emerald-400 underline-offset-2 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="type-card-title text-zinc-100">Report a Bug</h3>
              <p className="type-body-sm mt-1.5 text-zinc-400">
                Spotted an issue on the firmware, dashboard, or apps? Open a GitHub ticket.
              </p>
              <a
                href="https://github.com/janasco/onoffmypc/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="type-label mt-3 inline-block break-all text-emerald-400 underline-offset-2 hover:underline"
              >
                github.com/janasco/onoffmypc/issues
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="send-message" className="mt-10">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
            <h2 id="send-message" className="type-section-title text-zinc-50">
              Send a Message
            </h2>
            <p className="type-body mt-2 text-zinc-400">Fill in the details below to message support.</p>

            <form onSubmit={handleSubmit} className="mt-6 flex max-w-xl flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="type-label text-zinc-200">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="type-label text-zinc-200">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={200}
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="type-label text-zinc-200">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  required
                  className={textareaClass}
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
                className="pointer-events-none absolute -z-50 opacity-0"
                aria-hidden="true"
              />

              {status.text && (
                <div
                  role={status.type === "error" ? "alert" : "status"}
                  aria-live={status.type === "error" ? "assertive" : "polite"}
                  className={`type-body-sm rounded-lg border p-3 ${
                    status.type === "success"
                      ? "border-emerald-900/50 bg-emerald-950/80 text-emerald-300"
                      : status.type === "error"
                        ? "border-red-900/50 bg-red-950/80 text-red-300"
                        : "border-zinc-800 bg-zinc-950/80 text-zinc-300"
                  }`}
                >
                  {status.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="type-label h-11 w-full cursor-pointer bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
