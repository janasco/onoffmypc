# Consolidation notes

This repository was created by consolidating six separate repositories into
one, preserving full commit history via `git subtree`. This documents what
moved, what changed in the process, and what is still outstanding.

## What came from where

| Directory | Source repository | Ref at import |
|---|---|---|
| `firmware/` | `onoffmypc/onoffmypc-firmware` | `main` |
| `web/` | `onoffmypc/onoffmypc-monorepo` (`apps/web`) | extracted branch |
| `desktop/` | `onoffmypc/onoffmypc-desktop` | `master` |
| `mobile/` | `onoffmypc/onoffmypc-mobile` | `main` |
| `design/` | `onoffmypc/onoffmypc-design` | `main` |
| `release/` | `onoffmypc/onoffmypc-release` | `main` |

Each subtree import is a merge commit, so `git log --follow <path>` and
`git blame` reach back through the original history.

The backend (`onoffmypc-app`) and the cross-repository security assessment went
to the separate private repository instead.

## Deliberately dropped

- **`onoffmypc-web` (the static HTML/CSS/JS site)** — superseded by the Next.js
  app now at `web/`. It included the admin console, which is coupled to the
  private backend and was not published.
- **`onoffmypc-monorepo` scaffolding and its stale component copies** — the
  `apps/desktop` and `apps/mobile` copies under the old monorepo had drifted
  behind their standalone repositories. The standalone repositories were used
  as the source of truth.
- **A duplicate desktop hardening branch** — the changes existed in two places;
  the standalone repository's committed version (`fb71970`) was byte-identical
  to the copy in the old monorepo, so only the standalone was kept.

## Feature branches merged before import

Unmerged work that existed on feature branches was landed on each component's
default branch before consolidation, so nothing is stranded:

| Component | Branch merged |
|---|---|
| `mobile/` | `android/target-api-36` — Google Play requires targetSdk 36 from 31 Aug 2026 |
| `web/` | `web/lint-typecheck-tests` — lint, typecheck, and unit-test coverage |
| `release/` | `agent/security-assessment-phase-2` — documentation updates |

## CI: what works and what does not

GitHub Actions only reads `.github/workflows/` at the repository root, so every
component workflow moved there and gained a `paths:` filter plus a
`working-directory`. See `.github/workflows/README.md` for the file-by-file
mapping.

**Working now** (no secrets required): firmware build + native tests, design
artifact validation, web lint/typecheck/tests/build, Android assemble + unit
tests, iOS simulator build.

**Not yet migrated** — the release pipelines. They are still inside their
component directories, where they are inert. Moving them is not a path change:

1. **`firmware/.github/workflows/release.yml` pushes to two other
   repositories.** It clones `onoffmypc/onoffmypc-web`, drops the firmware
   binary and manifest into it, commits, pushes, and deploys Cloudflare Pages —
   using cross-repo PATs. Under consolidation those targets are `release/` and
   `web/` in *this* repository, so that logic must become an in-repo commit.
   Its publish step is `continue-on-error: true`, so a partial failure would
   not stop the following deploy. **Do not re-enable as-is.**
2. **Tag namespaces.** `desktop` uses `v*`, `firmware` uses `fw-v*`, `mobile`
   uses `app-v*`. These do not currently collide, but `v*` is broad — consider
   `desktop-v*` for clarity.
3. **`web/` deploys differently.** The old static site deployed with
   `wrangler pages deploy .`. The Next.js app does not; it needs a build step
   and either a Pages/Workers deployment of `.next` output or a different host.
   This has to be designed, not translated.

## Repository secrets to re-add

Secrets do not transfer between repositories. The new repositories need:

**Private repository** (for the backend deploy and backup):
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_D1_TOKEN`,
`BACKUP_PASSPHRASE`, `JWT_SECRET`, `ADMIN_KEY`, `ADMIN_EMAILS`,
`ADMIN_ALLOWED_IPS`, `RESEND_API_KEY`, `FCM_SERVICE_ACCOUNT_JSON`,
`TURNSTILE_SECRET_KEY`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`,
`POLAR_PRODUCT_ID`, `POLAR_SERVER`, `POLAR_SUCCESS_URL`, `POLAR_RETURN_URL`,
`HEALTHCHECK_URL`. See `app/wrangler.toml` and `app/DEPLOYMENT.md`.

**Public repository:** no GitHub Actions secrets are configured or required.
CI runs tests only. Release signing material (the Android keystore and its
passwords) stays in the local gitignored `.env`; the Play service-account JSON
is consumed locally by `mobile/scripts/publish-play.mjs`. Releases are uploaded
to Cloudflare R2 by hand.

## Verification performed after consolidation

Each component was checked in its new location, not just assumed to work:

| Component | Check | Result |
|---|---|---|
| `firmware/` | `pio test -e native` | 24/24 pass |
| `design/` | `npm run check` | artifacts current |
| `desktop/` | `npm run check` | 38/38 pass |
| `mobile/` | `./gradlew :app:testDebugUnitTest :shared:model:test` | pass |
| `web/` | lint, typecheck, unit tests, `next build` | 21/21 tests, clean |
| `app/` (private) | `tsc --noEmit`, `vitest run` | 316/316 pass |

File counts were compared against each source repository to confirm the
subtrees imported completely.

## Outstanding work

- [x] Release pipelines migrated. GitHub is source and tests only; artifacts
      are built and uploaded by hand to Cloudflare R2 (`release/R2-RELEASES.md`).
- [x] No repository secrets are needed for CI. Release signing material stays
      in the local gitignored `.env`.
- [x] `web/` deploys to Cloudflare Pages project `onoffmypc-web` (npm, static
      export). `app.onoffmypc.com` is now a custom domain on the same project;
      `onoffmypc.com` and `www` are unchanged.
- [x] `web/` uses npm and carries its own `package-lock.json`.
- [x] The eight old `onoffmypc/*` repositories are retired; only
      `janasco/onoffmypc` and `janasco/onoffmypc-private` remain.
- [x] Branch protection on `main` for the public repository (force-push and
      deletion disabled). The private repository needs GitHub Pro to enable
      protected branches.
- [ ] Production deploys are manual; consider a second-person review step in
      your own runbook.
- [x] Deleted the unused `onoffmypc-dashboard` Pages project (2026-11-10). The
      app host has been served by `onoffmypc-web` since the move.
