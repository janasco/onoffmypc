# Changelog

## [Unreleased]

### Added
- Initial project scaffold: Kotlin + Jetpack Compose (Material 3), Gradle Kotlin DSL with a version catalog, Gradle 8.9 wrapper; brand-matched dark theme.
- **Networking layer**: Retrofit + OkHttp + kotlinx.serialization (`data/remote`). Cookie-based auth — a `SessionCookieJar` persists the API's `session` cookie (the API also accepts it, so no token in the response body is needed), stored in app-private prefs (`SessionStore`); backups disabled so it isn't extracted.
- **Auth**: login screen wired to `POST /auth/login` with error handling (`ui/auth`).
- **Devices dashboard**: lists devices from `GET /devices` with online/PC status, and power controls (Power On / Power Off / Force Off / Reset) via `POST /commands/:id`, with a Force-Off confirmation dialog and result snackbars (`ui/devices`).
- **Device detail** screen (tap "View details"): live stats (PC state, temperature, humidity, signal, last update) from `GET /devices/:id` + `/devices/:id/status` + `/telemetry/:id`, a dependency-free 7-day temperature line chart from `/telemetry/:id/history` (Compose Canvas), the power controls, and a 30s auto-refresh loop. Power-control UI extracted to a shared `ui/components/PowerControls`.
- **Register flow**: create-account screen (email, password, confirm, invite code) wired to `POST /auth/register` then auto-login; navigates from/back to the login screen.
- **401 auto-logout**: an OkHttp interceptor clears the session and signals the app (`AuthEvents`) on a 401 from an authenticated request; the nav host returns to login. Public auth endpoints are excluded so a bad-password 401 stays on the login screen.
- Navigation between login, register, and dashboard, gated on an existing session; sign-out via `POST /auth/logout`.
- Simple manual DI (`Graph`, initialized in `OnOffApp`) and MVVM (`AuthViewModel`, `RegisterViewModel`, `DevicesViewModel`).
