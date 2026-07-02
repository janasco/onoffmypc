# Changelog

## [Unreleased]

### Fixed
- **Login/screen contrast**: the app now always renders its dark theme and paints its own background. Previously it fell back to an incomplete light color scheme on light-mode phones, producing black text on the dark window background.

### Added
- **Push notifications (FCM, client)**: `firebase-messaging` with a conditionally-applied google-services plugin (builds without config), a messaging service, notification channel + Android 13 permission request, and FCM-token registration with the backend (`POST /push/register` on login/refresh). Inert until `app/google-services.json` is added — see `PUSH.md`. Notifies on device offline/online and command delivered/failed.
- **Release signing**: `app/build.gradle.kts` signs `assembleRelease` from CI env vars or a local (gitignored) `keystore.properties` (unsigned when absent, so debug is unaffected). The `app-v*` release workflow now decodes a keystore secret and builds/publishes a **signed** APK, and verifies the tag matches `versionName`. See `RELEASE.md`.

- Initial project scaffold: Kotlin + Jetpack Compose (Material 3), Gradle Kotlin DSL with a version catalog, Gradle 8.9 wrapper; brand-matched dark theme.
- **Networking layer**: Retrofit + OkHttp + kotlinx.serialization (`data/remote`). Cookie-based auth — a `SessionCookieJar` persists the API's `session` cookie (the API also accepts it, so no token in the response body is needed), stored in app-private prefs (`SessionStore`); backups disabled so it isn't extracted.
- **Auth**: login screen wired to `POST /auth/login` with error handling (`ui/auth`).
- **Devices dashboard**: lists devices from `GET /devices` with online/PC status, and power controls (Power On / Power Off / Force Off / Reset) via `POST /commands/:id`, with a Force-Off confirmation dialog and result snackbars (`ui/devices`).
- **Device detail** screen (tap "View details"): live stats (PC state, temperature, humidity, signal, last update) from `GET /devices/:id` + `/devices/:id/status` + `/telemetry/:id`, a dependency-free 7-day temperature line chart from `/telemetry/:id/history` (Compose Canvas), a **command history** list from `GET /commands/:id` (time, command, colored status), the power controls, and a 30s auto-refresh loop. Power-control UI extracted to a shared `ui/components/PowerControls`.
- **Add / rename / delete device**: a FAB opens an add dialog (`POST /devices`) and reveals the Device ID + Token once (with copy-to-clipboard) for ESP32 setup; each card has an overflow menu to rename (`PATCH /devices/:id`) or delete (`DELETE /devices/:id`, with confirmation). The list refreshes after each change.
- **Account screen** (from the dashboard "Account" action): profile (email, member since), change email (`POST /auth/change-email`), change password (`POST /auth/change-password`), sign out, and a delete-account danger zone (`DELETE /auth/account`, type-your-email confirmation) — all from `GET /auth/me`.
- **Email verification**: a dashboard banner appears when the account's email is unverified, with a Resend action (`POST /auth/resend-verify`); also shown on the account screen. (Verification itself is completed via the emailed link.)
- **Register flow**: create-account screen (email, password, confirm, invite code) wired to `POST /auth/register` then auto-login; navigates from/back to the login screen.
- **Forgot-password**: a "Forgot password?" screen requests a reset email via `POST /auth/forgot-password` (the reset itself is completed through the emailed link), with an anti-enumeration confirmation message.
- **Pull-to-refresh** on the dashboard (`PullToRefreshBox`); post-add/rename/delete reloads now use the same lightweight refresh instead of the full-screen spinner.
- **401 auto-logout**: an OkHttp interceptor clears the session and signals the app (`AuthEvents`) on a 401 from an authenticated request; the nav host returns to login. Public auth endpoints are excluded so a bad-password 401 stays on the login screen.
- Navigation between login, register, and dashboard, gated on an existing session; sign-out via `POST /auth/logout`.
- Simple manual DI (`Graph`, initialized in `OnOffApp`) and MVVM (`AuthViewModel`, `RegisterViewModel`, `DevicesViewModel`).
