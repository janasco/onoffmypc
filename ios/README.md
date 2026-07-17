# OnOffMyPC — iOS

SwiftUI client for the shared OnOffMyPC account/device API. Current scope
includes sign in/registration/recovery, devices and power controls, device
details/history, account/security, a separate 30-day trial and $15 one-time
unlock for each device through API-created Polar hosted checkout, and Google /
Apple / Microsoft social sign-in (buttons hidden until client IDs are set).
There is no subscription, and existing Lifetime accounts remain covered. Bundle
id `com.onoffmypc.app`. Deployment target iOS 16.

### Social login placeholders

- **Apple**: set `AppleSignInManager.audienceClientID` to `com.onoffmypc.app`
  (or your Services ID) after enabling Sign in with Apple on the App ID; list
  the same value in API `APPLE_CLIENT_IDS`. Entitlement is in
  `OnOffMyPC.entitlements`.
- **Microsoft**: set `MicrosoftSignInManager.clientID` to your Entra app ID;
  register redirect URI `msauth.com.onoffmypc.app://auth` on the Entra app and
  list the client ID in API `MICROSOFT_CLIENT_IDS`.

The Xcode project is **generated** from [`project.yml`](project.yml) with
[XcodeGen](https://github.com/yonyz/XcodeGen) — `OnOffMyPC.xcodeproj` is **not**
committed (it's in `.gitignore`), so `project.yml` is the source of truth for
targets/settings. Add/remove files by dropping them under `OnOffMyPC/` and
re-running `xcodegen generate`.

### Shared design source

`OnOffMyPC/Design/Generated/OnOffTokens.swift` and `OnOffStates.swift` are
vendored, generated outputs from `@onoffmypc/design`; do not edit them by hand.
`Components/AppDesignSystem.swift` is the native SwiftUI adapter that adds
dynamic light/dark and Increase Contrast behavior while keeping navigation,
forms, sheets, alerts, and accessibility semantics native to iOS.

## Build & run (needs a Mac + Xcode 16 or newer)
> XcodeGen generates the current project format, which requires **Xcode 16+** to open.
```bash
brew install xcodegen          # one-time
cd ios
xcodegen generate              # creates OnOffMyPC.xcodeproj
open OnOffMyPC.xcodeproj
```
Then in Xcode pick a Simulator and press ⌘R. To run on **your own device** with a
free Apple ID: select the `OnOffMyPC` target → Signing & Capabilities → set your
Team (personal), then run. (Free accounts can side-load to your device but can't
use TestFlight/App Store — that needs the $99/yr Apple Developer Program.)

## CI
[`.github/workflows/ios-ci.yml`](../.github/workflows/ios-ci.yml) builds the app
for the iOS Simulator (unsigned) on a macOS runner on every push touching `ios/`,
so compile breakages surface without a Mac.

## Layout
```
ios/
├── project.yml                 XcodeGen spec (source of truth)
└── OnOffMyPC/
    ├── OnOffMyPCApp.swift       @main + AppState + RootView (login vs devices)
    ├── Components/             Shared logo, power controls, and device-status UI
    ├── Design/Generated/       Vendored @onoffmypc/design Swift outputs
    ├── Networking/
    │   ├── APIClient.swift      URLSession; cookie-session auth
    │   ├── Session.swift        Keychain-backed session cookie
    │   └── Models.swift         Codable models (mirror the API)
    ├── Features/Auth/           LoginView + AuthViewModel
    ├── Features/Devices/        DevicesView + DevicesViewModel
    └── Assets.xcassets/         AppIcon, AccentColor, Logo
```

## Notes
- Auth is **cookie-based** (matches the API/web/Android): `POST /auth/login` sets a
  `session` cookie, captured and stored in the Keychain, sent on later requests.
- The app talks to `https://api.onoffmypc.com` (see `APIClient.swift`).
- Device screens distinguish live connection state from last-reported PC telemetry,
  show last-contact freshness, and use an explicit unknown state when presence cannot
  be established.
- The iOS client currently has simulator build CI but no App Store/TestFlight
  signing or release workflow in this repository.
- Feature parity with Android/web is tracked in the private platform assessment;
  a backend endpoint does not imply an iOS UI exists.
- [../docs/SECURITY_ASSESSMENT.md](../docs/SECURITY_ASSESSMENT.md) links to the
  private cross-repository security and UX documentation.
