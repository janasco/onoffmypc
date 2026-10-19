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
 * The values mirror releases/manifest.json in the bucket. Sizes and hashes are
 * shown on the downloads page so a user can verify what they downloaded.
 */

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

export const ANDROID_RELEASE: ReleaseChannel = {
  version: "0.4.2",
  assets: [
    {
      file: "onoffmypc-android-0.4.2.apk",
      label: "Android APK",
      platform: "Android 8.0+",
      sizeBytes: 9721458,
      sha256: "42b5204ca841bdd4694631ca864f6447c2f106006bf20b610b4f43a5b68159dd",
    },
  ],
};

export const DESKTOP_RELEASE: ReleaseChannel = {
  version: "0.1.3",
  assets: [
    {
      file: "OnOffMyPC.Setup.0.1.3.exe",
      label: "Windows installer",
      platform: "Windows 10/11, x64",
      sizeBytes: 99098801,
      sha256: "3791487d02554c73e25b9d5b902a143a1d2baf63c822a56471476c0888c9d45c",
    },
    {
      file: "OnOffMyPC-0.1.3.AppImage",
      label: "Linux AppImage",
      platform: "Any distro, x64",
      sizeBytes: 127421390,
      sha256: "2337f0aa9e5af64c8eea7948b28710bb7396fe6ff286573c5dc14920a5828315",
    },
    {
      file: "onoffmypc-desktop_0.1.3_amd64.deb",
      label: "Linux .deb",
      platform: "Debian / Ubuntu, amd64",
      sizeBytes: 99524228,
      sha256: "49bedbc6257d52fd3374a58b70f40cecd463ea2063c7e7ce4ec41cf63bce1d28",
    },
  ],
};

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
