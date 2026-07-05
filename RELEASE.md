# Releasing the Android app

A version tag `app-vX.Y.Z` builds a **signed release APK** and publishes it to the
public release repo `onoffmypc/onoffmypc-release` (shared with the firmware). Tags
are prefixed `app-v` so they don't collide with firmware `fw-v` tags.

## One-time setup

### 1. Generate an upload/signing keystore
Keep this file safe and **never commit it** — losing it means you can't update the
app on the same signing identity.

```bash
keytool -genkeypair -v \
  -keystore onoffmypc-release.jks \
  -alias onoffmypc \
  -keyalg RSA -keysize 2048 -validity 10000
# choose a strong keystore password + key password (can be the same)
```

### 2. Add GitHub Actions secrets (on the onoffmypc-mobile repo)
| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 onoffmypc-release.jks` (Linux) / `base64 -i onoffmypc-release.jks` (macOS) |
| `KEYSTORE_PASSWORD` | the keystore password |
| `KEY_ALIAS` | `onoffmypc` |
| `KEY_PASSWORD` | the key password |
| `RELEASE_REPO_TOKEN` | a fine-grained PAT with **contents: write** on `onoffmypc/onoffmypc-release` |

## Cutting a release
1. Bump `versionCode` (and `versionName` if the number changes) in `app/build.gradle.kts`.
2. Add a `CHANGELOG.md` entry.
3. Tag and push — the tag version must match `versionName`:
   ```bash
   git commit -am "release: app v0.1.0"
   git tag app-v0.1.0
   git push origin main app-v0.1.0
   ```
The workflow verifies the tag matches `versionName`, builds `:app:assembleRelease`
(signed with the keystore), and creates the GitHub Release with the APK attached.

## Building a signed release locally (optional)
Create a **gitignored** `keystore.properties` at the repo root:
```properties
storeFile=/absolute/path/to/onoffmypc-release.jks
storePassword=...
keyAlias=onoffmypc
keyPassword=...
```
Then: `./gradlew :app:assembleRelease` → `app/build/outputs/apk/release/`.

Without a keystore (`keystore.properties` absent and no env vars), the release
build is left **unsigned**; debug builds are unaffected.

## Notes
- R8/minification is **off** for this first release (`isMinifyEnabled = false`) to
  avoid mis-stripping the reflection-based networking stack. Keep rules for
  kotlinx.serialization live in `app/proguard-rules.pro` for when it's enabled.
- Distribution is a direct APK for now (sideload). Play Store / App Bundle
  (`bundleRelease` + Play signing) is a later step.
