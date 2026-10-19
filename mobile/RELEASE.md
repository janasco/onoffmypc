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

1. Bump `versionCode` and `versionName` in `app/build.gradle.kts`.
2. Add a `CHANGELOG.md` entry.
3. Build the signed artifacts:

   ```bash
   cd android
   ./gradlew :app:assembleRelease :app:bundleRelease
   ```

   - APK → `app/build/outputs/apk/release/`
   - AAB → `app/build/outputs/bundle/release/` (for Play)

4. Confirm the APK actually targets the required API level — Google Play
   rejects updates below it:

   ```bash
   $ANDROID_HOME/build-tools/36.0.0/aapt2 dump badging \
     app/build/outputs/apk/release/*.apk | grep -E "^package:|targetSdkVersion"
   ```

5. Upload the APK to R2:

   ```bash
   VERSION=0.4.4
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

6. Update `web/src/lib/releases.ts` with the new version, size, and SHA-256,
   then deploy the web app. The downloads page reads only that file.
7. Update `releases/manifest.json` in the bucket (rerun
   `scripts/migrate-releases-to-r2.sh`, or edit the manifest and re-upload it).
8. Upload the AAB to the Play Console and roll it out.

Remove the previous version's prefix once the new one is live:

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
