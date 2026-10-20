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
  version: "0.4.3",
  assets: [
    {
      file: "onoffmypc-android-0.4.3.apk",
      label: "Android APK",
      platform: "Android 8.0+",
      sizeBytes: 9721462,
      sha256: "1952a7c2851cce756538df911464b44f797a6fae38e3ec18047e561dd4e2f328",
    },
  ],
};

export const DESKTOP_RELEASE: ReleaseChannel = {
  version: "0.1.4",
  assets: [
    {
      file: "OnOffMyPC.Setup.0.1.4.exe",
      label: "Windows installer",
      platform: "Windows 10/11, x64",
      sizeBytes: 99100697,
      sha256: "5cb5b695bfb00aa8f7a4fce10d4ededfb03e08a622db56fda52cc80f02c948a2",
    },
    {
      file: "OnOffMyPC-0.1.4.AppImage",
      label: "Linux AppImage",
      platform: "Any distro, x64",
      sizeBytes: 127421351,
      sha256: "4cacc73a5161406e7137d14da813c29575c902eac0c06936ed479e7028a79a86",
    },
    {
      file: "onoffmypc-desktop_0.1.4_amd64.deb",
      label: "Linux .deb",
      platform: "Debian / Ubuntu, amd64",
      sizeBytes: 99526608,
      sha256: "8bc58be6bcf56b5fb1f9aaab4cc81356cfc2f97bc7bbc49ffb4c31ed504cf852",
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
