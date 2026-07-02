# Releasing firmware

A release publishes the compiled binaries to the public release repo **and** updates
the one-click web flasher on the marketing site, so users always get the latest build.

## Automated (recommended)

1. Bump `FIRMWARE_VERSION` in `src/main.cpp`.
2. Add the matching section to `CHANGELOG.md` (the release notes are pulled from it).
3. Commit, then tag and push (firmware tags are prefixed `fw-v` so they don't
   collide with the Android app's `app-v` tags in the shared release repo):
   ```bash
   git commit -am "release: v1.3.0"
   git tag -a fw-v1.3.0 -m "fw-v1.3.0"
   git push origin main fw-v1.3.0
   ```

The tag push triggers `.github/workflows/release.yml`, which:
1. verifies the tag's base version matches `FIRMWARE_VERSION` (fails fast, before building);
2. builds + merges the flashable image, app image, and checksums (`tools/release.sh`);
3. creates the GitHub Release on `onoffmypc/onoffmypc-release`;
4. updates `onoffmypc/onoffmypc-web` (`firmware/manifest.json` + the new `.bin`) and deploys the marketing site.

## Rehearsing safely (pre-release tags)

A tag with a hyphen suffix is treated as a **pre-release**: it builds and publishes a
GitHub pre-release, but **skips** the web-flasher update and marketing deploy — so you
can exercise the full build + publish path without touching the live flasher. The base
version must still match `FIRMWARE_VERSION` (e.g. `FIRMWARE_VERSION = "1.3.0"` → tag
`fw-v1.3.0-rc1`).

```bash
git tag fw-v1.3.0-rc1 && git push origin fw-v1.3.0-rc1
# publishes a pre-release only; delete it and the tag afterwards if it was just a test
```

A clean tag (`fw-v1.3.0`, no suffix) runs the full pipeline including the web flasher and deploy.

### Required repository secrets
| Secret | Purpose |
|---|---|
| `RELEASE_REPO_TOKEN` | PAT with `contents:write` on `onoffmypc-release` |
| `WEB_REPO_TOKEN` | PAT with `contents:write` on `onoffmypc-web` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare token with `Pages:Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |

## Manual fallback

Run the same build locally, then upload by hand:

```bash
./tools/release.sh         # outputs to dist/
```

Produces in `dist/`:
- `onoffmypc-firmware-<version>.bin` — complete image, flash at `0x0`
- `onoffmypc-firmware-<version>-app.bin` — application-only image (`0x10000`)
- `SHA256SUMS-<version>.txt`
- `manifest.json` — copy to `onoffmypc-web/firmware/` (with the `.bin`) for the flasher
- `RELEASE_NOTES.md`

Then create the GitHub Release on `onoffmypc-release` with the binaries +
checksums, copy `manifest.json` and the `.bin` into `onoffmypc-web/firmware/`, and
deploy the marketing site (`wrangler pages deploy . --project-name onoffmypc-web`).
