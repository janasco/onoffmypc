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

if [ "$MODE" = "--plain" ]; then
  # Strip markdown to plain bullet lines for the Play "What's new" field.
  printf '%s\n' "$section" \
    | sed -E 's/^#+ +//; s/^[-*] +/• /; s/`//g; s/\*\*//g' \
    | sed '/^[[:space:]]*$/d'
else
  printf '%s\n' "$section" | sed '/^[[:space:]]*$/d'
fi
