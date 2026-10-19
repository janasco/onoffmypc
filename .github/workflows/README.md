# Workflows in this directory do not run

GitHub Actions **only** reads workflow files from `.github/workflows/` at the
repository root. Workflows kept inside a component directory are inert — they
are not registered, not scheduled, and never triggered.

## Migrated

The following workflows were moved to the repository root during the
repository consolidation and are filtered to their component via `paths:`:

| Original location | New location |
|---|---|
| `design/.github/workflows/ci.yml` | `.github/workflows/design-ci.yml` |
| `firmware/.github/workflows/ci.yml` | `.github/workflows/firmware-ci.yml` |
| `mobile/.github/workflows/ci.yml` | `.github/workflows/mobile-ci.yml` |
| `mobile/.github/workflows/ios-ci.yml` | `.github/workflows/mobile-ios-ci.yml` |
| `web/.github/workflows/ci.yml` | `.github/workflows/web-ci.yml` |

## Not migrated

The release pipelines below are still here and are **not running**. They are
deliberately left in place rather than moved, because moving them is not a
path change — each needs repository secrets re-added and real rework before it
can run safely in the consolidated repository:

| File | What it needs |
|---|---|
| `desktop/.github/workflows/release.yml` | `v*` tag trigger. Builds Linux/Windows installers and publishes a GitHub Release. Needs the signing/attestation work noted in its header, plus secrets. |
| `firmware/.github/workflows/release.yml` | `fw-v*` tag trigger. **Pushes to two other repositories** (`onoffmypc/onoffmypc-release` and `onoffmypc/onoffmypc-web`) using cross-repo PATs and deploys Cloudflare Pages. Under consolidation those targets are `release/` and `web/` in *this* repository, so the cross-repo clone/push logic must become an in-repo commit. Do not re-enable as-is. |
| `mobile/.github/workflows/release.yml` | `app-v*` tag trigger. Builds and publishes a signed APK. Needs keystore secrets re-added. |
| `mobile/.github/workflows/aab.yml` | Manual. Builds the Play Store AAB. Needs keystore secrets re-added. |
| `mobile/.github/workflows/play.yml` | Manual. Uploads the AAB to Google Play. Needs the Play service-account secret re-added. |
| `mobile/.github/workflows/release-verify.yml` | Manual. Dry-run signed build. Needs keystore secrets re-added. |

See `CONSOLIDATION.md` at the repository root for the full migration checklist.
