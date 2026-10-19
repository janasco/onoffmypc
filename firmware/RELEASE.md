# Releasing firmware

Firmware ships **with the web app**: the one-click flasher and the manual
download both read `web/public/firmware/`. There is no GitHub Actions pipeline
and no GitHub Release — releases are built and published by hand.

## Cutting a release

1. Bump `FIRMWARE_VERSION` in `src/main.cpp` and confirm compatibility with
   existing devices.
2. Add the matching section to `CHANGELOG.md` — the release notes are pulled
   from it.
3. Build the artifacts:

   ```bash
   ./tools/release.sh
   ```

   Produces in `dist/`:

   - `onoffmypc-firmware-<version>.bin` — complete image, flash at `0x0`
   - `onoffmypc-firmware-<version>-app.bin` — application-only image (`0x10000`)
   - `SHA256SUMS-<version>.txt`
   - `manifest.json` — the flasher manifest
   - `RELEASE_NOTES.md`

4. Verify the image before publishing — the checksum file is generated from the
   same build, so compare against a second, independent run if the change
   touches the boot path:

   ```bash
   cd dist && sha256sum -c SHA256SUMS-<version>.txt
   ```

5. Copy the new binary and manifest into the web app, replacing the previous
   pair so the flasher only ever serves one current version:

   ```bash
   cp dist/onoffmypc-firmware-<version>.bin web/public/firmware/
   cp dist/manifest.json                    web/public/firmware/manifest.json
   rm -f web/public/firmware/onoffmypc-firmware-<old-version>.bin
   ```

   The setup guide's manual-download link in `web/src/app/setup/page.tsx` names
   the binary explicitly — update it in the same commit.

6. Commit, then deploy the web app.

Optional mirror for archival: the `.bin` and checksums can also be uploaded to
R2 under `releases/firmware/<version>/` using the same helpers as the desktop
and Android artifacts. The flasher does not use that copy; it stays on the
site so it is same-origin and works offline from the install button.

## Pre-release rehearsal

There is no tag-driven pipeline any more, so rehearse the same way you ship:
run `./tools/release.sh`, check the checksums, and flash a sacrificial board
from a local `next dev` session before replacing the published binary.
