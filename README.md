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

## Project layout
```
app/src/main/
  kotlin/com/onoffmypc/android/
    MainActivity.kt          # entry point + Compose host
    ui/theme/                # Color.kt, Theme.kt (brand palette)
    data/Constants.kt        # Api.BASE_URL
  res/                       # strings, themes
```

## Roadmap (initial)
1. Auth: login/register against the API (Bearer token, stored in EncryptedSharedPreferences).
2. Dashboard: list devices with live status.
3. Device control: power on / off / force off / reset, with confirmation.
4. Telemetry: temperature/humidity/RSSI, history chart.
5. Push notifications for status changes (later).

See `CHANGELOG.md` for changes.
