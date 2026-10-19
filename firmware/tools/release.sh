#!/usr/bin/env bash
#
# Build and package an OnOffMyPC firmware release into dist/.
#
# Outputs (VERSION read from FIRMWARE_VERSION in src/main.cpp):
#   dist/onoffmypc-firmware-<version>.bin       merged image, flash at 0x0
#   dist/onoffmypc-firmware-<version>-app.bin   application-only image (0x10000)
#   dist/SHA256SUMS-<version>.txt               checksums
#   dist/manifest.json                          ESP Web Tools manifest for the web flasher
#   dist/RELEASE_NOTES.md                       notes pulled from CHANGELOG.md
#
# Used by .github/workflows/release.yml and runnable locally. Requires PlatformIO
# and esptool (CI: `pip install platformio esptool`; locally either on PATH or a
# PlatformIO install under ~/.platformio).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

VERSION="$(grep -oE '#define FIRMWARE_VERSION "[^"]+"' src/main.cpp | sed -E 's/.*"([^"]+)".*/\1/')"
if [ -z "$VERSION" ]; then echo "could not read FIRMWARE_VERSION from src/main.cpp" >&2; exit 1; fi
echo "==> OnOffMyPC firmware v$VERSION"

# Resolve PlatformIO and esptool, preferring tools on PATH (CI) then a local install.
PIO="$(command -v pio || echo "$HOME/.platformio/penv/bin/pio")"
if command -v esptool.py >/dev/null 2>&1; then
  ESPTOOL=(esptool.py)
elif python3 -c "import esptool, serial" >/dev/null 2>&1; then
  ESPTOOL=(python3 -m esptool)
elif [ -x "$HOME/.platformio/penv/bin/python" ] && [ -f "$HOME/.platformio/packages/tool-esptoolpy/esptool.py" ]; then
  ESPTOOL=("$HOME/.platformio/penv/bin/python" "$HOME/.platformio/packages/tool-esptoolpy/esptool.py")
else
  echo "esptool not found (pip install esptool)" >&2; exit 1
fi

echo "==> Building (pio run -e esp32dev)"
"$PIO" run -e esp32dev

B=".pio/build/esp32dev"
BOOT_APP0="$(find "$HOME/.platformio/packages/framework-arduinoespressif32" -name boot_app0.bin 2>/dev/null | head -1)"
if [ -z "$BOOT_APP0" ]; then echo "boot_app0.bin not found" >&2; exit 1; fi

rm -rf dist && mkdir -p dist
MERGED="dist/onoffmypc-firmware-$VERSION.bin"

echo "==> Merging flashable image"
"${ESPTOOL[@]}" --chip esp32 merge_bin -o "$MERGED" \
  --flash_mode dio --flash_freq 40m --flash_size 4MB \
  0x1000  "$B/bootloader.bin" \
  0x8000  "$B/partitions.bin" \
  0xe000  "$BOOT_APP0" \
  0x10000 "$B/firmware.bin"

cp "$B/firmware.bin" "dist/onoffmypc-firmware-$VERSION-app.bin"

echo "==> Checksums"
( cd dist && sha256sum "onoffmypc-firmware-$VERSION.bin" "onoffmypc-firmware-$VERSION-app.bin" \
    > "SHA256SUMS-$VERSION.txt" )

echo "==> ESP Web Tools manifest"
cat > dist/manifest.json <<JSON
{
  "name": "OnOffMyPC",
  "version": "$VERSION",
  "new_install_prompt_erase": true,
  "builds": [
    { "chipFamily": "ESP32", "parts": [ { "path": "onoffmypc-firmware-$VERSION.bin", "offset": 0 } ] }
  ]
}
JSON

echo "==> Release notes (from CHANGELOG.md)"
NOTES="dist/RELEASE_NOTES.md"
awk -v v="$VERSION" '
  $0 ~ "^## \\[" v "\\]" { grab=1; next }
  grab && /^## \[/ { exit }
  grab { print }
' CHANGELOG.md | sed '/^[[:space:]]*$/d' > "$NOTES" || true
if [ ! -s "$NOTES" ]; then
  printf '## OnOffMyPC Firmware v%s\n\nSee CHANGELOG.md for details.\n' "$VERSION" > "$NOTES"
fi

# Safety net: these public notes must not disclose backend/internal architecture.
# Drop any line mentioning an internal term (defense-in-depth on top of a
# user-facing CHANGELOG). Keep this list in sync with the mobile release script.
LEAK_RE='D1|Cloudflare|Durable Object|Workers?|SQLite|lwIP|Hono|JWKS|bcrypt|token_hash|wrangler|Miniflare|DeviceRelay|Invalid mbox|setCACert|setInsecure|udp\.begin|migration|Resend|Turnstile'
if grep -qiE "$LEAK_RE" "$NOTES"; then
  echo "==> Redacting internal terms from public release notes"
  grep -viE "$LEAK_RE" "$NOTES" > "$NOTES.tmp" && mv "$NOTES.tmp" "$NOTES"
fi

echo "==> Done. Artifacts:"
ls -la dist/
echo "VERSION=$VERSION"
