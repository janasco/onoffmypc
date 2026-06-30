# Releasing firmware

A release publishes the compiled binaries to the public release repo **and** updates
the one-click web flasher on the marketing site, so users always get the latest build.

## Automated (recommended)

1. Bump `FIRMWARE_VERSION` in `src/main.cpp`.
2. Add the matching section to `CHANGELOG.md` (the release notes are pulled from it).
3. Commit, then tag and push:
   ```bash
   git commit -am "release: v1.3.0"
   git tag -a v1.3.0 -m "v1.3.0"
   git push origin main v1.3.0
   ```

The tag push triggers `.github/workflows/release.yml`, which:
1. builds + merges the flashable image, app image, and checksums (`tools/release.sh`);
2. verifies the tag matches `FIRMWARE_VERSION`;
3. creates the GitHub Release on `onoffmypc/onoffmypc-firmware-release`;
4. updates `onoffmypc/onoffmypc-web` (`firmware/manifest.json` + the new `.bin`) and deploys the marketing site.

### Required repository secrets
| Secret | Purpose |
|---|---|
| `RELEASE_REPO_TOKEN` | PAT with `contents:write` on `onoffmypc-firmware-release` |
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

Then create the GitHub Release on `onoffmypc-firmware-release` with the binaries +
checksums, copy `manifest.json` and the `.bin` into `onoffmypc-web/firmware/`, and
deploy the marketing site (`wrangler pages deploy . --project-name onoffmypc-web`).
