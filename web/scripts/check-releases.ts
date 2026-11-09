/**
 * Verify that the release metadata rendered by the web app agrees with the
 * manifest actually published to R2.
 *
 * The downloads page shows a size and SHA-256 per artifact so users can verify
 * what they downloaded. Those values live in `src/data/releases.json`; the
 * bucket's `releases/manifest.json` is authoritative. A release is only
 * complete when the two agree.
 *
 *   npm run releases:check              # metadata only (fast)
 *   npm run releases:check -- --verify  # also download and hash every artifact
 *   npm run releases:check -- --manifest https://.../manifest.json
 *
 * Exits 1 on any mismatch. No dependencies; Node 22+.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type LocalAsset = {
  file: string;
  sizeBytes: number;
  sha256: string;
  label?: string;
  platform?: string;
};

export type LocalChannel = {
  version: string;
  assets: LocalAsset[];
};

export type LocalReleases = Record<string, LocalChannel>;

export type ManifestAsset = {
  name: string;
  size: number;
  sha256: string;
  url: string;
};

export type Manifest = {
  families?: Record<string, { version?: string; assets?: ManifestAsset[] }>;
};

export const DEFAULT_MANIFEST_URL = "https://releases.onoffmypc.com/releases/manifest.json";

/**
 * Compare the local release data with the published manifest for every family
 * the web app renders. Returns a list of human-readable errors; empty is good.
 */
export function compareReleaseData(local: LocalReleases, manifest: Manifest): string[] {
  const errors: string[] = [];
  const families = manifest.families ?? {};

  for (const family of Object.keys(local).sort()) {
    const localChannel = local[family];
    const published = families[family];

    if (!published) {
      errors.push(`${family}: listed in src/data/releases.json but absent from the published manifest`);
      continue;
    }
    if (String(localChannel.version) !== String(published.version ?? "")) {
      errors.push(`${family}: local version ${localChannel.version} != manifest ${published.version ?? "(missing)"}`);
    }

    const localAssets = new Map((localChannel.assets ?? []).map((asset) => [asset.file, asset]));
    const publishedAssets = new Map((published.assets ?? []).map((asset) => [asset.name, asset]));

    for (const name of localAssets.keys()) {
      if (!publishedAssets.has(name)) errors.push(`${family}: ${name} listed locally but absent from the manifest`);
    }
    for (const name of publishedAssets.keys()) {
      if (!localAssets.has(name)) errors.push(`${family}: ${name} in the manifest but absent locally`);
    }

    for (const [name, localAsset] of localAssets) {
      const publishedAsset = publishedAssets.get(name);
      if (!publishedAsset) continue;
      if (Number(localAsset.sizeBytes) !== Number(publishedAsset.size)) {
        errors.push(`${family}: ${name} size ${localAsset.sizeBytes} != manifest ${publishedAsset.size}`);
      }
      if (String(localAsset.sha256).toLowerCase() !== String(publishedAsset.sha256).toLowerCase()) {
        errors.push(`${family}: ${name} sha256 differs from the manifest`);
      }
    }
  }

  return errors;
}

/** Download a URL and return its length and SHA-256 without buffering it all. */
export async function hashUrl(url: string): Promise<{ size: number; sha256: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} for ${url}`);

  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    hash.update(chunk);
    size += chunk.byteLength;
  }
  return { size, sha256: hash.digest("hex") };
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const verifyArtifacts = args.includes("--verify");
  const manifestIndex = args.indexOf("--manifest");
  const manifestUrl =
    manifestIndex >= 0 && args[manifestIndex + 1] ? args[manifestIndex + 1] : DEFAULT_MANIFEST_URL;

  const here = dirname(fileURLToPath(import.meta.url));
  const dataPath = join(here, "..", "src", "data", "releases.json");
  const local = JSON.parse(await readFile(dataPath, "utf8")) as LocalReleases;

  const response = await fetch(manifestUrl, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    console.error(`releases:check: ${manifestUrl} returned HTTP ${response.status}`);
    return 1;
  }
  const manifest = (await response.json()) as Manifest;

  const errors = compareReleaseData(local, manifest);
  if (errors.length > 0) {
    console.error("releases:check: local release data does not match the published manifest:");
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }

  const summary = Object.entries(local)
    .map(([family, channel]) => `${family} ${channel.version} (${channel.assets.length} asset${channel.assets.length === 1 ? "" : "s"})`)
    .join(", ");
  console.log(`releases:check: metadata OK — ${summary}`);

  if (verifyArtifacts) {
    for (const [family, channel] of Object.entries(local)) {
      for (const asset of channel.assets) {
        const published = manifest.families?.[family]?.assets?.find((item) => item.name === asset.file);
        if (!published) continue;
        console.log(`  downloading ${family}/${asset.file} (${formatBytes(asset.sizeBytes)})…`);
        const actual = await hashUrl(published.url);
        if (actual.size !== asset.sizeBytes || actual.sha256.toLowerCase() !== asset.sha256.toLowerCase()) {
          console.error(
            `releases:check: ${family}/${asset.file} downloaded ${actual.size} bytes / ${actual.sha256}` +
              ` but the page advertises ${asset.sizeBytes} / ${asset.sha256}`,
          );
          return 1;
        }
      }
    }
    console.log("releases:check: downloaded artifacts match the advertised size and SHA-256");
  }

  return 0;
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = await main();
}
