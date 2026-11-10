# Releasing the Android app

Release APKs are served from **Cloudflare R2** at
`https://releases.onoffmypc.com`. GitHub holds source only. There is no GitHub
Actions release pipeline — builds and uploads are done by hand.

Google Play distribution uses the same release build (an AAB built from the
same commit) uploaded through the Play Console.

## One-time setup

### Signing keystore

Keep this file safe and **never commit it** — losing it means you can no longer
update the app under the same signing identity.

```bash
keytool -genkeypair -v \
  -keystore android/onoffmypc-release.jks \
  -alias onoffmypc \
  -keyalg RSA -keysize 2048 -validity 10000
```

If `android/keystore.properties` and `android/onoffmypc-release.jks` already
exist, import them into the gitignored root `.env` without printing secrets:

```bash
bash scripts/import-android-keystore.sh
```

That fills `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`,
and `ANDROID_KEYSTORE_BASE64`, and restricts the files to `0600`.

### Cloudflare credentials

Publishing needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the
environment (see `release/R2-RELEASES.md`).

## Cutting a release

Run from `mobile/` unless noted.

1. **Bump the version.** The helper increments `versionCode` and sets
   `versionName`:

   ```bash
   node scripts/bump-version.mjs 0.4.6
   ```

   The `versionCode` must be higher than every previous Play upload, even for a
   rebuild. Edit `android/app/build.gradle.kts` directly if you prefer.

2. Update `distribution/whatsnew/whatsnew-en-US` (≤ 500 characters) and add a
   `CHANGELOG.md` entry.

3. **Build the signed artifacts:**

   ```bash
   cd android
   ./gradlew :app:assembleRelease :app:bundleRelease
   ```

   - APK → `app/build/outputs/apk/release/`
   - AAB → `app/build/outputs/bundle/release/` (for Play)

4. **Verify the AAB before uploading:**

   ```bash
   # targetSdk must meet Play's current requirement
   grep -E "targetSdkVersion|versionCode|versionName" \
     app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml

   # upload certificate must match the Play upload key
   keytool -printcert -jarfile app/build/outputs/bundle/release/app-release.aab \
     | grep SHA256
   ```

5. **Upload to Play:**

   ```bash
   export PLAY_SERVICE_ACCOUNT_JSON=/opt/repo/onoffmypc-private/secrets/play-service-account.json

   node scripts/publish-play.mjs --dry-run     # credentials only
   node scripts/publish-play.mjs --check       # project link + permission + app exists
   node scripts/publish-play.mjs --track internal --status completed
   node scripts/publish-play.mjs --tracks
   ```

   Promote the same versionCode to the other tracks without re-uploading:

   ```bash
   node scripts/publish-play.mjs --track alpha --promote <versionCode> --status completed
   node scripts/publish-play.mjs --track beta  --promote <versionCode> --status completed
   node scripts/publish-play.mjs --track production --promote <versionCode> --status completed
   ```

   To publish an existing draft instead, use `--track <name> --rollout`.
   With **Managed publishing** on, the commit is saved but must be sent from
   **Play Console → Publishing overview**. The uploader retries with
   `changesNotSentForReview=true` automatically.

6. **Optional direct APK distribution.** Upload the APK to R2 (step 7 below),
   update `web/src/data/releases.json`, then:

   ```bash
   cd ../web
   npm run releases:check          # compares against the live manifest
   npm run deploy
   ```

   `releases:check -- --verify` also re-downloads and hashes every artifact.

7. **Screenshots.** If the UI changed, replace
   `playstore/screenshots/play/*.png` (1080×1920) and run:

   ```bash
   node scripts/publish-play.mjs --upload-screenshots --replace
   ```

8. **Post-launch:** check the public page and run
   `node scripts/play-report.mjs --days 7` for crash/ANR and reviews.

### Uploading the APK to R2 (direct distribution)

```bash
VERSION=0.4.6
FILE=onoffmypc-android-$VERSION.apk
cp android/app/build/outputs/apk/release/*.apk "/tmp/$FILE"
npx wrangler@4.112.0 r2 object put \
  "onoffmypc-releases/releases/android/$VERSION/$FILE" \
  --file "/tmp/$FILE" \
  --content-type application/vnd.android.package-archive \
  --cache-control "public, max-age=31536000, immutable" \
  --remote
sha256sum "/tmp/$FILE"
```

Update `web/src/data/releases.json` with the new version, file name, size, and
SHA-256. Remove the previous version's prefix once the new one is live:

```bash
npx wrangler@4.112.0 r2 object delete \
  "onoffmypc-releases/releases/android/<old-version>/<old-file>" --remote
```

## Building locally

Gradle reads environment variables first, then the root `.env`, then the legacy
`android/keystore.properties`:

```properties
storeFile=/absolute/path/to/onoffmypc-release.jks
storePassword=...
keyAlias=onoffmypc
keyPassword=...
```

Without usable signing values the release build is left **unsigned**; debug
builds are unaffected.

## Notes

- R8/minification is **off** (`isMinifyEnabled = false`) to avoid mis-stripping
  the reflection-based networking stack. Keep rules for kotlinx.serialization
  live in `app/proguard-rules.pro` for when it is enabled.
- The version code must increase for every Play upload, even for a rebuild.
