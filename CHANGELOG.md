# Changelog

## [Unreleased]

### Added
- Initial project scaffold: Kotlin + Jetpack Compose (Material 3), Gradle Kotlin DSL with a version catalog, Gradle 8.9 wrapper; brand-matched dark theme.
- **Networking layer**: Retrofit + OkHttp + kotlinx.serialization (`data/remote`). Cookie-based auth — a `SessionCookieJar` persists the API's `session` cookie (the API also accepts it, so no token in the response body is needed), stored in app-private prefs (`SessionStore`); backups disabled so it isn't extracted.
- **Auth**: login screen wired to `POST /auth/login` with error handling (`ui/auth`).
- **Devices dashboard**: lists devices from `GET /devices` with online/PC status, and power controls (Power On / Power Off / Force Off / Reset) via `POST /commands/:id`, with a Force-Off confirmation dialog and result snackbars (`ui/devices`).
- Navigation between login and dashboard, gated on an existing session; sign-out via `POST /auth/logout`.
- Simple manual DI (`Graph`, initialized in `OnOffApp`) and MVVM (`AuthViewModel`, `DevicesViewModel`).
