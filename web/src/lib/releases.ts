/**
 * Release artifacts live on Cloudflare R2, served from
 * https://releases.onoffmypc.com. GitHub holds source only.
 *
 * This module is the single place a version bump happens. When a release is
 * published:
 *   1. build the artifacts locally,
 *   2. upload them with scripts/migrate-releases-to-r2.sh (or `wrangler r2
 *      object put`), using the same key layout,
 *   3. update the version / file / size / sha256 below.
 *
 * The version / file / size / sha256 values live in src/data/releases.json and
 * mirror releases/manifest.json in the bucket. Sizes and hashes are shown on
 * the downloads page so a user can verify what they downloaded. After
 * publishing, run `npm run releases:check` — it fails when the local data and
 * the live manifest disagree.
 */

import releaseData from "../data/releases.json";

export const RELEASES_BASE_URL = "https://releases.onoffmypc.com";

export interface ReleaseAsset {
  /** Filename as uploaded to R2. */
  file: string;
  /** Human-facing label. */
  label: string;
  /** Platform hint shown as secondary text. */
  platform: string;
  sizeBytes: number;
  sha256: string;
}

export interface ReleaseChannel {
  version: string;
  assets: ReleaseAsset[];
}

export const ANDROID_RELEASE: ReleaseChannel = releaseData.android;
export const DESKTOP_RELEASE: ReleaseChannel = releaseData.desktop;

function assetUrl(channel: "android" | "desktop", version: string, file: string): string {
  return `${RELEASES_BASE_URL}/releases/${channel}/${version}/${encodeURIComponent(file)}`;
}

export function assetHref(channel: "android" | "desktop", asset: ReleaseAsset): string {
  const version = channel === "android" ? ANDROID_RELEASE.version : DESKTOP_RELEASE.version;
  return assetUrl(channel, version, asset.file);
}

/** Stable pointer to the machine-readable manifest for tooling. */
export const RELEASES_MANIFEST_URL = `${RELEASES_BASE_URL}/releases/manifest.json`;

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
