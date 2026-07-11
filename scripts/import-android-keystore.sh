#!/usr/bin/env bash
# Import an existing local Android keystore into the gitignored mobile .env.
# Secret values are never printed. The original files are retained as a Gradle
# compatibility fallback and all local secret files are restricted to mode 0600.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

PROPERTIES_FILE="${1:-android/keystore.properties}"
JKS_FILE="${2:-android/onoffmypc-release.jks}"
ENV_FILE="${3:-.env}"

[[ -f "$PROPERTIES_FILE" ]] || {
  echo "Missing $PROPERTIES_FILE" >&2
  exit 1
}
[[ -f "$JKS_FILE" ]] || {
  echo "Missing $JKS_FILE" >&2
  exit 1
}
[[ -f .env.example ]] || {
  echo "Missing .env.example" >&2
  exit 1
}

property_value() {
  local wanted="$1" line key
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* || "$line" == \!* || "$line" != *=* ]] && continue
    key="${line%%=*}"
    if [[ "$key" == "$wanted" ]]; then
      printf '%s' "${line#*=}"
      return 0
    fi
  done < "$PROPERTIES_FILE"
  return 1
}

KEYSTORE_PASSWORD_VALUE="$(property_value storePassword || true)"
KEY_ALIAS_VALUE="$(property_value keyAlias || true)"
KEY_PASSWORD_VALUE="$(property_value keyPassword || true)"

for key in KEYSTORE_PASSWORD_VALUE KEY_ALIAS_VALUE KEY_PASSWORD_VALUE; do
  [[ -n "${!key}" && "${!key}" != CHANGE_ME* ]] || {
    echo "Missing a required signing value in $PROPERTIES_FILE" >&2
    exit 1
  }
done

# Store a portable path relative to the mobile repository. The CI workflows use
# the base64 copy, while local Gradle builds resolve this path from the repo root.
KEYSTORE_FILE_VALUE="$JKS_FILE"
ANDROID_KEYSTORE_BASE64_VALUE="$(base64 < "$JKS_FILE" | tr -d '\r\n')"
[[ -n "$ANDROID_KEYSTORE_BASE64_VALUE" ]] || {
  echo "Could not encode $JKS_FILE" >&2
  exit 1
}

SOURCE_FILE="$ENV_FILE"
[[ -f "$SOURCE_FILE" ]] || SOURCE_FILE=".env.example"
TMP_FILE="$(mktemp .env.signing.XXXXXX)"
trap 'rm -f "$TMP_FILE"' EXIT
chmod 600 "$TMP_FILE"

WROTE_KEYSTORE_PASSWORD=0
WROTE_KEY_ALIAS=0
WROTE_KEY_PASSWORD=0
WROTE_KEYSTORE_FILE=0
WROTE_ANDROID_KEYSTORE_BASE64=0
while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
    KEYSTORE_PASSWORD=*)
      printf 'KEYSTORE_PASSWORD=%s\n' "$KEYSTORE_PASSWORD_VALUE" >> "$TMP_FILE"
      WROTE_KEYSTORE_PASSWORD=1
      ;;
    KEY_ALIAS=*)
      printf 'KEY_ALIAS=%s\n' "$KEY_ALIAS_VALUE" >> "$TMP_FILE"
      WROTE_KEY_ALIAS=1
      ;;
    KEY_PASSWORD=*)
      printf 'KEY_PASSWORD=%s\n' "$KEY_PASSWORD_VALUE" >> "$TMP_FILE"
      WROTE_KEY_PASSWORD=1
      ;;
    KEYSTORE_FILE=*)
      printf 'KEYSTORE_FILE=%s\n' "$KEYSTORE_FILE_VALUE" >> "$TMP_FILE"
      WROTE_KEYSTORE_FILE=1
      ;;
    ANDROID_KEYSTORE_BASE64=*)
      printf 'ANDROID_KEYSTORE_BASE64=%s\n' "$ANDROID_KEYSTORE_BASE64_VALUE" >> "$TMP_FILE"
      WROTE_ANDROID_KEYSTORE_BASE64=1
      ;;
    *) printf '%s\n' "$line" >> "$TMP_FILE" ;;
  esac
done < "$SOURCE_FILE"

[[ "$WROTE_KEYSTORE_PASSWORD" == 1 ]] || printf 'KEYSTORE_PASSWORD=%s\n' "$KEYSTORE_PASSWORD_VALUE" >> "$TMP_FILE"
[[ "$WROTE_KEY_ALIAS" == 1 ]] || printf 'KEY_ALIAS=%s\n' "$KEY_ALIAS_VALUE" >> "$TMP_FILE"
[[ "$WROTE_KEY_PASSWORD" == 1 ]] || printf 'KEY_PASSWORD=%s\n' "$KEY_PASSWORD_VALUE" >> "$TMP_FILE"
[[ "$WROTE_KEYSTORE_FILE" == 1 ]] || printf 'KEYSTORE_FILE=%s\n' "$KEYSTORE_FILE_VALUE" >> "$TMP_FILE"
[[ "$WROTE_ANDROID_KEYSTORE_BASE64" == 1 ]] || printf 'ANDROID_KEYSTORE_BASE64=%s\n' "$ANDROID_KEYSTORE_BASE64_VALUE" >> "$TMP_FILE"

mv "$TMP_FILE" "$ENV_FILE"
trap - EXIT
chmod 600 "$ENV_FILE" "$PROPERTIES_FILE" "$JKS_FILE"

echo "Imported Android signing values into $ENV_FILE and set secret files to mode 0600."
echo "No passwords, key material, or base64 content were printed."
