# Workflows

GitHub Actions is used **only for tests**, not for delivery. Releases are built
and published by hand to Cloudflare R2 — see `release/R2-RELEASES.md`.

## Active

| Workflow | Trigger | What it does |
|---|---|---|
| `firmware-ci.yml` | changes under `firmware/` | `pio test -e native`, compile ESP32 |
| `design-ci.yml` | changes under `design/` | validate generated artifacts, tests, build |
| `web-ci.yml` | changes under `web/` | lint, typecheck, unit tests, `next build` |
| `mobile-ci.yml` | changes under `mobile/android/` | assemble debug + unit tests |
| `mobile-ios-ci.yml` | changes under `mobile/ios/` | XcodeGen + simulator build |

These only need a stock runner. No secrets are configured, and none are
required.

## Removed

The release pipelines were deleted when distribution moved to R2. They used to
live here as `firmware/release.yml`, `desktop/release.yml`,
`mobile/{release,aab,play,release-verify}.yml`; they triggered on `v*`,
`fw-v*` and `app-v*` tags and published GitHub Releases (the firmware one also
pushed to two other repositories and deployed Pages with cross-repo PATs).

Releasing is now:

1. build locally,
2. upload with `wrangler r2 object put` (or `scripts/migrate-releases-to-r2.sh`),
3. update `web/src/lib/releases.ts`.

See `firmware/RELEASE.md`, `mobile/RELEASE.md`, and `desktop/RELEASE.md` if
present.

**Why bother with the test workflows at all?** They are not CD, and they caught
real defects that were otherwise shipping: a non-compiling iOS build, a
Java 21/17 bytecode mismatch in the Android unit tests, and a broken pnpm
install. Keeping them costs nothing and blocks regressions on push.
