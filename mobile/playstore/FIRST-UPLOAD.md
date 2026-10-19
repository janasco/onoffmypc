# First Play Store upload — step by step

No API access needed. Everything below is done by hand in the Play Console, using
the assets already in this `playstore/` folder.

## A. Get the signed AAB
1. GitHub → `onoffmypc-mobile` → **Actions** → **Build AAB (Play Store)** → **Run workflow**.
2. Download the **`onoffmypc-release-aab`** artifact and **unzip** it → you get `app-release.aab`. That's the file you'll upload.

## B. Create the app
Play Console → **All apps** → **Create app**:
- App name: **OnOffMyPC**
- Default language: English (US)
- App or game: **App**
- Free or paid: **Free**
- Confirm the declarations (developer program policies, US export laws) → **Create app**.

## C. Prepare a test account (do this before "App access")
Because registration is invite-gated, reviewers need a way in:
- Register a throwaway account in the app using a valid **invite code** (e.g. `review@yourdomain.com`).
- Keep the email, password, and invite code handy for step D.

## D. Complete "Set up your app" (the dashboard tasks)
Work down the **Dashboard → Set up your app** checklist:
1. **App access** → "All or some functionality is restricted" → add instructions + the **test email, password, and invite code** from step C. *(Skip this and you WILL get rejected.)*
2. **Ads** → **No**, the app has no ads.
3. **Content rating** → start the questionnaire (email = your address), category **Utility/Productivity**, answer "No" to violence/sexual/etc. → get the rating.
4. **Target audience and content** → target age **18+** (or 13+), not designed for children.
5. **Data safety** → fill from `playstore/DATA-SAFETY.md`: collects Email, User IDs, Device IDs (FCM), device names; **not shared**; encrypted in transit; deletion available.
6. **Privacy policy** → `https://onoffmypc.com/privacy-policy`
7. **Government apps** → No. **Financial features** → None. **Health** → None.

## E. Store listing
Store presence → **Main store listing**:
- App name: **OnOffMyPC**
- Short + full description → copy from `playstore/LISTING.md`
- **App icon** → `playstore/icon-512.png`
- **Feature graphic** → `playstore/feature-graphic-1024x500.png`
- **Phone screenshots** → the 3 in `playstore/screenshots/` (add more later from real captures)
- App category: **Tools** (or Productivity); add contact email + website `https://onoffmypc.com`.

## F. First release — Internal testing (fast, no review)
Release → **Testing → Internal testing** → **Create new release**:
1. When prompted about **Play App Signing**, **accept it** (Google manages the app signing key; our keystore is the upload key).
2. **Upload** `app-release.aab`.
3. Release name auto-fills (for this build, `7 (0.3.0)`); "What's new" → paste the contents of `distribution/whatsnew/whatsnew-en-US`.
4. **Save → Review release → Start rollout to Internal testing.**
5. On the **Testers** tab, add your Google account (create an email list), copy the **opt-in link**, open it on your phone, and install from Play. Internal releases go live in minutes — no review.

## G. Verify on your phone
Sign in, confirm the dashboard loads, send a command, allow notifications, and
check a push arrives (toggle a device offline/online). Fix + re-upload with a
higher `versionCode` if needed.

## H. Go to Production
Release → **Production** → **Create new release** → **add from library** (promote
the build you tested) or upload the AAB → **Review → Start rollout to Production**
→ submit. First review typically takes a few days.

## Gotchas
- **App access test credentials + invite code are mandatory** — the #1 rejection reason for gated apps.
- Each upload needs a higher **`versionCode`** (currently 7). Bump it in `app/build.gradle.kts` and re-run **Build AAB**.
- The GitHub artifact is a **.zip** — unzip to get the `.aab`.
- Keep your **upload keystore** safe (it's the one from `RELEASE.md`).
