# Release artifacts on Cloudflare R2

GitHub holds source only. Published binaries live on Cloudflare R2 and are
served from `https://releases.onoffmypc.com`.

Firmware is the exception: it ships from `web/public/firmware/` inside the web
app (currently `onoffmypc-firmware-1.3.6.bin`) and is not handled here.

## What is migrated

Only the **latest published release per family**. Superseded versions are
dropped.

| Family | Tag | Assets |
|---|---|---|
| android | `app-v0.4.2` | `onoffmypc-android-0.4.2.apk` (9.3 MB) |
| desktop | `desktop-v0.1.3` | AppImage, `.deb`, `.exe` (310.9 MB) |

Object layout:

```
releases/android/<version>/<file>
releases/desktop/<version>/<file>
releases/manifest.json
```

Versioned objects are uploaded with `Cache-Control: public, max-age=31536000,
immutable`; the manifest uses `max-age=300` so a new release is visible quickly.

## Prerequisites

A Cloudflare API token with **R2: Edit** on the account (and **Workers Scripts:
Edit** if you later proxy downloads through the Worker), plus the account ID.
The custom-domain step also needs the **zone ID** for `onoffmypc.com`.

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export CF_ZONE_ID=...          # onoffmypc.com zone, for the custom domain step
```

## 1. Create the bucket

```bash
npx wrangler@4.112.0 r2 bucket create onoffmypc-releases
```

## 2. Serve it publicly

Recommended — a custom domain on the zone, which gets Cloudflare's edge cache
and native range requests (important for the 122 MB AppImage and 95 MB
installers, so downloads are resumable):

```bash
npx wrangler@4.112.0 r2 bucket domain add onoffmypc-releases \
  --domain releases.onoffmypc.com \
  --zone-id "$CF_ZONE_ID" \
  --min-tls 1.2
```

Alternative for a quick check only — the `r2.dev` URL. Do not ship this: it is
rate-limited, has no cache in front of it, and is not a stable product URL.

```bash
npx wrangler@4.112.0 r2 bucket dev-url enable onoffmypc-releases
```

If the web app fetches `manifest.json` with JavaScript, the bucket needs a CORS
rule allowing `GET` from the app origin:

```bash
cat > /tmp/r2-cors.json <<'JSON'
{ "rules": [ { "allowed": { "origins": ["https://app.onoffmypc.com", "https://onoffmypc.com"], "methods": ["GET", "HEAD"] } } ] }
JSON
npx wrangler@4.112.0 r2 bucket cors set onoffmypc-releases --file /tmp/r2-cors.json
```

Plain `<a href>` downloads do not need CORS.

## 3. Run the migration

Always dry-run first. It downloads each selected asset, checks the byte size and
prints the SHA-256 that will go into the manifest — no upload.

```bash
./scripts/migrate-releases-to-r2.sh --dry-run
```

Then upload:

```bash
./scripts/migrate-releases-to-r2.sh
```

Useful flags: `--families android`, `--families desktop`, `--base-url`,
`--bucket`, `--prefix`.

The script is idempotent — re-running overwrites the same keys.

## 4. Verify

```bash
curl -fsS https://releases.onoffmypc.com/releases/manifest.json | head -20
curl -fsSI https://releases.onoffmypc.com/releases/android/0.4.2/onoffmypc-android-0.4.2.apk
```

Check that the APK responds `200`, reports `content-type:
application/vnd.android.package-archive`, and that its `sha256` matches the one
the dry run printed.

## 5. Repoint the app — done

The web app no longer links to GitHub Releases:

- `web/src/lib/releases.ts` is the single source of truth for the current
  version, filename, size, and SHA-256 of every artifact.
- `web/src/app/downloads/page.tsx` lists them and links straight to R2.
- `web/src/app/page.tsx` links both download buttons to `/downloads`.
- `web/src/app/setup/page.tsx` downloads firmware from `/firmware/` (it ships
  with the site, not R2).
- `web/src/app/contact/page.tsx` points at
  `github.com/janasco/onoffmypc/issues`.

## Publishing a new release

There is no CI/CD. For each release:

1. Build the artifact locally.
2. Upload it with the same key layout:
   `releases/<family>/<version>/<file>`, with `Content-Type` set and
   `Cache-Control: public, max-age=31536000, immutable`.
3. Re-upload `releases/manifest.json` (or rerun the migration script).
4. Update `web/src/lib/releases.ts` and deploy the web app.
5. Delete the previous version's prefix once the new one is verified.

`mobile/RELEASE.md` and `firmware/RELEASE.md` have the per-platform steps.

## 6. Retire the old repository

Once the links above, the workflows, and the docs no longer reference
`onoffmypc/onoffmypc-release`, it can be deleted. It holds 18 releases /
26 assets / 1.37 GB; the 22 superseded assets are intentionally not migrated.

## Rollback

The old repository is untouched until step 6, so every URL still works while
migrating. If an upload is wrong, re-run the script with the same arguments.
Deleting an object:

```bash
npx wrangler@4.112.0 r2 object delete onoffmypc-releases/releases/manifest.json --remote
```

## Keeping only the latest over time

Delete the previous version's prefix when publishing a new release, or add a
lifecycle rule to expire old prefixes. R2 storage is $0.015/GB-month and egress
is free, so 320 MB costs about half a cent per month — cleanup is optional.
