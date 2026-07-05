#!/usr/bin/env bash
# Push the keystore signing secrets from the local .env to GitHub Actions,
# straight from the file so the base64 can't be corrupted by copy-paste.
# Requires: gh CLI, authenticated (`gh auth login`) with admin on the repo.
#   Usage:  bash scripts/set-android-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="onoffmypc/onoffmypc-mobile"
[ -f .env ] || { echo "no .env here"; exit 1; }
command -v gh >/dev/null || { echo "gh CLI not installed"; exit 1; }

val() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

for key in ANDROID_KEYSTORE_BASE64 KEYSTORE_PASSWORD KEY_ALIAS KEY_PASSWORD; do
  v="$(val "$key")"
  if [ -z "$v" ]; then echo "!! $key is empty in .env — skipping"; continue; fi
  printf '%s' "$v" | gh secret set "$key" -R "$REPO"
  echo "set $key (${#v} chars)"
done
echo "Done. Now re-run the 'Release APK' job (no re-tag needed)."
