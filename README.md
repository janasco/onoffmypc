# OnOffMyPC — Android

Native Android app for [OnOffMyPC](https://onoffmypc.com) — remotely power your PC
on/off and see live telemetry, backed by the same API as the web app
(`https://api.onoffmypc.com`).

## Stack
- **Kotlin** + **Jetpack Compose** (Material 3), dark-first to match the web app
- Gradle (Kotlin DSL) with a version catalog (`gradle/libs.versions.toml`)
- `compileSdk 35` · `minSdk 26` · `targetSdk 35`

## Build
Open in **Android Studio** (Ladybug or newer) and run the `app` configuration, or:

```bash
./gradlew :app:assembleDebug
```

A JDK 17 toolchain and the Android SDK are required (Android Studio provides both).

## Architecture
MVVM + a small manual DI container (`Graph`, set up in `OnOffApp`). Networking is
Retrofit + OkHttp + kotlinx.serialization. **Auth is cookie-based**: the API sets
an HttpOnly `session` cookie on login and accepts it on later requests, so a
`SessionCookieJar` captures/replays it (persisted app-private via `SessionStore`;
device backups are disabled so it can't be extracted).

```
app/src/main/kotlin/com/onoffmypc/android/
  MainActivity.kt            # Compose host -> AppNav
  OnOffApp.kt, Graph.kt      # Application + DI
  data/
    Constants.kt             # Api.BASE_URL
    model/Models.kt          # DTOs + CommandType
    remote/                  # ApiService, ApiClient, SessionCookieJar
    SessionStore.kt, OnOffRepository.kt
  ui/
    theme/                   # Color, Theme (brand palette)
    auth/                    # LoginScreen, AuthViewModel
    devices/                 # DevicesScreen (list + power controls), DevicesViewModel
    navigation/AppNav.kt     # login <-> devices
```

## Implemented
- Login (`POST /auth/login`), session persistence, sign-out (`POST /auth/logout`)
- Device list (`GET /devices`) with online / PC-on status
- Power controls — on / off / force-off (with confirm) / reset (`POST /commands/:id`)

## Roadmap (next)
1. Register + forgot-password flows.
2. Device detail: telemetry (temp/humidity/RSSI) + history chart; auto-refresh.
3. Add/rename/delete device; add-device token reveal.
4. Harden token storage (EncryptedSharedPreferences) and add release signing.
5. Push notifications for status changes (later).

See `CHANGELOG.md` for changes.
