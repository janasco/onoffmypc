# Publishing to Google Play

## AAB vs APK
Yes — new apps must ship as an **Android App Bundle (`.aab`)**, not an APK. Good
news: our release signing config already applies to the bundle, so
`:app:bundleRelease` produces a **signed** `.aab` with no extra work.

## Get the signed .aab

There is no CI/CD. Build it locally:

```bash
cd android
./gradlew :app:bundleRelease
# -> app/build/outputs/bundle/release/app-release.aab
```

The AAB is signed with the upload key from `android/keystore.properties`
(gitignored). If that file is missing, recreate it — see `RELEASE.md`.

## Understand Play App Signing (important)
Google **manages your app's real signing key** ("Play App Signing", mandatory for
new apps). You upload an `.aab` signed with your **upload key** (that's our
existing keystore), and Google re-signs it with the app signing key it holds.

- Keep our keystore safe — it's now your **upload key** (used to authenticate uploads).
- If you ever lose the upload key, Google can reset it; if Google holds the app signing key, your users are never stranded.
- **FCM still works** regardless of re-signing because delivery uses the FCM HTTP
  v1 service account. **Google Sign-In does require certificate registration.**
  Register the upload/release certificate SHA-1 for direct APK and internal AAB
  testing. After Play App Signing is enabled, also register Google's app-signing
  certificate SHA-1, then download a refreshed `google-services.json` and test
  the signed build. The currently tracked file must not be treated as proof that
  these OAuth identities are configured.

## First release (done once, manually in Play Console)
The first submission can't be fully automated — you set up the listing + policies:

1. **Create app** — name "OnOffMyPC", default language, app (not game), free.
2. **App signing** — accept **Play App Signing** (default). On your first upload, Google generates the app signing key and treats our keystore as the upload key.
3. **Upload to a test track first** — Release → **Testing → Internal testing** → create release → upload the `.aab` → roll out to yourself. Verify install/login/push before production.
4. **Store listing** (assets in `playstore/`):
   - App icon **512×512** → `playstore/icon-512.png`
   - Feature graphic **1024×500** → `playstore/feature-graphic-1024x500.png`
   - **Phone screenshots** (2–8, e.g. dashboard + device detail) — capture from the app
   - Short description (≤80 chars) + full description
5. **Policy sections** (required before production):
   - **Privacy policy** URL → `https://onoffmypc.com/privacy-policy`
   - **Data safety** form — declare what's collected (email for the account; device telemetry). No ad SDKs.
   - **Content rating** questionnaire
   - **Target audience** (not children), **App access** (account required — provide test credentials for review; registration may be open or invite-gated depending on the current `registration_mode` admin setting), **Ads** = none
6. **Production** — Release → Production → create release → upload (or promote the tested build) → submit for review.

## Versioning
Every upload needs a higher **`versionCode`**. We're at `versionCode 7`
(`versionName 0.3.0`). Bump `versionCode` in `app/build.gradle.kts` for each Play
upload (and `versionName` when the user-facing version changes).

To print the upload certificate SHA-1 without putting the password on the command
line, run the following and enter the keystore password when prompted:

```bash
keytool -list -v -keystore android/onoffmypc-release.jks -alias onoffmypc
```

## Release notes
- **GitHub release** (the `app-v*` APK release) — auto-generated from the matching
  version section of `CHANGELOG.md` (`scripts/release-notes.sh`). Just keep
  `CHANGELOG.md` up to date and the release body writes itself.
- **Play "What's new"** — the short, user-facing note in
  `distribution/whatsnew/whatsnew-en-US` (≤ 500 chars/locale). Edit this per
  release to a plain-language summary; `scripts/publish-play.mjs` attaches it.

## Automated uploads

`scripts/publish-play.mjs` uploads a signed AAB through the Android Publisher
API. It replaces the deleted GitHub Actions workflow, needs no dependencies,
and runs by hand.

One-time setup (after the app exists on Play with its first manual release):

1. **Play Console → Setup → API access** → link a Google Cloud project.
2. In that project (**IAM & Admin → Service accounts**) create a service account, then **Keys → Add key → JSON** and download the key.
3. **Play Console → Users and permissions → Invite user**, invite the service-account email, and grant **release** permissions scoped to this app.
4. Keep the JSON off the repository, e.g. `/opt/repo/onoffmypc-private/play-service-account.json` (mode `600`), and export its path.

Per release, after bumping `versionCode` and updating
`distribution/whatsnew/whatsnew-en-US`:

```bash
export PLAY_SERVICE_ACCOUNT_JSON=/path/to/play-service-account.json

# Prove credentials and options without changing anything
node scripts/publish-play.mjs --dry-run

# Upload to internal testing as a draft (review + roll out in the console)
node scripts/publish-play.mjs --track internal

# Or submit straight to production
node scripts/publish-play.mjs --track production --status completed
```

Flags: `--aab`, `--track internal|alpha|beta|production`, `--status draft|completed`,
`--whatsnew`, `--notes`.

> The **first** release must still be created and uploaded **manually** — the
> Play API only accepts uploads once the package exists on Play.

## Recommended path
1. Build the `.aab` locally (`cd android && ./gradlew :app:bundleRelease`).
2. Create the app, enroll in Play App Signing, upload to **Internal testing**, install on your phone, verify login + push.
3. Fill the store listing (icon + feature graphic are ready in `playstore/`; add screenshots) and the data-safety/content-rating forms.
4. Promote to **Production** and submit for review.
