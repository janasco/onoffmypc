"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Gate = "loading" | "in" | "out";

const primaryLink =
  "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald-800";
const secondaryLink =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary";

/**
 * Account-gated ESP Web Tools flasher.
 *
 * The account is a product gate (pairing + control need it); flashing itself is
 * a local Web Serial operation. The firmware binaries are still public files.
 * `?channel=rc` selects the bench manifest without exposing it in the UI.
 */
export function FirmwareFlasher() {
  const [gate, setGate] = useState<Gate>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [channel, setChannel] = useState<"stable" | "rc">("stable");

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    // Client-only query parameter; the stable build is the SSR default.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("channel") === "rc") setChannel("rc");

    api.me<{ email?: string }>().then(({ data }) => {
      if (!alive) return;
      if (data) {
        setEmail(data.email ?? null);
        setGate("in");
      } else {
        setGate("out");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (gate === "loading") {
    return <p className="text-sm text-muted-foreground">Checking your account…</p>;
  }

  if (gate === "out") {
    return (
      <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Create an account to flash</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You need an OnOffMyPC account to pair the gateway and control it from the app.
          Flashing runs locally in your browser; no account data is sent to the board.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/register?next=/flash" className={primaryLink}>
            Create account
          </Link>
          <Link href="/login?next=/flash" className={secondaryLink}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email ?? "your account"}</span>
        </p>
        {channel === "rc" && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Beta 1.4.0-rc1 — bench only
          </span>
        )}
      </div>

      <Script
        type="module"
        src="/vendor/esp-web-tools/install-button.js"
        strategy="lazyOnload"
      />

      {/* @ts-expect-error custom element provided by the vendored ESP Web Tools bundle */}
      <esp-web-install-button
        manifest={channel === "rc" ? "/firmware/manifest-rc.json" : "/firmware/manifest.json"}
      >
        <button
          slot="activate"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald-800"
        >
          ⚡ Flash ESP32 gateway
        </button>
        <span slot="unsupported" className="mt-2 block text-xs text-amber-800">
          Your browser does not support Web Serial. Use Chrome or Edge on a desktop
          computer over HTTPS.
        </span>
        <span slot="not-allowed" className="mt-2 block text-xs text-amber-800">
          Flashing requires an active secure (HTTPS) connection.
        </span>
      {/* @ts-expect-error closing tag of the custom element above */}
      </esp-web-install-button>

      <p className="mt-3 text-xs text-muted-foreground">
        Use a USB <span className="font-medium text-foreground">data</span> cable, not a charge-only
        cable. If the board is not detected, hold <span className="font-medium text-foreground">BOOT</span>{" "}
        while plugging it in.
      </p>
    </div>
  );
}
