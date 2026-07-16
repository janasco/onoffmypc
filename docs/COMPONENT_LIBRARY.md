# Component library inventory

**Audited:** 2026-07-16  
Android shared UI lives under `android/app/src/main/kotlin/com/onoffmypc/android/ui/components/` plus a few screen-local dialogs. iOS mirrors live under `ios/OnOffMyPC/Components/`.

---

## 1. Android — reusable components (`ui/components/`)

| Component | File | Purpose | Notes |
|---|---|---|---|
| `AppLogo` | `AppLogo.kt` | Brand mark | Sized via `Dp`; used on auth + devices top bar |
| `PasswordField` | `PasswordField.kt` | Password `OutlinedTextField` + visibility toggle | Auth + account |
| `PowerControls` | `PowerControls.kt` | 2×2 power grid + confirm dialogs + in-flight spinner | List + detail |
| `CmdButton` | `PowerControls.kt` | Colored power button with a11y label | Row-scoped |
| `DeviceStatusSummary` | `DeviceStatusPresentation.kt` | Connection + last contact + PC state | List + detail |
| `deviceStatusPresentation` / `connectionFromLastContact` | same | Pure presentation helpers | Good KMP candidates |
| `commandRequestFeedback` / `commandStatusLabel` / `commandStatusColor` | `CommandPresentation.kt` | Honest command lifecycle copy/colors | Pure; KMP candidates |
| `LogoutConfirmDialog` | `LogoutConfirmDialog.kt` | Confirm logout | Devices + account |

### Screen-local (not in `components/`, but reusable candidates)

| Component | File | Purpose |
|---|---|---|
| `AddDeviceDialog` | `ui/devices/DeviceDialogs.kt` | Name + create |
| `RenameDeviceDialog` | same | Rename |
| `DeleteDeviceDialog` | same | Destructive confirm |
| `TokenRevealDialog` | same | One-time token + copy |
| Temperature `Canvas` chart | `DeviceDetailScreen.kt` (private) | 7-day temp history |
| Trial / unlock banners | `DevicesScreen.kt`, billing cards | Inline, not extracted |
| Menu overflow | `DevicesScreen.kt` | Emoji hamburger + `DropdownMenu` |

---

## 2. iOS — Components/

| Component | File | Android counterpart |
|---|---|---|
| `AppLogo` | `AppLogo.swift` | `AppLogo` |
| `PasswordField` | `PasswordField.swift` | `PasswordField` |
| `PowerCommandControls` | `PowerCommandControls.swift` | `PowerControls` |
| `DeviceStatusSummary` | `DeviceStatusSummary.swift` | `DeviceStatusSummary` |
| `TokenReveal` | `TokenReveal.swift` | `TokenRevealDialog` |

Command/status helpers also live in `Networking/Models.swift` (Swift functions), paralleling `CommandPresentation.kt`.

---

## 3. Screen inventory (hosts, not library)

| Screen | Android | iOS |
|---|---|---|
| Login | `ui/auth/LoginScreen.kt` | `Features/Auth/LoginView.swift` |
| Register | `RegisterScreen.kt` | `RegisterView.swift` |
| Forgot password | `ForgotPasswordScreen.kt` | `ForgotPasswordView.swift` |
| Devices | `DevicesScreen.kt` | `DevicesView.swift` |
| Device detail | `DeviceDetailScreen.kt` | `DeviceDetailView.swift` |
| Add device | dialog | `AddDeviceView.swift` |
| Account | `AccountScreen.kt` | `AccountView.swift` |
| Billing | `BillingScreen.kt` | `BillingView.swift` |
| OAuth redirect | `OAuthRedirectActivity.kt` | system / managers |

---

## 4. Gaps vs a production component library

| Gap | Severity | Suggested home |
|---|---|---|
| Top app bar / overflow menu | Medium | `OnOffTopBar` |
| Empty state | Medium | Shared; Devices empty is inline |
| Error + retry | Medium | Detail/Devices already pattern inline |
| Skeleton / shimmer loading | Low | Optional |
| Status / trial banner | Medium | Extract from Devices |
| Command status chip | Low | Wrap `commandStatusLabel` |
| Primary / secondary / destructive buttons | Low | Thin wrappers over M3 |
| Snackbar message catalog | Low | Centralize strings |
| Chart component | Medium | Extract `TempHistoryChart` from detail |
| Settings row / form section | Medium | Account screen duplication |
| Biometric gate / PIN sheet | High product gap | Not started |
| Notification preference UI | Medium | Not started |
| Firmware badge / update CTA | Medium | Display-only today |
| Queue manager list | Product gap | Not started |

---

## 5. Extraction priority (shippable, non-breaking)

1. **S** — Extract `EmptyState` + `ErrorRetry` used by Devices/Detail (copy-paste → shared).  
2. **S** — Extract `TempHistoryChart` from `DeviceDetailScreen.kt`.  
3. **M** — Replace emoji menu with `OnOffTopBar` + Material Icons.  
4. **M** — Extract trial/billing banner composable shared by Devices + Billing.  
5. **S** — Mirror any new Android pure helpers on iOS (or later `commonMain`).

Do not block releases on a full design-system library. Prefer extracting when a third call site appears.
