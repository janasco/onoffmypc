import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ANDROID_RELEASE,
  DESKTOP_RELEASE,
  RELEASES_MANIFEST_URL,
  assetHref,
  formatBytes,
  type ReleaseChannel,
} from "@/lib/releases";

export const metadata: Metadata = {
  title: "Downloads — OnOffMyPC",
  description: "Download the OnOffMyPC desktop agent and Android app, or flash the ESP32 firmware.",
};

function AssetRow({ channel, asset }: { channel: "android" | "desktop"; asset: ReleaseChannel["assets"][number] }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-200">{asset.label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {asset.platform} · {formatBytes(asset.sizeBytes)}
        </div>
        <div className="text-[10px] font-mono text-zinc-600 mt-1 truncate" title={asset.sha256}>
          SHA-256 {asset.sha256}
        </div>
      </div>
      <a href={assetHref(channel, asset)} rel="noopener">
        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 whitespace-nowrap">
          Download
        </Button>
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
}: {
  channel: "android" | "desktop";
  release: ReleaseChannel;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="bg-zinc-900/40 border-zinc-800/80">
      <CardHeader>
        <span className="text-3xl text-emerald-500 mb-1 block">{icon}</span>
        <CardTitle className="text-zinc-100 text-lg">{title}</CardTitle>
        <CardDescription className="text-zinc-400 mt-1 text-sm">{description}</CardDescription>
        <p className="text-xs text-zinc-500 mt-2">
          Version <span className="font-mono text-zinc-300">{release.version}</span>
        </p>
      </CardHeader>
      <CardContent>
        {release.assets.map((asset) => (
          <AssetRow key={asset.file} channel={channel} asset={asset} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
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

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Downloads</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Every artifact is served from Cloudflare R2. Check the SHA-256 against the file you
            downloaded if you want to be sure it transferred intact.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <ChannelCard
            channel="desktop"
            release={DESKTOP_RELEASE}
            icon="🖳"
            title="Desktop Agent"
            description="Companion software for Windows and Linux. Reports telemetry (CPU, RAM, GPU) and processes shutdown, restart, sleep, lock and logout commands."
          />
          <ChannelCard
            channel="android"
            release={ANDROID_RELEASE}
            icon="🤖"
            title="Android App"
            description="Manage and monitor your computers on the go with real-time status updates and native controls."
          />

          <Card className="bg-zinc-900/40 border-zinc-800/80">
            <CardHeader>
              <span className="text-3xl text-emerald-500 mb-1 block">🔌</span>
              <CardTitle className="text-zinc-100 text-lg">ESP32 Firmware</CardTitle>
              <CardDescription className="text-zinc-400 mt-1 text-sm">
                Flash the controller straight from your browser, or use the binary manually. The
                firmware ships with this site, so there is no download to verify separately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/setup">
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                  Go to the setup guide →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <p className="text-xs text-zinc-500">
            Machine-readable release index:{" "}
            <a href={RELEASES_MANIFEST_URL} className="text-emerald-400 hover:underline" rel="noopener">
              manifest.json
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 text-xs text-zinc-600">
          © 2026 OnOffMyPC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
