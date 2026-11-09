import { test } from "node:test";
import assert from "node:assert/strict";
import { compareReleaseData, type LocalReleases, type Manifest } from "../scripts/check-releases.ts";

const local: LocalReleases = {
  android: {
    version: "1.2.3",
    assets: [{ file: "app.apk", sizeBytes: 100, sha256: "aabb" }],
  },
  desktop: {
    version: "0.4.0",
    assets: [
      { file: "setup.exe", sizeBytes: 200, sha256: "ccdd" },
      { file: "app.AppImage", sizeBytes: 300, sha256: "eeff" },
    ],
  },
};

const manifest: Manifest = {
  families: {
    android: {
      version: "1.2.3",
      assets: [{ name: "app.apk", size: 100, sha256: "aabb", url: "https://example.test/app.apk" }],
    },
    desktop: {
      version: "0.4.0",
      assets: [
        { name: "app.AppImage", size: 300, sha256: "eeff", url: "https://example.test/app.AppImage" },
        { name: "setup.exe", size: 200, sha256: "ccdd", url: "https://example.test/setup.exe" },
      ],
    },
  },
};

test("matching release data has no errors regardless of manifest asset order", () => {
  assert.deepEqual(compareReleaseData(local, manifest), []);
});

test("a version mismatch is reported", () => {
  const drifted: Manifest = {
    families: { ...manifest.families, android: { ...manifest.families?.android, version: "1.2.4" } },
  };
  assert.match(compareReleaseData(local, drifted).join("\n"), /android: local version 1\.2\.3 != manifest 1\.2\.4/);
});

test("a size or hash mismatch is reported per asset", () => {
  const drifted: Manifest = {
    families: {
      ...manifest.families,
      android: {
        version: "1.2.3",
        assets: [{ name: "app.apk", size: 101, sha256: "deadbeef", url: "https://example.test/app.apk" }],
      },
    },
  };
  const errors = compareReleaseData(local, drifted).join("\n");
  assert.match(errors, /app\.apk size 100 != manifest 101/);
  assert.match(errors, /app\.apk sha256 differs/);
});

test("assets missing on either side are reported", () => {
  const drifted: Manifest = {
    families: {
      ...manifest.families,
      desktop: {
        version: "0.4.0",
        assets: [{ name: "setup.exe", size: 200, sha256: "ccdd", url: "https://example.test/setup.exe" }],
      },
    },
  };
  const errors = compareReleaseData(local, drifted).join("\n");
  assert.match(errors, /app\.AppImage listed locally but absent from the manifest/);
});

test("a family listed locally but absent from the manifest is reported", () => {
  const errors = compareReleaseData(local, { families: { android: manifest.families!.android! } }).join("\n");
  assert.match(errors, /desktop: listed in src\/data\/releases\.json but absent from the published manifest/);
});

test("hashes compare case-insensitively", () => {
  const upper: Manifest = {
    families: {
      android: {
        version: "1.2.3",
        assets: [{ name: "app.apk", size: 100, sha256: "AABB", url: "https://example.test/app.apk" }],
      },
      desktop: manifest.families!.desktop!,
    },
  };
  assert.deepEqual(compareReleaseData(local, upper), []);
});
