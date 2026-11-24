# iOS Staged API Configuration and Privacy Manifest

Status: source implementation, 2026-11-24. This document covers only the iOS
client. It records what is committed, what the static gate verifies, and what
still requires a Mac with Xcode. No iOS build, signing, simulator, device, or
App Store validation is claimed here.

## Source of truth and generated files

- `ios/project.yml` is the XcodeGen source of truth.
- `ios/OnOffMyPC.xcodeproj` and `ios/OnOffMyPC/Info.plist` are generated and
  ignored; do not commit or hand-edit them.
- `ios/OnOffMyPC/PrivacyInfo.xcprivacy` is reviewed source and **is** committed.

The API origin is a user-defined build setting named `API_BASE_URL`. XcodeGen
writes the placeholder `$(API_BASE_URL)` into the generated Info.plist, and
Xcode expands it to the effective value while processing the Info.plist for the
built app. `INFOPLIST_EXPAND_BUILD_SETTINGS` is explicitly enabled in
`project.yml`.

## API base URL configuration

| Configuration | `API_BASE_URL` |
|---|---|
| `Debug` | `https://api.onoffmypc.com` (production default) |
| `Release` | `https://api.onoffmypc.com` (production default) |
| `Staging` | `https://onoffmypc-api-staging.onoffmypc.workers.dev` |

Production is the target-level default:

```yaml
settings:
  base:
    API_BASE_URL: https://api.onoffmypc.com
  configs:
    Staging:
      API_BASE_URL: https://onoffmypc-api-staging.onoffmypc.workers.dev
```

The generated Info.plist exposes it under the same key:

```yaml
info:
  properties:
    API_BASE_URL: $(API_BASE_URL)
```

Only the origin belongs in this setting. Do not put credentials, a query, a
fragment, or a non-HTTPS URL in it. The client rejects those values. The value
is embedded in the app bundle and is not secret; do not treat it as
configuration that can hide an environment.

### Generate the project

On macOS:

```bash
cd mobile/ios
brew install xcodegen   # one-time
xcodegen generate
```

The generated `OnOffMyPC/Info.plist` normally contains the literal placeholder
`$(API_BASE_URL)` until Xcode builds the target. Check the **built app's**
Info.plist, not the generated source plist.

### Build production

```bash
cd mobile/ios
xcodebuild build \
  -project OnOffMyPC.xcodeproj \
  -scheme OnOffMyPC \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
```

### Build staging

Use the Staging configuration:

```bash
cd mobile/ios
xcodebuild build \
  -project OnOffMyPC.xcodeproj \
  -scheme OnOffMyPC \
  -configuration Staging \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
```

In Xcode, choose **Product → Scheme → Edit Scheme → Run → Build
Configuration → Staging**. The staging build currently uses the same bundle
identifier (`com.onoffmypc.app`), so installing it replaces a production build
on the same device/simulator.

For a one-off build without changing `project.yml`, override the setting on the
command line:

```bash
xcodebuild build \
  -project OnOffMyPC.xcodeproj \
  -scheme OnOffMyPC \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  API_BASE_URL=https://onoffmypc-api-staging.onoffmypc.workers.dev
```

Verify the effective value in the built app before using it:

```bash
APP=$(find ~/Library/Developer/Xcode/DerivedData \
  -path '*Build/Products/*iphonesimulator/OnOffMyPC.app' -type d | head -1)
plutil -extract API_BASE_URL raw -o - "$APP/Info.plist"
```

Expected: the production or staging origin, without a trailing slash, not the
literal text `$(API_BASE_URL)`.

## Runtime validation in APIClient

`ios/OnOffMyPC/Networking/APIClient.swift` reads `API_BASE_URL` from
`Bundle.main` and validates it once per client instance:

- the value is trimmed and must be non-empty;
- the scheme must be HTTPS (case-insensitive);
- a host must exist and be non-empty;
- user info, query strings, and fragments are rejected;
- a missing or invalid value makes requests fail closed with
  `APIError.configuration`; there is no silent production fallback.

The cookie controls remain origin-bound and use the configured URL, not a
hard-coded production host:

- cookie storage and automatic cookie handling are disabled;
- the response URL must be HTTPS and match the derived API host;
- the response port must match the derived API port (default 443);
- the captured `session` cookie must be `Secure`, non-empty, and its domain must
  match the configured API host; the reviewed `.onoffmypc.com` parent-domain
  allowance applies only when the configured host is within `onoffmypc.com`;
- redirects are never followed;
- the URL cache is disabled.

### Origin-bound Keychain session

Both configurations use the same bundle identifier and Keychain service, so the
stored session carries its issuing API origin. `Networking/Session.swift` keeps
one Keychain item containing JSON:

```json
{"cookie":"...","origin":"https://host:port"}
```

The origin is the canonical scheme, host, and port (443 when the URL omits it).

- `APIClient` derives the configured origin from `API_BASE_URL`.
- `Session.cookie(for:)` returns a cookie only for that exact origin and clears
  a mismatch. `Session.setCookie(_:origin:)` stores the cookie and its origin.
- `AppState` starts logged in only when `Session.isLoggedIn(for:)` matches the
  configured origin.
- 401 responses and logout call `Session.clear()`.
- Raw-cookie Keychain items from older builds have no origin. They are treated
  as unusable and deleted, never replayed.

Switching an installed app between staging and production therefore
automatically invalidates the old origin's session. No manual sign-out is
required; users upgrading from a build that stored a legacy raw cookie may be
signed out once. A staging session cannot be replayed against production, or
the reverse.

The APIClient's own validation is source-level only. URLSession behavior,
redirect refusal, Keychain upgrade behavior, and cookie capture still need a
macOS/device test.

## Privacy manifest

`ios/OnOffMyPC/PrivacyInfo.xcprivacy` is an explicit XcodeGen resource:

```yaml
sources:
  - path: OnOffMyPC
    excludes:
      - PrivacyInfo.xcprivacy
  - path: OnOffMyPC/PrivacyInfo.xcprivacy
    buildPhase: resources
```

The manifest declares:

- `NSPrivacyTracking` = `false`;
- an empty `NSPrivacyTrackingDomains` array;
- the required-reason API category `NSPrivacyAccessedAPICategoryUserDefaults`
  with reason `CA92.1` (app-only defaults).

The UserDefaults declaration is based on the reviewed app sources:
`Networking/Session.swift` reads, writes, and removes the app-only
`fcm-push-token` key with `UserDefaults.standard`. No APNs writer currently
exists, but the API is present in shipped code.

No other required-reason API category was found in the reviewed Swift app
sources (no file-timestamp, system-boot-time, disk-space, or active-keyboard
usage). Dependencies must ship their own manifests; the resolved GoogleSignIn
and transitive package versions are not in this repository because
`Package.resolved` is not committed. Review the archive's privacy report on
macOS before release.

### Collected-data gap

`NSPrivacyCollectedDataTypes` is intentionally **absent**. The app sends
account, session, device, command, and billing-related data to the OnOffMyPC
API, but an accurate Apple data-collection declaration depends on the backend
and privacy-policy review that is not available in this repository. Declaring
an empty array (which would imply no collection) or inventing categories would
be inaccurate.

Consequences:

- App Store tooling may report a missing `NSPrivacyCollectedDataTypes` key
  until a reviewed declaration is added.
- App Store privacy answers still need to be reconciled with
  `DEPENDENCY_PRIVACY_INVENTORY.md` and the production privacy policy.
- This manifest is not a legal privacy notice and does not replace the App
  Store privacy form.

## Static checks

Run from `mobile/`:

```bash
node --check scripts/check-mobile-hardening.mjs
node --check scripts/test-mobile-hardening.mjs
node --check scripts/lib/mobile-hardening-ios-session.mjs
node scripts/check-mobile-hardening.mjs
node scripts/test-mobile-hardening.mjs
```

The hardened gate now checks the iOS-specific invariants:

- `project.yml` has the exact production default and staging origin, the
  `Staging` build configuration, and the `$(API_BASE_URL)` Info.plist wiring;
- there is exactly one reviewed production, staging, and Info.plist
  `API_BASE_URL` entry; duplicate or extra YAML keys are rejected;
- no iOS `API_BASE_URL` uses cleartext HTTP;
- `APIClient` reads `API_BASE_URL`, validates HTTPS and a non-empty host, fails
  closed on invalid configuration, and derives the canonical cookie origin from
  that URL;
- the cookie host/port, domain, Secure, empty-cookie, redirect, and cache
  controls are still present;
- `Session.swift` stores one JSON Keychain item containing the cookie and
  origin, exposes only origin-scoped accessors, clears an origin mismatch, and
  deletes malformed or legacy raw-cookie items;
- `APIClient` reads and writes the session only for the configured origin and
  clears it on 401/logout; `AppState` requires the configured origin for its
  initial logged-in state;
- `PrivacyInfo.xcprivacy` exists, is an explicit XcodeGen resource, declares no
  tracking, and declares the UserDefaults reason.

On this Linux host (Node v22.23.2), the four commands above passed on
2026-11-24. The gate is static and cannot prove XcodeGen output, Swift
compilation, runtime URLSession behavior, or App Store acceptance.

## Remaining validation (requires macOS/Xcode)

- Run `xcodegen generate` with Xcode 16 or newer and confirm the project opens.
- Build Debug/Release/Staging for the simulator, then inspect the built
  Info.plist to confirm the expected `API_BASE_URL` value.
- Confirm ATS has no exceptions and the staging HTTPS endpoint is reachable.
- Run a staging build against the staging Worker, then a production build
  against production; confirm the old origin's session is invalidated without a
  manual sign-out and no cross-environment fallback exists.
- Upgrade a build that still has a raw-cookie Keychain item; confirm the item is
  deleted and the app starts on the login screen.
- Exercise cookie capture, cross-origin cookie rejection, empty-cookie
  rejection, redirect refusal, cache behavior, and origin-switch clearing on
  macOS/device.
- Confirm `PrivacyInfo.xcprivacy` is present in the built app bundle with
  `plutil -lint` and the archive privacy report.
- Reconcile collected-data declarations and App Store privacy answers before
  submission.
- Signing, provisioning, physical-device checks, TestFlight, and App Store
  validation are all outstanding.

Do not treat this document or the static gate as evidence that an iOS build
succeeded.
