# OnOffMyPC — Mobile clients

Native Android and iOS clients for [OnOffMyPC](https://onoffmypc.com). They let
authenticated users manage devices, send power commands, inspect telemetry and
command history, manage each device's 30-day trial and $15 one-time unlock, and
receive device notifications. Both use the shared API at `https://api.onoffmypc.com`.

## Tech stack

| Area | Choice |
|---|---|
| Language | **Kotlin** 2.0.20 |
| UI | **Jetpack Compose** (Material 3), Compose BOM 2024.09.03 — dark-first, single-Activity |
| Architecture | **MVVM** + `StateFlow` / `collectAsStateWithLifecycle`; manual DI (`Graph`) |
| Navigation | **Navigation Compose** 2.8.3 |
| Lifecycle | AndroidX Lifecycle 2.8.6 (`runtime-compose`, `viewmodel-compose`) |
| Networking | **Retrofit** 2.11.0 + **OkHttp** 4.12.0 (logging interceptor) |
| JSON | **kotlinx.serialization** 1.7.3 (via a small in-repo Retrofit converter) |
| Auth | Cookie-based — an OkHttp `CookieJar` persists the API `session` cookie |
| Push | **Firebase Cloud Messaging** (Firebase BOM 33.5.1); google-services plugin 4.4.2 |
| Charts | dependency-free **Compose `Canvas`** (temperature history) |
| Build | **Gradle** 8.9 (Kotlin DSL) + version catalog; **AGP** 8.6.1 |
| Toolchain | **JDK 17**; `compileSdk 35` · `minSdk 26` · `targetSdk 35` |
| CI/CD | GitHub Actions — build check on push; signed-APK release on `app-v*` tags |

Android is the primary mobile target. iOS is generated from `ios/project.yml`
and currently has simulator build CI; signing, store distribution, push, and
feature parity should be treated separately.

No third-party DI, image-loading, or networking-abstraction frameworks — the app
leans on AndroidX + a thin hand-rolled layer to stay small and legible.

## Architecture

Single `MainActivity` hosting Compose (`AppNav`). **MVVM**: screens observe a
`ViewModel`'s `StateFlow`; a minimal manual DI container (`Graph`, initialized in
`OnOffApp`) provides the repository. Networking is Retrofit + OkHttp +
kotlinx.serialization. **Auth is cookie-based**: the API sets an HttpOnly
`session` cookie on login and accepts it on later requests, so a
`SessionCookieJar` captures/replays it (persisted app-private via `SessionStore`;
device backups disabled so it can't be extracted). A 401 interceptor clears the
session and routes back to login.

```
app/src/main/kotlin/com/onoffmypc/android/
  MainActivity.kt              # Compose host -> AppNav; notif permission + FCM register
  OnOffApp.kt, Graph.kt        # Application + manual DI
  data/
    Constants.kt               # Api.BASE_URL
    model/Models.kt            # DTOs + CommandType
    remote/                    # ApiService, ApiClient, SessionCookieJar,
                               #   UnauthorizedInterceptor, KotlinxJsonConverterFactory
    SessionStore.kt, OnOffRepository.kt
  push/                        # FCM: messaging service, PushManager,
                               #   Notifications, permission request
  ui/
    theme/                     # brand palette, dark-first theme
    auth/                      # login, register, forgot-password
    devices/                   # dashboard (list + power controls), device detail
    account/                   # profile, change email/password, delete account
    components/                # shared power controls and command/device-status presentation
    navigation/AppNav.kt       # route graph
```

## Social login config

| Platform | Key | Where | Notes |
|---|---|---|---|
| Android | `GOOGLE_SERVER_CLIENT_ID` | `android/gradle.properties` → BuildConfig | Existing Google Credential Manager flow |
| Android | `APPLE_SERVICES_ID` | `android/gradle.properties` → BuildConfig | Empty hides Continue with Apple (Custom Tab OIDC → `/auth/apple`) |
| Android | `MICROSOFT_CLIENT_ID` | `android/gradle.properties` → BuildConfig | Empty hides Continue with Microsoft (Custom Tab OIDC → `/auth/microsoft`) |
| iOS | `GoogleSignInManager.clientID` | Swift constant | Existing Google SDK flow |
| iOS | `AppleSignInManager.audienceClientID` | Swift constant | Set to `com.onoffmypc.app` (or Services ID) when SiWA is enabled; empty hides button |
| iOS | `MicrosoftSignInManager.clientID` | Swift constant | Empty hides button; redirect `msauth.com.onoffmypc.app://auth` |

Android OIDC redirect scheme: `com.onoffmypc.android://oauth` (register the same
redirect on Entra; Apple Services ID return URLs are typically HTTPS — use a
web bridge or keep Apple disabled on Android until configured). API
`APPLE_CLIENT_IDS` / `MICROSOFT_CLIENT_IDS` must include the same audiences.
Ship a store release only after provider credentials are set.

## Features
- **Auth**: login, register (invite-gated), forgot-password; Google / Apple / Microsoft social sign-in (config-gated); cookie session + 401 auto-logout
- **Devices**: separate connection, last-contact freshness, and last-reported PC state; power controls (on / off / force-off / reset); target-specific confirmation for disruptive actions; honest queued/awaiting-ack/device-acknowledged/expired command states; add / rename / delete; pull-to-refresh
- **Device detail**: explicit online, offline, or unknown presence; telemetry freshness; accessible 7-day temperature chart; command history; 30s auto-refresh
- **Account and billing**: profile, security settings, deletion, email verification, a 30-day trial for each device, and one-time $15 device unlocks through API-created Polar hosted checkout; existing Lifetime accounts remain supported. Polar credentials are never shipped in either app.
- **Push notifications (FCM)**: device offline/online, device-acknowledged commands, and commands that expire without acknowledgement

## Native-store billing policy

The current native UI opens Polar in the system browser to unlock app functionality. Do not
publish that purchase link unchanged to every App Store or Google Play storefront. Apple and
Google generally require their billing systems for digital app functionality, with regional
external-link/alternative-billing programs and eligibility rules. Before a store release, either
integrate the required store billing path or gate the Polar action to storefronts where the app is
properly enrolled. Direct/sideloaded distributions have different rules.

- [Apple App Review Guidelines 3.1](https://developer.apple.com/app-store/review/guidelines/#business)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)

See `CHANGELOG.md` for the full history.

## Build

The Android app lives in **`android/`** and the iOS app in **`ios/`**. Open the
**`android/`** folder in **Android
Studio** (Ladybug or newer) and run the `app` configuration, or:

```bash
cd android && ./gradlew :app:assembleDebug
```

A JDK 17 toolchain and the Android SDK are required (Android Studio provides both).

## Docs
- **[RELEASE.md](RELEASE.md)** — keystore setup and cutting a signed `app-v*` release
- **[PUSH.md](PUSH.md)** — Firebase project + backend service-account setup for FCM
- **[CHANGELOG.md](CHANGELOG.md)** — release notes
- **[ios/README.md](ios/README.md)** — iOS build and current scope
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Android/iOS architecture & feature coverage
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** — current theme tokens vs target
- **[docs/COMPONENT_LIBRARY.md](docs/COMPONENT_LIBRARY.md)** — Compose/SwiftUI component inventory
- **[docs/UX_GUIDELINES.md](docs/UX_GUIDELINES.md)** — trust/honesty UX rules
- **[docs/MOBILE_ROADMAP.md](docs/MOBILE_ROADMAP.md)** — incremental product/tech roadmap
- **[docs/KMP_MIGRATION_PLAN.md](docs/KMP_MIGRATION_PLAN.md)** — Kotlin Multiplatform phases
- **[docs/SECURITY_ASSESSMENT.md](docs/SECURITY_ASSESSMENT.md)** — private platform assessment link
