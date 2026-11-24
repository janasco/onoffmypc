# Android staged API environment

Android builds select the backend API origin at build time. Production remains
the default; staging builds opt in with a Gradle property or environment
variable. The value is compiled into `BuildConfig.API_BASE_URL` and read by
`data/Constants.kt`, so it cannot be changed at runtime.

## Endpoints

| Environment | Base URL |
| --- | --- |
| Production (default) | `https://api.onoffmypc.com` |
| Staging | `https://onoffmypc-api-staging.onoffmypc.workers.dev` |

Staging data and accounts are isolated from production. Staging users, devices,
sessions, and push registrations do not exist in production, and production
credentials do not work against staging. Use a separate staging account; do not
sign in with a production account on a staging build.

## Build a staging APK

From `mobile/android`, pass `-PAPI_BASE_URL` with the staging URL:

```bash
ANDROID_HOME=/home/onoffmypc/Android/Sdk \
  ./gradlew -PAPI_BASE_URL=https://onoffmypc-api-staging.onoffmypc.workers.dev \
  :app:assembleDebug
```

The environment fallback behaves the same way when the property is omitted:

```bash
ANDROID_HOME=/home/onoffmypc/Android/Sdk \
  API_BASE_URL=https://onoffmypc-api-staging.onoffmypc.workers.dev \
  ./gradlew :app:assembleDebug
```

The `-P` property takes precedence over the environment variable. An explicitly
provided blank value fails the build rather than silently falling back to
production.

Install the staging debug build normally:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

To return to production, rebuild without `-PAPI_BASE_URL` or `API_BASE_URL`.
Because the endpoint is compiled in, an installed APK does not switch
environments by changing an environment variable. The first launch after the
switch clears any stored session issued by the previous API origin.

## Validation and safeguards

Gradle configuration fails for any value that is blank, is not an absolute
HTTPS URL, or contains credentials, a query, or a fragment:

```text
API_BASE_URL must be an absolute HTTPS URL without credentials, query, or fragment
```

This means cleartext HTTP cannot be compiled into the app. The runtime
`Api.BASE_URL` check additionally rejects a non-HTTPS value, and the app's
network security config already disallows cleartext traffic.

The session cookie jar derives its origin from the same `Api.BASE_URL`. The
encrypted session store persists the cookie value together with the issuing API
origin (scheme, host, and port). On load and replay, the stored origin must
exactly match the configured `Api.BASE_URL` origin; otherwise both stored values
are cleared and no cookie is returned. Replayed cookies remain host-only,
`Secure`, and `HttpOnly`, and are sent only over HTTPS to the configured API host
and port.

Switching an installed app between staging and production therefore safely
signs out: the old cookie is cleared before it can be replayed, rather than
being isolated while remaining usable. The app does not carry a staging session
into production or a production session into staging.

Static checks cover the Android base URL contract:

```bash
cd mobile
node scripts/check-mobile-hardening.mjs
node scripts/test-mobile-hardening.mjs
```

The hardening gate verifies the HTTPS production default, the
`BuildConfig.API_BASE_URL` field and its use, the `-P`/environment inputs, the
HTTPS-only guard, and that no cleartext base URL is accepted. It also rejects
`API_BASE_URL` overrides in `android/gradle.properties` and root/init Gradle
files, because Gradle project properties could otherwise change a production
build.

For a full local verification run:

```bash
cd mobile/android
ANDROID_HOME=/home/onoffmypc/Android/Sdk \
  ./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleRelease \
  --offline --no-daemon
```
