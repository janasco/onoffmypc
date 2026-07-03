# Publishing to Google Play

## AAB vs APK
Yes — new apps must ship as an **Android App Bundle (`.aab`)**, not an APK. Good
news: our release signing config already applies to the bundle, so
`:app:bundleRelease` produces a **signed** `.aab` with no extra work.

## Get the signed .aab
You don't need a local Android setup — use CI:

1. GitHub → the `onoffmypc-android` repo → **Actions** → **Build AAB (Play Store)** → **Run workflow**.
2. When it finishes, download the **`onoffmypc-release-aab`** artifact → it contains `app-release.aab`.

(Or locally, if you have the SDK: `./gradlew :app:bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.)

## Understand Play App Signing (important)
Google **manages your app's real signing key** ("Play App Signing", mandatory for
new apps). You upload an `.aab` signed with your **upload key** (that's our
existing keystore), and Google re-signs it with the app signing key it holds.

- Keep our keystore safe — it's now your **upload key** (used to authenticate uploads).
- If you ever lose the upload key, Google can reset it; if Google holds the app signing key, your users are never stranded.
- **FCM still works** regardless of the re-signing: we send via the FCM HTTP v1 **service account**, which doesn't depend on the app's SHA fingerprint. (You'd only need to register a SHA in Firebase if you used Google Sign-In / Safety Net / App Check — we don't.)

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
   - **Target audience** (not children), **App access** (note it needs an account + invite code — provide test credentials for review), **Ads** = none
6. **Production** — Release → Production → create release → upload (or promote the tested build) → submit for review.

## Versioning
Every upload needs a higher **`versionCode`**. We're at `versionCode 2`
(`versionName 0.1.1`). Bump `versionCode` in `app/build.gradle.kts` for each Play
upload (and `versionName` when the user-facing version changes).

## Later: automate uploads
Once the app exists on Play, subsequent uploads can be automated:
- Create a **Google Cloud service account**, grant it access in Play Console (Users & permissions), download its JSON key.
- Add a GitHub Actions job using `r0adkll/upload-google-play@v1` (service-account JSON as a secret) to push the `.aab` to a track on tag.

Ask and I'll wire that workflow up.

## Recommended path
1. Run the **Build AAB** workflow, download the `.aab`.
2. Create the app, enroll in Play App Signing, upload to **Internal testing**, install on your phone, verify login + push.
3. Fill the store listing (icon + feature graphic are ready in `playstore/`; add screenshots) and the data-safety/content-rating forms.
4. Promote to **Production** and submit for review.
