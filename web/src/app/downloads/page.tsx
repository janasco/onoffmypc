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
        <div className="type-label text-foreground">{asset.label}</div>
        <div className="type-metadata mt-0.5 text-muted-foreground">
          {asset.platform} · {formatBytes(asset.sizeBytes)}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1 rounded-md border border-border bg-secondary/50 py-1 pl-2 pr-1">
          <span className="type-metadata shrink-0 text-muted-foreground">SHA-256</span>
          <code
            className="type-mono min-w-0 flex-1 break-all text-foreground select-all"
            title={asset.sha256}
          >
            {asset.sha256}
          </code>
          <CopyButton value={asset.sha256} label={`Copy SHA-256 for ${asset.label}`} />
        </div>
      </div>
      <a
        href={assetHref(channel, asset)}
        rel="noopener"
        className="type-label inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-border bg-card px-3.5 text-foreground transition-colors hover:border-emerald-300 hover:bg-secondary/70 sm:self-auto"
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
    <Card className="overflow-hidden bg-card ring-border">
      <CardHeader className="border-b border-border p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-emerald-800">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <CardTitle as="h2" className="type-card-title text-foreground">{title}</CardTitle>
              <span className="type-mono text-muted-foreground">
                {versionLabel ?? `v${release.version}`}
              </span>
            </div>
            <CardDescription className="type-body-sm mt-1 text-muted-foreground">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border px-4 sm:px-5">
          {release.assets.map((asset) => (
            <AssetRow key={asset.file} channel={channel} asset={asset} />
          ))}
        </div>
      </CardContent>
      {footer && <div className="border-t border-border px-4 py-3 sm:px-5">{footer}</div>}
    </Card>
  );
}

export default function DownloadsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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
                <p className="type-metadata text-muted-foreground">
                  Recommended: install from Google Play for automatic updates.
                </p>
                <a
                  href={PLAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-label inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-foreground transition-colors hover:border-emerald-300 hover:bg-secondary/70"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Get it on Google Play
                </a>
              </div>
            }
          />

          <Card className="overflow-hidden bg-card ring-border">
            <CardHeader className="border-b border-border p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-emerald-800">
                  <Cpu className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <CardTitle as="h2" className="type-card-title text-foreground">ESP32 Firmware</CardTitle>
                  <CardDescription className="type-body-sm mt-1 text-muted-foreground">
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
                  className="type-label inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground transition-colors hover:bg-emerald-800"
                >
                  Flash a gateway →
                </Link>
                <Link
                  href="/setup"
                  className="type-label inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-foreground transition-colors hover:border-emerald-300 hover:bg-secondary/70"
                >
                  Setup guide
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="type-metadata text-muted-foreground">
            Machine-readable release index:{" "}
            <a
              href={RELEASES_MANIFEST_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
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
