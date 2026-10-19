#!/usr/bin/env bash
#
# One-time migration of published GitHub release assets to Cloudflare R2.
#
# The GitHub repositories are for source only; release binaries live on
# Cloudflare. This script copies the *latest published release per family*
# (android, desktop) from onoffmypc/onoffmypc-release to an R2 bucket and
# writes a manifest the web app can read.
#
# Older releases are deliberately not migrated — superseded versions are
# dropped. Firmware was never published as a GitHub release; it ships from
# web/public/firmware/ and is not handled here.
#
# Usage:
#   ./scripts/migrate-releases-to-r2.sh --dry-run
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
#     ./scripts/migrate-releases-to-r2.sh --base-url https://releases.onoffmypc.com
#
# Requirements: curl, python3, sha256sum, node/npx (for wrangler).
#
# Env:
#   CLOUDFLARE_API_TOKEN   required unless --dry-run
#   CLOUDFLARE_ACCOUNT_ID  required unless --dry-run
#   GITHUB_TOKEN           optional; only raises the GitHub API rate limit
#
# Exit codes: 0 success, 1 usage error, 2 download/verify failure, 3 upload failure.

set -euo pipefail

GITHUB_REPO="onoffmypc/onoffmypc-release"
BUCKET="onoffmypc-releases"
PREFIX="releases"
BASE_URL="https://releases.onoffmypc.com"
FAMILIES="android desktop"
DRY_RUN="false"
WRANGLER_VERSION="4.112.0"

die() { echo "error: $*" >&2; exit "${2:-1}"; }
info() { echo "  $*"; }

usage() {
  sed -n '3,30p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)      DRY_RUN="true"; shift ;;
    --base-url)     BASE_URL="${2:?--base-url needs a value}"; shift 2 ;;
    --bucket)       BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --prefix)       PREFIX="${2:?--prefix needs a value}"; shift 2 ;;
    --families)     FAMILIES="${2:?--families needs a value}"; shift 2 ;;
    --wrangler)     WRANGLER_VERSION="${2:?--wrangler needs a value}"; shift 2 ;;
    -h|--help)      usage ;;
    *)              die "unknown argument: $1" 1 ;;
  esac
done

command -v curl >/dev/null || die "curl is required"
command -v python3 >/dev/null || die "python3 is required"
command -v sha256sum >/dev/null || die "sha256sum is required"

if [ "$DRY_RUN" != "true" ]; then
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "CLOUDFLARE_API_TOKEN is required (or pass --dry-run)" 1
  [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || die "CLOUDFLARE_ACCOUNT_ID is required (or pass --dry-run)" 1
fi

# This host has no IPv6 route, and Node's Happy Eyeballs does not fall back to
# IPv4 for api.cloudflare.com / registry.npmjs.org, so Node-based tools
# (wrangler, npm) hang with ETIMEDOUT. Disabling family autoselection makes
# them use IPv4 directly. Harmless on a healthy dual-stack host; set
# RELEASES_NODE_IPV4=0 to opt out.
if [ "${RELEASES_NODE_IPV4:-1}" = "1" ]; then
  export NODE_OPTIONS="${NODE_OPTIONS:-} --no-network-family-autoselection"
fi

# Prefer a wrangler that is already installed; fall back to npx (which needs
# registry access). Set WRANGLER=/path/to/wrangler to override.
find_wrangler() {
  if [ -n "${WRANGLER:-}" ] && [ -x "${WRANGLER}" ]; then printf '%s' "$WRANGLER"; return; fi
  for candidate in \
    ./node_modules/.bin/wrangler \
    ../app/node_modules/.bin/wrangler \
    ./app/node_modules/.bin/wrangler; do
    if [ -x "$candidate" ]; then printf '%s' "$candidate"; return; fi
  done
  printf '%s' "npx --yes wrangler@$WRANGLER_VERSION"
}

WRANGLER_CMD="$(find_wrangler)"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

AUTH_HEADER=()
[ -n "${GITHUB_TOKEN:-}" ] && AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")

echo "== fetching release list from $GITHUB_REPO"
curl -fsSL "${AUTH_HEADER[@]}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_REPO/releases?per_page=100" \
  -o "$WORK/releases.json" || die "could not list releases" 2

# Pick the highest semver per family. Families are derived from the tag prefix
# (app-vX.Y.Z -> android, desktop-vX.Y.Z -> desktop).
python3 - "$WORK/releases.json" "$FAMILIES" > "$WORK/selected.tsv" <<'PY'
import json, re, sys
from functools import cmp_to_key

data = json.load(open(sys.argv[1]))
wanted = set(sys.argv[2].split())

def fam_of(tag):
    if tag.startswith("app-v"):
        return "android"
    if tag.startswith("desktop-v"):
        return "desktop"
    return None

def ver(tag):
    m = re.search(r"-v(\d+(?:\.\d+)*)$", tag)
    return tuple(int(x) for x in m.group(1).split(".")) if m else None

def cmp(a, b):
    va, vb = a[1], b[1]
    if va is None or vb is None:
        return 0
    return (va > vb) - (va < vb)

by_fam = {}
for r in data:
    f = fam_of(r["tag_name"])
    if not f or f not in wanted:
        continue
    v = ver(r["tag_name"])
    if v is None:
        continue
    by_fam.setdefault(f, []).append((r, v))

for f in sorted(by_fam):
    best = sorted(by_fam[f], key=cmp_to_key(cmp))[-1][0]
    assets = best.get("assets", [])
    if not assets:
        continue
    version = best["tag_name"].split("-v", 1)[1]
    print("\t".join([f, best["tag_name"], version, str(len(assets))]))
    for a in assets:
        print("\t".join(["asset", f, version, a["name"], str(a["size"]), a["browser_download_url"]]))
PY

[ -s "$WORK/selected.tsv" ] || die "no matching releases found" 2

echo "== selected releases"
awk -F'\t' '$1!="asset"{printf "   %-8s %-12s %s assets\n", $1, $2, $4}' "$WORK/selected.tsv"

# Download every selected asset and verify size / hash.
echo "== downloading"
MANIFEST_ENTRIES="$WORK/manifest-entries.jsonl"
: > "$MANIFEST_ENTRIES"
while IFS=$'\t' read -r kind fam version name size url; do
  [ "$kind" = "asset" ] || continue
  dest="$WORK/$fam-$version-$name"
  info "downloading $name ($(( size / 1024 / 1024 )) MB)"
  curl -fsSL --retry 3 --retry-delay 2 -o "$dest" "$url" || die "download failed: $url" 2
  actual=$(stat -c%s "$dest")
  [ "$actual" = "$size" ] || die "size mismatch for $name (expected $size, got $actual)" 2
  sum=$(sha256sum "$dest" | awk '{print $1}')
  python3 - "$MANIFEST_ENTRIES" "$fam" "$version" "$name" "$size" "$sum" <<'PY'
import json, sys
path, fam, version, name, size, sha = sys.argv[1:7]
with open(path, "a") as fh:
    fh.write(json.dumps({
        "family": fam, "version": version, "name": name,
        "size": int(size), "sha256": sha,
    }) + "\n")
PY
  info "  sha256 $sum"
done < "$WORK/selected.tsv"

# Build the manifest the web app reads.
python3 - "$MANIFEST_ENTRIES" "$BASE_URL" "$PREFIX" > "$WORK/manifest.json" <<'PY'
import json, sys
from collections import defaultdict
from urllib.parse import quote

entries = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
base = sys.argv[2].rstrip("/")
prefix = sys.argv[3].strip("/")

families = defaultdict(lambda: {"version": None, "assets": []})
for e in entries:
    fam = families[e["family"]]
    fam["version"] = e["version"]
    fam["assets"].append({
        "name": e["name"],
        "size": e["size"],
        "sha256": e["sha256"],
        "url": f"{base}/{prefix}/{e['family']}/{e['version']}/{quote(e['name'])}",
    })

manifest = {
    "schema": 1,
    "base_url": base,
    "families": {k: families[k] for k in sorted(families)},
}
json.dump(manifest, sys.stdout, indent=2, sort_keys=True)
sys.stdout.write("\n")
PY

cp "$WORK/manifest.json" "$WORK/manifest.upload.json"
info "manifest: $WORK/manifest.json"

if [ "$DRY_RUN" = "true" ]; then
  echo
  echo "== DRY RUN — nothing uploaded. Planned objects:"
  awk -F'\t' '$1!="asset"{next} {printf "   %s/%s/%s/%s\n", "'"$PREFIX"'", $2, $3, $4}' "$WORK/selected.tsv"
  echo "   $PREFIX/manifest.json"
  echo
  echo "== manifest preview"
  cat "$WORK/manifest.json"
  exit 0
fi

content_type() {
  case "$1" in
    *.apk)     echo "application/vnd.android.package-archive" ;;
    *.deb)     echo "application/vnd.debian.binary-package" ;;
    *.exe)     echo "application/vnd.microsoft.portable-executable" ;;
    *.AppImage) echo "application/x-executable" ;;
    *.json)    echo "application/json" ;;
    *)         echo "application/octet-stream" ;;
  esac
}

echo "== uploading to r2://$BUCKET"
while IFS=$'\t' read -r kind fam version name size url; do
  [ "$kind" = "asset" ] || continue
  dest="$WORK/$fam-$version-$name"
  key="$PREFIX/$fam/$version/$name"
  info "uploading $key"
  $WRANGLER_CMD r2 object put "$BUCKET/$key" \
    --file "$dest" \
    --content-type "$(content_type "$name")" \
    --cache-control "public, max-age=31536000, immutable" \
    --remote >/dev/null || die "upload failed: $key" 3
done < "$WORK/selected.tsv"

info "uploading $PREFIX/manifest.json"
$WRANGLER_CMD r2 object put "$BUCKET/$PREFIX/manifest.json" \
  --file "$WORK/manifest.upload.json" \
  --content-type "application/json" \
  --cache-control "public, max-age=300" \
  --remote >/dev/null || die "upload failed: manifest" 3

echo
echo "== done"
echo "   bucket:   $BUCKET"
echo "   prefix:   $PREFIX"
echo "   base url: $BASE_URL"
echo "   manifest: $BASE_URL/$PREFIX/manifest.json"
echo
echo "Next: publish the bucket (custom domain or r2.dev), verify the URLs above"
echo "return 200, then update links in the web app and delete the old repo."
