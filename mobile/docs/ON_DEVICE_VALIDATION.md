# On-Device Privacy and Hardening Validation

Status: repeatable checklist, 2026-11-24. Source controls are summarized in
[`DEPENDENCY_PRIVACY_INVENTORY.md`](DEPENDENCY_PRIVACY_INVENTORY.md). This file
records what must be exercised on real devices and what is currently blocked in
this environment.

## Environment status

This work was performed on a Linux host without an attached Android device or
Xcode. The Android SDK is installed at `/home/onoffmypc/Android/Sdk`; the static
hardening gate, helper fixture tests, and Android debug unit tests passed. No
physical-device or iOS test result is claimed. Android has an origin-bound
session-cookie jar. iOS source now has HTTPS/host/port cookie validation, empty
cookie rejection, redirect blocking, and a disabled URL cache, but that behavior
still needs macOS/device validation (MP-13/OMP-19).

| Area | Available here? | Status |
|---|---|---|
| Node static privacy/hardening gate | Yes — Node v22.23.2 | Run and passed (2026-11-24) |
| Node SDK-denylist/XML helper tests | Yes — Node v22.23.2 | Run and passed (2026-11-24) |
| Android build / unit tests | Yes — SDK 36 with `ANDROID_HOME` | `:app:testDebugUnitTest` passed (2026-11-24) |
| Android lint / release build | Yes — SDK 36 with `ANDROID_HOME` | `:app:lintDebug` and `:app:assembleRelease` passed (2026-11-24); signed APK verified separately |
| Android physical device / `adb` | `adb` present at the SDK path; no devices attached | **Blocked** |
| iOS build / simulator | No — no macOS/Xcode | **Blocked** |
| iOS physical device / TestFlight | No — no Xcode, signing, or App Store Connect access | **Blocked** |
| Android FCM delivery | No device; `google-services.json` is present | **Blocked** pending device/backend test |
| iOS APNs / push | No implementation and no Xcode | **Not implemented / blocked** |

Commands below assume:

```bash
cd /opt/repo/onoffmypc/mobile
export ANDROID_HOME=/path/to/Android/Sdk   # if not already set
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

If `apkanalyzer` is not on `PATH`, use
`$ANDROID_HOME/cmdline-tools/latest/bin/apkanalyzer`.

Use a dedicated test account and test devices. Never paste session cookies,
device tokens, passwords, FCM/APNs tokens, or raw notification dumps into a
ticket or chat. When a command can print secret values, the instructions say to
inspect only metadata or to redact the output.

## Record results

Copy this table for each run. “Blocked” is a valid result; do not mark an item
pass from source inspection alone.

| ID | Date | Build (`versionName`/code or iOS build) | Device / OS | Result (pass/fail/blocked) | Evidence (redacted) |
|---|---|---|---|---|---|
| | | | | | |

## Android checklist

### A. Build and install

- [ ] **AND-00 Build the artifacts.** Use a CI or workstation with Android SDK
  36, build-tools 36.0.0, and JDK 17.
  ```bash
  (cd android && ./gradlew :app:assembleDebug :app:assembleRelease :app:bundleRelease --no-daemon)
  ```
  Expected: debug APK, release APK, and release AAB build. Release signing is
  optional for local privacy testing; use the debug build for `run-as`
  inspection.
- [ ] **AND-01 Record versions.**
  ```bash
  adb devices -l
  adb shell getprop ro.build.version.sdk
  adb shell dumpsys package com.onoffmypc.android | grep -E 'versionName|versionCode'
  ```
  Expected: app `0.4.10`/27 (or the build under test) and the intended API level.
- [ ] **AND-02 Install and sign in with a test account.**
  ```bash
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```
  Confirm the device list appears and a test device can be added.

### B. Backup, restore, and device transfer exclusion

- [ ] **AND-B01 Verify the packaged manifest, not only source.**
  ```bash
  apkanalyzer manifest print android/app/build/outputs/apk/release/app-release.apk \
    | grep -E 'allowBackup|fullBackupContent|dataExtractionRules|usesCleartextTraffic'
  ```
  Expected: `allowBackup="false"`, `fullBackupContent="@xml/backup_rules"`,
  `dataExtractionRules="@xml/data_extraction_rules"`,
  `usesCleartextTraffic="false"`.
- [ ] **AND-B02 Verify both rule files in the APK.**
  ```bash
  apkanalyzer resources xml --file res/xml/backup_rules.xml \
    android/app/build/outputs/apk/release/app-release.apk
  apkanalyzer resources xml --file res/xml/data_extraction_rules.xml \
    android/app/build/outputs/apk/release/app-release.apk
  ```
  Expected: `root`, `database`, `sharedpref`, `file`, and `external` excluded
  under cloud backup and (in `data_extraction_rules.xml`) device transfer.
- [ ] **AND-B03 Confirm the app is not eligible for key/value backup.**
  ```bash
  adb shell bmgr backupnow com.onoffmypc.android
  adb shell dumpsys backup | grep -A4 -B2 com.onoffmypc.android
  ```
  Expected: the package is skipped/not eligible, or no dataset is created.
  Command behavior varies by OEM/API; record the exact device result. Never
  attempt to read a backup file that unexpectedly contains app data; treat that
  as a failure and preserve it for investigation.
- [ ] **AND-B04 Legacy `adb backup` check (optional; deprecated and removed on
  some Android versions).**
  ```bash
  adb backup -f /tmp/opencode/onoffmypc.ab com.onoffmypc.android
  ls -l /tmp/opencode/onoffmypc.ab
  ```
  Expected: the system refuses the backup or produces no app data. Delete the
  file without inspecting secrets.
- [ ] **AND-B05 Cloud backup/restore.** With the test account signed in, trigger
  a device backup, then restore to a second device (or erase/reinstall). Open
  the app. Expected: login screen, no restored device/account data, and no
  session cookie. This must be run on API 26–30 (legacy rules) and API 31+
  (data-extraction rules).
- [ ] **AND-B06 Device-to-device transfer.** Use the Android setup wizard’s
  “Copy apps & data” flow (cable or compatible wireless transfer) from a source
  device with an active session. Expected on the destination: app may install,
  but no session, account, device list, or device credentials are transferred.
  If the destination opens directly into the account, record a failure.
- [ ] **AND-B07 Session absence after restore/transfer.**
  ```bash
  adb shell run-as com.onoffmypc.android sh -c \
    'ls -l shared_prefs 2>/dev/null; test -f shared_prefs/onoffmypc.session.xml && echo SESSION_FILE_PRESENT || echo NO_SESSION_FILE'
  ```
  Expected: `NO_SESSION_FILE` after restore/transfer (debug build only). Do not
  print file contents.

### C. Screenshot and `FLAG_SECURE`

- [ ] **AND-C01 Capture while the credential dialog is open.** Add a test
  device, open the one-time device ID/token or pairing-code dialog, then:
  ```bash
  adb exec-out screencap -p > /tmp/opencode/secure-dialog.png
  ```
  Expected: a black/blank image (or a platform screenshot error). A readable
  token is a failure.
- [ ] **AND-C02 Screen recording.**
  ```bash
  adb shell screenrecord --time-limit 5 /sdcard/secure-dialog.mp4
  adb pull /sdcard/secure-dialog.mp4 /tmp/opencode/secure-dialog.mp4
  adb shell rm /sdcard/secure-dialog.mp4
  ```
  Expected: credential content is blank/black in the recording.
- [ ] **AND-C03 Recents thumbnail.** With the credential dialog open, press the
  recents/app-switcher button and capture or inspect the thumbnail. Expected:
  credential content is obscured. Dismiss the dialog and confirm normal screens
  can be captured again (the flag must be cleared).
- [ ] **AND-C04 Non-credential screens still work.** Screenshot the device list,
  device detail, account, and billing screens. Expected: normal screenshots.
  This confirms `FLAG_SECURE` is scoped to the sensitive dialog, not globally
  breaking screenshots.
- [ ] **AND-C05 Repeat on API 26–30 and API 33+.** The secure-dialog behavior
  should be consistent; clipboard preview behavior differs by API (see below).

### D. Clipboard sensitivity

- [ ] **AND-D01 Copy a device token and a pairing code from the credential
  dialog.** Paste into a throwaway note. Expected: paste works.
- [ ] **AND-D02 Android 13+ preview suppression.** On API 33+, copy the
  credential and inspect the system clipboard preview/overlay (or use
  `adb shell dumpsys clipboard` only to check for `EXTRA_IS_SENSITIVE`; do not
  paste the value). Expected: preview is suppressed and the clip is marked
  sensitive.
- [ ] **AND-D03 Android 12 and lower.** Copy a credential and observe the
  system preview/toast. Expected: the app cannot set the Android 13 sensitive
  flag; record what the OS displays. Do not treat this as parity with API 33+.
- [ ] **AND-D04 Clipboard lifetime.** Wait at least 60 seconds, then paste into
  another app. Expected current behavior: the value is still present (there is
  no auto-clear). Clear the clipboard with a benign copy before finishing.
- [ ] **AND-D05 Log check.** Perform copy/paste and inspect logcat for token or
  pairing-code values. Do not paste raw logcat into a report.
  ```bash
  adb logcat -c
  # exercise copy/paste
  adb logcat -d | grep -iE 'token|pairing|clipboard' | head -40
  ```
  Expected: no credential values.

### E. Notifications and deep links

- [ ] **AND-E01 Android 13+ permission.** Fresh install, sign in, and observe
  the `POST_NOTIFICATIONS` prompt. Deny it and confirm no notification is shown;
  grant it and confirm delivery. Check the `device_status` channel exists.
- [ ] **AND-E02 Notification content and lock screen.** Trigger an offline,
  online, delivered, and failed/expired event through the backend or Firebase
  test message. Inspect the notification on the lock screen and in the shade.
  Expected current behavior: title/body are visible according to the user’s
  lock-screen settings. Record whether device names or command status are
  exposed; this is privacy risk MP-10, not a hidden guarantee.
- [ ] **AND-E03 Notification tap.** Tap each notification. Expected: opens
  `MainActivity` (device list) without crashing; no credential or command
  payload is placed in the intent.
  ```bash
  adb shell dumpsys activity activities | grep -i onoffmypc
  ```
- [ ] **AND-E04 OAuth deep link with a synthetic value.** Do **not** use a real
  ID token. With the app logged out and logged in:
  ```bash
  adb shell am start -a android.intent.action.VIEW \
    -d 'com.onoffmypc.android://oauth#id_token=synthetic-invalid-token'
  adb shell am start -a android.intent.action.VIEW \
    -d 'com.onoffmypc.android://oauth?unexpected=value'
  adb shell am start -n com.onoffmypc.android/.ui.auth.OAuthRedirectActivity
  ```
  Expected: app handles/cancels cleanly, does not crash, and does not establish
  a session. The backend must reject the synthetic token. `OAuthRedirectActivity`
  is exported by design; any app can invoke it.
- [ ] **AND-E05 Unexpected external intents.** Use `adb shell am start` to open
  `MainActivity` with unrelated extras/data. Expected: no crash and no hidden
  debug route.
- [ ] **AND-E06 Exported-component audit.**
  ```bash
  apkanalyzer manifest print android/app/build/outputs/apk/release/app-release.apk \
    | grep -B3 -A3 'android:exported'
  ```
  Expected: only `.MainActivity` and `.ui.auth.OAuthRedirectActivity` exported;
  `.push.OnOffMessagingService` is `android:exported="false"`.

### F. TLS, cleartext, and trust anchors

- [ ] **AND-F01 Static packaged config.**
  ```bash
  apkanalyzer manifest print android/app/build/outputs/apk/release/app-release.apk \
    | grep -E 'networkSecurityConfig|usesCleartextTraffic'
  apkanalyzer resources xml --file res/xml/network_security_config.xml \
    android/app/build/outputs/apk/release/app-release.apk
  ```
  Expected: cleartext denied; `<certificates src="system" />`; no user/custom
  trust anchor or pin entry.
- [ ] **AND-F02 User-CA interception.** Put the device behind mitmproxy/Charles
  and install its CA as a **user** certificate (Settings → Security → Encryption
  & credentials → Install a certificate → CA certificate). Sign in and refresh.
  Expected: TLS validation fails; the app does not trust the user CA. Remove the
  proxy and CA afterward. If the app succeeds, treat it as a trust-anchor
  regression.
- [ ] **AND-F03 Cleartext rejection.** The API base is hard-coded HTTPS
  (`data/Constants.kt:6`). Confirm no screen can be configured to use HTTP and
  no request succeeds after a cleartext downgrade attempt. Do not “fix” this by
  enabling cleartext in the manifest.
- [ ] **AND-F04 Server TLS floor (host check, not app behavior).**
  ```bash
  openssl s_client -connect api.onoffmypc.com:443 -tls1_1 </dev/null
  openssl s_client -connect api.onoffmypc.com:443 -tls1_2 </dev/null
  ```
  Expected: TLS 1.1 fails; TLS 1.2 succeeds. This does not replace testing the
  app’s own TLS stack.
- [ ] **AND-F05 No pinning assumption.** There is no certificate pinning. A
  successful user-CA interception is a failure of the system-only trust config,
  but a successful interception with a **system-trusted** enterprise root is
  expected without pinning. Do not add brittle pinning without a rotation and
  recovery design.

### G. Session, cookie, and local storage

- [ ] **AND-G01 Persistence across process death.** Sign in, force-stop, and
  relaunch. Expected: still signed in (server session still valid).
  ```bash
  adb shell am force-stop com.onoffmypc.android
  adb shell monkey -p com.onoffmypc.android 1
  ```
- [ ] **AND-G02 Session file is not plaintext.** Use a debug build:
  ```bash
  adb shell run-as com.onoffmypc.android sh -c \
    'ls -l shared_prefs; wc -c shared_prefs/onoffmypc.session.xml 2>/dev/null'
  ```
  Expected: the preferences file exists and its value is not a readable
  `session=...` cookie. Do not print the file. A plaintext cookie is a failure.
- [ ] **AND-G03 Logout clears the session and push token.** Tap logout, then
  inspect:
  ```bash
  adb shell run-as com.onoffmypc.android sh -c \
    'test -f shared_prefs/onoffmypc.session.xml && echo SESSION_FILE_PRESENT || echo NO_SESSION_FILE'
  ```
  Expected: no session key/file; relaunch shows login. Confirm the backend
  received `POST /push/unregister` for the test install if FCM is enabled.
- [ ] **AND-G04 401 and revocation.** From another session/device, revoke the
  current session in Account → Sessions. Perform an API action. Expected: app
  clears the session and returns to login without leaking the old cookie.
- [ ] **AND-G05 Cookie origin tests.** On a host with the Android SDK:
  ```bash
  (cd android && ./gradlew :app:testDebugUnitTest --tests '*SessionCookieJarTest' --no-daemon)
  ```
  Expected: all tests pass, including cross-host, cross-port, HTTP downgrade,
  insecure-response, expiry, and empty-store cases. These tests existed before
  this checklist and were not run on this Linux host.
- [ ] **AND-G06 Redirect behavior.** Use a test proxy/endpoint that returns a
  302 to another origin. Expected: the app does not follow the redirect with the
  session cookie (`followRedirects(false)` and `followSslRedirects(false)`).
  Source review already covers this; runtime confirmation is preferred.
- [ ] **AND-G07 No idle/app lock.** Background the app for an extended period,
  then reopen. Expected current behavior: the session remains usable until
  server expiry/401/logout. Record this as an accepted security-UX decision or
  a gap; there is no biometric gate.

### H. Permissions, logging, and dependency spot checks

- [ ] **AND-H01 Packaged permissions.**
  ```bash
  apkanalyzer manifest permissions android/app/build/outputs/apk/release/app-release.apk
  ```
  Expected: `INTERNET`, `POST_NOTIFICATIONS`, plus FCM/Google Play services
  transitive permissions (`ACCESS_NETWORK_STATE`, `WAKE_LOCK`,
  `com.google.android.c2dm.permission.RECEIVE`, generated dynamic-receiver
  permission). No location/camera/microphone/contacts/phone-state/ads-ID.
- [ ] **AND-H02 Release logging.** Install the release build and exercise login,
  device actions, and account screens while capturing logcat. Expected: no
  OkHttp `BODY`/`HEADERS` lines, no session cookie, no password. Debug `BASIC`
  logging may show request URLs; do not share it.
- [ ] **AND-H03 Dependency inventory matches.** Regenerate
  `app/build/outputs/sdk-dependencies/release/sdkDependencies.txt` on an SDK
  host and compare against
  [`DEPENDENCY_PRIVACY_INVENTORY.md`](DEPENDENCY_PRIVACY_INVENTORY.md). Expected:
  no analytics/crash/ads/attribution SDK appears without an inventory update.

## iOS checklist

### I. Build and install

- [ ] **IOS-00 Generate and build on macOS.** Xcode 16+ is expected by CI;
  deployment target is iOS 16.0.
  ```bash
  (cd ios && xcodegen generate && xcodebuild -resolvePackageDependencies \
    -project OnOffMyPC.xcodeproj -scheme OnOffMyPC)
  open ios/OnOffMyPC.xcodeproj
  ```
  Select a development team and a physical device, then run. A simulator build
  is useful for UI checks but does not validate Keychain backup/transfer or APNs.
- [ ] **IOS-01 Resolve package provenance.** Generate and inspect
  `Package.resolved` (or the resolved package graph in Xcode). There is no
  committed lockfile today. Record the resolved GoogleSignIn and transitive
  versions, then decide whether to commit the resolution.
- [ ] **IOS-02 Record build details.** App 0.3.2/build 9 (or the build under
  test), iOS version, device model, and whether the build is Debug, Ad Hoc, or
  TestFlight.

### J. App Transport Security and TLS

- [ ] **IOS-J01 Generated Info.plist has no ATS exceptions.** After a build:
  ```bash
  APP=$(find ~/Library/Developer/Xcode/DerivedData \
    -path '*Build/Products/Debug-iphoneos/OnOffMyPC.app' -type d | head -1)
  plutil -p "$APP/Info.plist" | grep -A8 NSAppTransportSecurity \
    || echo 'NO_ATS_EXCEPTION_DICTIONARY'
  ```
  Expected: no exception dictionary. The source spec (`ios/project.yml`) must
  also remain free of `NSAllowsArbitraryLoads*` and `NSExceptionDomains`.
- [ ] **IOS-J02 ATS diagnostics (macOS).**
  ```bash
  nscurl --ats-diagnostics https://api.onoffmypc.com
  ```
  Expected: the HTTPS endpoint passes ATS checks. This tests ATS, not the app’s
  own URLSession configuration.
- [ ] **IOS-J03 Interception/proxy behavior.** Install a proxy CA as a trusted
  root only on the test device and route the app through Charles/Proxyman.
  Expected: there is no certificate pinning, so a fully trusted interception
  can see traffic; record this as expected. Remove the trust profile afterward.
  Do not add pinning based on this checklist alone.
- [ ] **IOS-J04 No cleartext API path.** Confirm the only API base is
  `https://api.onoffmypc.com` (`Networking/APIClient.swift:31`) and no screen or
  debug setting can switch it to HTTP. A temporary HTTP test build would be a
  source change and is out of scope for this validation.
- [ ] **IOS-J05 Server TLS floor (host check).** Same `openssl s_client`
  TLS 1.1/1.2 checks as AND-F04; note that ATS imposes its own minimum.

### K. Keychain session and backup/restore

- [ ] **IOS-K01 Persistence.** Sign in, force quit, reboot, and reopen. Expected:
  still signed in while the server session is valid.
- [ ] **IOS-K02 Keychain attributes are device-bound.** Source check:
  `Networking/Session.swift:33-43` has
  `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` and
  `kSecAttrSynchronizable as String: false`. Runtime behavior should match.
- [ ] **IOS-K03 No iCloud Keychain sync.** With iCloud Keychain enabled, sign in
  on device A and observe device B (same Apple ID). Expected: device B remains
  logged out; the session item is not synchronized.
- [ ] **IOS-K04 iCloud backup/restore.** Sign in, make an iCloud backup, erase
  the device (or restore to a second device), restore the backup, and open the
  app. Expected: login screen; the device-bound Keychain item is not restored.
  If the app is still signed in, treat it as a failure and preserve the build
  and OS details.
- [ ] **IOS-K05 Device-to-device transfer.** Use Quick Start/device transfer.
  Expected: app installs but does not carry the session. Verify the account
  screen is not reachable without signing in.
- [ ] **IOS-K06 Uninstall/reinstall behavior (known gap).** Sign in, delete the
  app, reinstall, and open. Keychain items normally survive app deletion, so the
  app may still be signed in. Record the observed result; this is privacy risk
  MP-02, not a pass until a retention decision is made. If the desired product
  behavior is “reinstall means signed out,” clear the Keychain item on first
  launch or document the exception.
- [ ] **IOS-K07 Logout and 401.** Logout must delete the Keychain item and return
  to login. Revoke the session from another device; the next request must clear
  the local session. Reopen after each to confirm.
- [ ] **IOS-K08 No plaintext session in the container.** Download the app
  container from Xcode (Devices and Simulators → Download Container) and inspect
  `Library/Preferences` names/metadata only. Do not print values. Expected: no
  `session-cookie` value in plist/files; the session is in Keychain. A simulator
  container can be inspected similarly, but simulator Keychain behavior is not
  representative of device backup/transfer.
- [ ] **IOS-K09 `UserDefaults` push placeholder.** In the current build no APNs
  writer exists. Confirm `fcm-push-token` is absent after login. When push is
  implemented, verify it is not left in a backed-up plaintext preference.
- [ ] **IOS-K10 Session-cookie origin, empty-cookie, and redirect controls
  (MP-13).** Source now requires HTTPS, exact API host/port, `Secure`, a valid
  cookie domain, and a non-empty value; invalid values clear the stored session.
  `NoRedirectDelegate` blocks redirects. Expected: a test URLSession request to
  a cross-origin redirect is not followed, a `Set-Cookie` from a different host
  is rejected, and an empty Keychain value returns the login screen. Exercise
  this on macOS/device; do not mark it passed from static inspection alone.

### L. Clipboard

- [ ] **IOS-L01 Credential copy is local-only.** Open the one-time device
  credential screen, copy the device ID/token, and paste into a local note.
  Expected: paste works on the same device. Check that Universal Clipboard does
  not make it available on a nearby Mac/iPad signed into the same Apple ID; the
  `options: [.localOnly: true]` call is the source control.
- [ ] **IOS-L02 No auto-clear.** Wait at least 60 seconds and paste again.
  Expected current behavior: the value remains until replaced. Clear the
  clipboard with benign text afterward.
- [ ] **IOS-L03 Password field.** Verify the hidden state uses `SecureField` and
  the eye toggle shows plaintext only on explicit user action. Screenshot the
  visible state to confirm the product understands the exposure; do not treat a
  visible password screenshot as a secure-control pass.
- [ ] **IOS-L04 Clipboard privacy prompt.** iOS may ask for paste permission
  when pasting into another app; record the prompt and do not bypass it.

### M. Screenshot and screen recording

- [ ] **IOS-M01 Credential screenshot (known gap).** Open the one-time device
  credential screen and take a screenshot and a screen recording. Expected
  current behavior: both succeed and show the credential. This is a **failure
  of the desired privacy control** and is tracked as MP-01; record it as such,
  not as a pass.
- [ ] **IOS-M02 App-switcher snapshot (known gap).** Background the app while
  the credential screen is visible, then inspect the app switcher. Expected:
  the credential may be visible. Record the result.
- [ ] **IOS-M03 Non-credential screens.** Screenshot device list/detail/account
  screens; no capture guard is expected, and none is required by the current
  design.
- [ ] **IOS-M04 Decide and implement a control.** Before claiming this area
  validated, add a deliberate iOS control (for example a privacy overlay on
  scenePhase changes and/or capture detection) and repeat M01–M02. Do not add a
  fake “secure” claim to the UI before the control exists.

### N. Notifications and push (currently absent)

- [ ] **IOS-N01 Confirm the current state.** There is no `aps-environment`
  entitlement, no `UNUserNotificationCenter`/`registerForRemoteNotifications`
  call, and no writer for `Session.pushToken`. The logout path attempts
  `POST /push/unregister` only if a token exists. Expected current result: no
  APNs token is requested or registered. Mark push as not implemented, not
  passed.
- [ ] **IOS-N02 After APNs is implemented:** request permission at a sensible
  point, register with APNs, send the token as `{ token, platform: "ios" }`,
  verify foreground/background delivery, tap behavior, token rotation, logout
  unregister, and notification content/lock-screen privacy.
- [ ] **IOS-N03 TestFlight release.** Blocked on this host/no Apple credentials.
  The eventual procedure is: configure the App ID/APNs key and provisioning,
  archive in Xcode (`Product → Archive`), upload to App Store Connect, install
  through TestFlight on a physical device, and repeat the Keychain, clipboard,
  screenshot, backup/restore, and push checks against the release build. There
  is no committed iOS release/push pipeline today.

### O. Deep links and release privacy checks

- [ ] **IOS-O01 Microsoft callback scheme.** With Microsoft sign-in unconfigured
  (current repository state), invoke:
  ```bash
  xcrun simctl openurl booted 'msauth.com.onoffmypc.app://auth'
  ```
  Expected: no crash; an unconfigured/error path or no-op. Do not use a real
  token. Repeat on a device if the scheme is registered there.
- [ ] **IOS-O02 Google callback.** Start the Google sign-in flow and complete or
  cancel it. Expected: `GoogleSignIn.handle(url)` receives the callback; cancel
  returns an error without changing the session. Do not hand-craft a real token.
- [ ] **IOS-O03 Unsolicited URL.** Open the app’s custom schemes with malformed
  or unexpected values. Expected: no crash, no auth bypass, no session change.
- [ ] **IOS-O04 Release logging.** Build Release, attach Console.app, and
  exercise login/device/account actions. Expected: no email, password, session
  cookie, device token, or API body in app logs.
- [ ] **IOS-O05 Privacy manifest and labels.** Before App Store submission,
  confirm `PrivacyInfo.xcprivacy` exists if required for the APIs in use, and
  reconcile App Store privacy answers with
  [`DEPENDENCY_PRIVACY_INVENTORY.md`](DEPENDENCY_PRIVACY_INVENTORY.md). Current
  repository state: manifest absent, no TestFlight pipeline, and Play Data
  Safety copy is narrower than the actual data inventory (MP-06/MP-07).

## Automated checks and commands

Run from the `mobile/` directory unless noted:

```bash
# Static manifest/TLS/storage/privacy gate used by CI. It also self-tests the
# Adjust denylist fixture and checks the merged release manifest plus resolved
# SDK list when those local build artifacts are present.
node scripts/check-mobile-hardening.mjs

# Helper tests: Adjust fixture detection, token-boundary matching, and XML
# quote/whitespace/attribute-order/uses-permission-sdk-23 variants.
node scripts/test-mobile-hardening.mjs

# Syntax checks for the changed scripts
node --check scripts/check-mobile-hardening.mjs
node --check scripts/test-mobile-hardening.mjs
node --check scripts/lib/mobile-hardening-sdk-denylist.mjs
node --check scripts/lib/mobile-hardening-xml.mjs

# Android unit tests (requires Android SDK; not run on this host)
(cd android && ./gradlew :app:testDebugUnitTest :shared:model:test --no-daemon)

# Android lint (requires Android SDK; not run on this host)
(cd android && ./gradlew :app:lintDebug --no-daemon)

# iOS build (requires macOS/Xcode; not run on this host)
(cd ios && xcodegen generate && xcodebuild build \
  -project OnOffMyPC.xcodeproj -scheme OnOffMyPC \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO)
```

The static gate parses manifest/resource XML and scans every Gradle
build/settings/properties file plus the optional local release artifacts. It is
still not a packaged-APK check; use AND-B01/AND-B02 after building. It does not
prove physical backup exclusion, screenshot blocking, clipboard visibility, FCM
delivery, Keychain backup behavior, or App Store compliance.

## Remaining blockers

| Blocker | Why it remains | What unblocks it |
|---|---|---|
| Android physical backup/restore/transfer, screenshot, clipboard, notifications, TLS proxy | `adb` is available but no device is attached | A physical API 26–30 and API 33+ device, test account, and the checklist above |
| Android signed-release smoke test | Lint/unit/release build passed; no device is attached | Install the minified release APK on a physical device and exercise login, push, commands, and credential dialogs |
| iOS ATS/Keychain/clipboard/screenshot/backup checks | No macOS/Xcode/device | macOS with Xcode 16+, XcodeGen, test device |
| iOS session-cookie origin/HTTPS binding | Source controls added; no macOS/Xcode/device execution yet (MP-13) | Run the IOS-K10 redirect/cross-origin/empty-cookie checks on macOS/device; keep OMP-19 open until verified |
| iOS release/push pipeline | No APNs implementation, no signing/App Store Connect access | APNs entitlement/token registration, signing, TestFlight workflow |
| Staged API environment | Both clients hard-code `https://api.onoffmypc.com`; no build flavor/scheme | A reviewed base-URL configuration per build type, with staging credentials isolated |
| Dependency/privacy inventory runtime truth | Inventory is source/build-artifact based; iOS package versions are not locked | Regenerate `sdkDependencies.txt` and commit/review `Package.resolved` |
