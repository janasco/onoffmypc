#!/usr/bin/env bash
# Extract the CHANGELOG.md section for a version as release notes.
#   scripts/release-notes.sh 0.1.1            -> markdown (GitHub release body)
#   scripts/release-notes.sh 0.1.1 --plain    -> plain bullets (Play "What's new")
set -euo pipefail

VERSION="${1:?usage: release-notes.sh <version> [--plain]}"
MODE="${2:-md}"

section="$(awk -v ver="$VERSION" '
  index($0, "## [" ver "]") == 1 { grab = 1; next }
  grab && /^## \[/ { exit }
  grab { print }
' CHANGELOG.md)"

# Safety net: public release notes must not disclose backend/internal
# architecture. Drop any line mentioning an internal term (defense-in-depth on
# top of a user-facing CHANGELOG). Keep in sync with the firmware release script.
LEAK_RE='D1|Cloudflare|Durable Object|Workers?|SQLite|Hono|JWKS|bcrypt|token_hash|wrangler|Miniflare|DeviceRelay|migration|Resend|Turnstile'
section="$(printf '%s\n' "$section" | grep -viE "$LEAK_RE" || true)"

if [ "$MODE" = "--plain" ]; then
  # Strip markdown to plain bullet lines for the Play "What's new" field.
  printf '%s\n' "$section" \
    | sed -E 's/^#+ +//; s/^[-*] +/• /; s/`//g; s/\*\*//g' \
    | sed '/^[[:space:]]*$/d'
else
  printf '%s\n' "$section" | sed '/^[[:space:]]*$/d'
fi
