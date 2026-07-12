# Changelog

## [Unreleased]

## [0.3.1] - 2026-07-12

### Changed
- Billing checkout buttons now say **Pay now** (or **Continue checkout**) instead of naming a payment provider.
- Receipt portal actions use provider-agnostic **Manage receipts** copy so future payment providers can plug in without UI renames.

## [0.3.0] - 2026-07-11

### Changed
- **One-time device unlocks**: each device receives a 30-day trial, after which billing targets that device for a $15 one-time purchase with no subscription. The app shows each device's trial, unlocked, and payment-review state while preserving existing Lifetime account access.
- New purchases now open an API-created hosted checkout instead of collecting a payment method, reference, and note in the app. Both platforms refresh until payment confirmation unlocks the selected device and can open a receipts portal without shipping payment credentials.
- A command blocked by an expired device trial now opens billing with that device preselected.
- Command requests now distinguish offline queueing, delivery to the device connection, and device acknowledgement while explicitly stating that PC state is not yet confirmed; disruptive controls name the target and require confirmation.
- Device lists and details now separate connection state, last-contact freshness, and last-reported PC telemetry; unknown, loading, empty, retry, and screen-reader states are clearer and consistent across Android and iOS.

## [0.2.1] - 2026-07-07

### Added
- **Continue with Google** is now enabled — sign in or create your account with one tap.

## [0.2.0] - 2026-07-07

### Added
- **Continue with Google**: sign in or create an account with Google (shown once the Google client ID is configured).
- **Plan & Billing screen**: view your plan, the free-trial countdown, and the one-time $15 Lifetime unlock; submit a legacy payment for review and see payment history. Reachable from Account and the menu.
- **Free-trial banner** on the devices screen showing days left (or a "trial ended" prompt), and an **Upgrade** prompt when a power command is blocked after the trial ends.
- **Pull-to-refresh** on the device detail screen.

## [0.1.3] - 2026-07-05

### Added
- **Brand logo** now appears on the login, register, reset-password, and devices screens.
- **Devices menu**: the top bar has a hamburger menu with **Account** and **Logout**.

### Changed
- **Logout confirmation**: signing out now asks for confirmation first (from the devices menu and the account screen).

## [0.1.2] - 2026-07-04

### Added
- **Subscription plan** shown on the account screen (name + device limit), and **Replace token** on a device's menu (regenerates the token for swapped/damaged ESP hardware, keeping the device's name and history). Device-add now respects the plan's device limit.
- **Account deletion grace period**: deleting your account now schedules removal 15 days out and shows a live countdown (days/hours/minutes/seconds) with a **Keep my account** button to cancel; a dashboard banner also appears while pending. Backed by the API's soft-delete + `/auth/account/cancel-deletion`.
- **Show / hide password**: every password field (login, register, change email, and change password) now has a Show/Hide toggle.

### Changed
- **Light & dark theme**: the app now follows the phone's system light/dark setting instead of always rendering dark.

## [0.1.1] - 2026-07-03

### Added
- **Push notifications (FCM)**: registers the device's FCM token on login and shows notifications for **device offline/online** and **command delivered/failed** (`firebase-messaging` + a conditionally-applied google-services plugin; notification channel + Android 13 permission request; `POST /push/register`). See `PUSH.md`.

### Changed
- **App icon + notification icon** now use the OnOffMyPC toggle logo — an adaptive launcher icon (beige background + mark) replacing the default Android icon, and a white notification silhouette.

### Fixed
- **Login/screen contrast**: the app now always renders its dark theme and paints its own background. Previously it fell back to an incomplete light color scheme on light-mode phones, producing black text on the dark window background.

## [0.1.0] - 2026-07-02

### Added
- **Release signing**: `app/build.gradle.kts` signs `assembleRelease` from CI env vars or a local (gitignored) `keystore.properties` (unsigned when absent, so debug is unaffected). The `app-v*` release workflow decodes a keystore secret and builds/publishes a **signed** APK, and verifies the tag matches `versionName`. See `RELEASE.md`.
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
