# OnOffMyPC — iOS

SwiftUI client for the shared OnOffMyPC account/device API. Current scope
includes sign in/registration/recovery, devices and power controls, device
details/history, account/security, billing, and Google sign-in. Bundle id
`com.onoffmypc.app`. Deployment target iOS 16.

The Xcode project is **generated** from [`project.yml`](project.yml) with
[XcodeGen](https://github.com/yonyz/XcodeGen) — `OnOffMyPC.xcodeproj` is **not**
committed (it's in `.gitignore`), so `project.yml` is the source of truth for
targets/settings. Add/remove files by dropping them under `OnOffMyPC/` and
re-running `xcodegen generate`.

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
    ├── Components/AppLogo.swift
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
- The iOS client currently has simulator build CI but no App Store/TestFlight
  signing or release workflow in this repository.
- Feature parity with Android/web is tracked in the private platform assessment;
  a backend endpoint does not imply an iOS UI exists.
- [../docs/SECURITY_ASSESSMENT.md](../docs/SECURITY_ASSESSMENT.md) links to the
  private cross-repository security and UX documentation.
