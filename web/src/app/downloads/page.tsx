import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cpu, Download, Monitor, Play, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import {
  ANDROID_RELEASE,
  DESKTOP_RELEASE,
  RELEASES_MANIFEST_URL,
  assetHref,
  formatBytes,
  type ReleaseChannel,
} from "@/lib/releases";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export const metadata: Metadata = {
  title: "Downloads — OnOffMyPC",
  description: "Download the OnOffMyPC desktop agent and Android app, or flash the ESP32 firmware.",
};

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.onoffmypc.android";

function AssetRow({
  channel,
  asset,
}: {
  channel: "android" | "desktop";
  asset: ReleaseChannel["assets"][number];
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="type-label text-zinc-100">{asset.label}</div>
        <div className="type-metadata mt-0.5 text-zinc-400">
          {asset.platform} · {formatBytes(asset.sizeBytes)}
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <code
            className="type-mono min-w-0 flex-1 truncate text-zinc-400 select-all"
            title={asset.sha256}
          >
            SHA-256 {asset.sha256}
          </code>
          <CopyButton value={asset.sha256} label={`Copy SHA-256 for ${asset.label}`} />
        </div>
      </div>
      <a
        href={assetHref(channel, asset)}
        rel="noopener"
        className="type-label inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-zinc-700 px-3.5 text-zinc-100 transition-colors hover:bg-zinc-800 sm:self-auto"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download
      </a>
    </div>
  );
}

function ChannelCard({
  channel,
  release,
  icon,
  title,
  description,
  footer,
  versionLabel,
}: {
  channel: "android" | "desktop";
  release: ReleaseChannel;
  icon: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
  versionLabel?: string;
}) {
  return (
    <Card className="overflow-hidden ring-zinc-800/80 bg-zinc-900/40">
      <CardHeader className="border-b border-zinc-800/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <CardTitle className="type-card-title text-zinc-50">{title}</CardTitle>
              <span className="type-mono text-zinc-400">
                {versionLabel ?? `v${release.version}`}
              </span>
            </div>
            <CardDescription className="type-body-sm mt-1 text-zinc-400">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-800/60 px-4 sm:px-5">
          {release.assets.map((asset) => (
            <AssetRow key={asset.file} channel={channel} asset={asset} />
          ))}
        </div>
      </CardContent>
      {footer && <div className="border-t border-zinc-800/60 px-4 py-3 sm:px-5">{footer}</div>}
    </Card>
  );
}

export default function DownloadsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader active="downloads" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:py-12">
        <PublicPageHeader
          eyebrow="Release artifacts"
          title="Downloads"
          description="Every artifact is served from Cloudflare R2. Use the copy button next to a SHA-256 hash if you want to verify a download."
        />

        <div className="mt-8 flex flex-col gap-5">
          <ChannelCard
            channel="desktop"
            release={DESKTOP_RELEASE}
            icon={<Monitor className="h-5 w-5" aria-hidden="true" />}
            title="Desktop Agent"
            description="Companion software for Windows and Linux. Reports telemetry and processes shutdown, restart, sleep, lock, and logout commands."
          />

          <ChannelCard
            channel="android"
            release={ANDROID_RELEASE}
            icon={<Smartphone className="h-5 w-5" aria-hidden="true" />}
            title="Android App"
            versionLabel={`Direct APK v${ANDROID_RELEASE.version}`}
            description="Manage and monitor your computers on the go with live status, native controls, and scheduled commands."
            footer={
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="type-metadata text-zinc-400">
                  Recommended: install from Google Play for automatic updates.
                </p>
                <a
                  href={PLAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-label inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 text-zinc-100 transition-colors hover:bg-zinc-800"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Get it on Google Play
                </a>
              </div>
            }
          />

          <Card className="overflow-hidden ring-zinc-800/80 bg-zinc-900/40">
            <CardHeader className="border-b border-zinc-800/60 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Cpu className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="type-card-title text-zinc-50">ESP32 Firmware</CardTitle>
                  <CardDescription className="type-body-sm mt-1 text-zinc-400">
                    Flash the controller straight from your browser. The firmware ships with
                    this site, so there is no separate binary to verify.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/flash"
                  className="type-label inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-zinc-950 transition-colors hover:bg-emerald-400"
                >
                  Flash a gateway →
                </Link>
                <Link
                  href="/setup"
                  className="type-label inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 px-4 text-zinc-200 transition-colors hover:bg-zinc-800"
                >
                  Setup guide
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="type-metadata text-zinc-400">
            Machine-readable release index:{" "}
            <a
              href={RELEASES_MANIFEST_URL}
              className="text-emerald-400 underline-offset-2 hover:underline"
              rel="noopener"
            >
              manifest.json
            </a>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
