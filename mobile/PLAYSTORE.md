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
Every upload needs a higher **`versionCode`**. The current build is
`versionCode 21` (`versionName 0.4.4`). Bump `versionCode` in
`app/build.gradle.kts` for each Play upload (and `versionName` when the
user-facing version changes).

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
API. It has no dependencies and runs by hand. It does **not** read `.env`; the
credential must be in the environment (see below).

### One-time setup

The Play Console must already have the app (`com.onoffmypc.android`) and at
least one release created manually. The API cannot create the first release.

**Fast path if the old service account still exists:** open
**Play Console → Setup → API access**. If the linked Google Cloud project and
the old `...@....iam.gserviceaccount.com` account are still listed, you only
need a **new JSON key** for that account (Part A, step 5) — the Play
permissions are already granted. Keys cannot be downloaded twice; creating a
new key does not revoke the old one, so delete keys you no longer use.

#### Part A — Google Cloud

1. Sign in to <https://console.cloud.google.com> with the account that owns the
   Play Console link.
2. Select the project shown on **Play Console → Setup → API access**. If none is
   linked, create a project and link it there.
3. **APIs & Services → Library**, search for **Google Play Android Developer
   API**, and enable it (if it is not already).
4. **IAM & Admin → Service accounts**:
   - use the existing `play-publisher`-style account, or create one
     (name it `play-publisher`; no Google Cloud IAM roles are needed);
   - open it → **Keys → Add key → Create new key → JSON**;
   - the JSON downloads once. Store it outside the repository or in the
     gitignored `secrets/` directory, mode `0600`.
5. Note the `client_email` inside the JSON; that is the identity to invite.

#### Part B — Play Console

1. **Setup → API access**: confirm the same Google Cloud project is linked.
2. **Users and permissions → Invite new user** (or open the existing service
   account):
   - Email: the `client_email` from the JSON.
   - App permissions: add **OnOffMyPC** and grant
     **Release to testing tracks** (required for internal),
     **Release to production, exclude devices, and use Play App Signing**
     (required for production), and optionally
     **View app information and download bulk reports**.
   - Account permissions: none are required.
   - Send the invite/save.
3. Permission propagation is usually minutes and can take up to 24 hours.
   Do not debug the script until the invite is saved.

#### Part C — Local credential

```bash
mkdir -p /opt/repo/onoffmypc-private/secrets
mv ~/Downloads/onoffmypc-play-*.json \
   /opt/repo/onoffmypc-private/secrets/play-service-account.json
chmod 600 /opt/repo/onoffmypc-private/secrets/play-service-account.json

export PLAY_SERVICE_ACCOUNT_JSON=/opt/repo/onoffmypc-private/secrets/play-service-account.json
```

`PLAY_SERVICE_ACCOUNT_JSON` may also contain the JSON inline, but a file path is
safer and easier to rotate. `GOOGLE_APPLICATION_CREDENTIALS` is accepted as an
alternative. Both `secrets/` and `play-service-account*.json` are gitignored.

### Per release

```bash
cd mobile

# 1. Prove the credential and options without changing anything
node scripts/publish-play.mjs --dry-run

# 2. Verify the Cloud project is linked and the account can open a Play edit
#    (creates and immediately discards an edit; no upload, no release)
node scripts/publish-play.mjs --check

# 3. Upload to internal testing as a draft
node scripts/publish-play.mjs --track internal

# 4. Publish that draft without re-uploading it (status defaults to completed)
node scripts/publish-play.mjs --rollout

# 5. Put an already-uploaded versionCode on production without re-uploading
#    (defaults to a draft; review it in the console)
node scripts/publish-play.mjs --track production --promote 21

# 6. After the listing, data-safety, content-rating and app-access forms are
#    complete, submit the production draft for review.
#    The first production release also needs countries selected in the console:
#    Release -> Production -> Countries/regions. The API cannot set the
#    app-level list, and a first release cannot be staged.
node scripts/publish-play.mjs --track production --rollout

# Read-only: every track and its releases
node scripts/publish-play.mjs --tracks

# Internal app sharing: upload the AAB and print a shareable install link
node scripts/publish-play.mjs --app-sharing

# Upload the generated phone screenshots (playstore/screenshots/play/*.png).
# The image type must be the plural `phoneScreenshots`.
node scripts/publish-play.mjs --upload-screenshots
node scripts/publish-play.mjs --upload-screenshots --replace   # overwrite existing

# Read-only: print the current listing and image counts
node scripts/publish-play.mjs --inspect
```

> If **Managed publishing** is enabled, `edits:commit` is retried with
> `changesNotSentForReview=true`. The edit is saved, but you must send it for
> review from **Play Console → Publishing overview**.

Expected dry-run output ends with `authenticated` and
`dry run: credentials valid, nothing uploaded`. `--check` ends with
`access check passed`; a `403` there means the Play project link or the
service-account permission is still missing.

Flags: `--aab`, `--track internal|alpha|beta|production`,
`--status draft|completed`, `--whatsnew`, `--notes`, `--dry-run`, `--check`,
`--rollout`, `--inspect`, `--tracks`, `--promote <versionCode>`,
`--app-sharing`, `--upload-screenshots`, `--replace`.

### What the API cannot do

- **Listing graphics** (icon, feature graphic, phone screenshots) are not part
  of the Android Publisher v3 API. Upload them under **Store listing** in the
  console. `--inspect` shows which image slots are populated.
- **Testers**: the API only accepts **Google Groups**. Individual email lists
  are a console-only feature, so add your own account under
  **Testing → Internal testing → Testers**.
- **Data safety**, **content rating**, **target audience**, and **app access**
  are console forms, not API resources.
- **Production countries/regions** are an app-level setting in the console. The
  API's per-release `countryTargeting` is only accepted for staged releases,
  and the first release on a track cannot be staged.
- **Google Sign-In SHA-1** belongs to the OAuth client in Google Cloud; there
  is no public API for that client configuration. Defaults: the signed AAB at
`android/app/build/outputs/bundle/release/app-release.aab`, track `internal`,
status `draft`.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `could not obtain an access token (400): invalid_grant` | Key was deleted/rotated, wrong project, or the machine clock is badly skewed. Create a new key. |
| `403 ... Google Play Android Developer API has not been used in project ...` | Enable the API in the linked Google Cloud project (Part A, step 3). |
| `403 ... does not have permission` | The service account is not invited, or the app-level permission is missing (Part B). |
| `403 ... project ... has not been linked` | Play Console → Setup → API access does not link the Cloud project that owns the service account. |
| `404` | Wrong package name, or the app/first release does not exist on Play yet. Create the first release manually. |
| `version code ... has already been used` | Bump `versionCode` in `app/build.gradle.kts` and rebuild. |
| `APK/AAB ... signed with the wrong key` | The AAB was signed with a different upload key. Restore `android/onoffmypc-release.jks` + `keystore.properties` and rebuild. |
| `429` / `5xx` | Transient Play API limit or outage; retry after a few minutes. |

Never commit the service-account JSON. If it is exposed, delete the key in
Google Cloud (the service account and Play permissions stay), create a new key,
and update the local path.
