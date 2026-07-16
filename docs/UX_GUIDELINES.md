# UX guidelines — OnOffMyPC mobile

**Audited:** 2026-07-16  
These guidelines capture **what the apps already do well** and **rules to keep** as we evolve. They are not a greenfield UX rewrite.

Related: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), [`COMPONENT_LIBRARY.md`](COMPONENT_LIBRARY.md), [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 1. Product promise

The app’s job is to let a signed-in owner **reliably request power actions** on their PC via OnOffMyPC hardware, see **honest connection and command state**, and manage **account + per-device access**. It is not a remote desktop, not a monitoring dashboard first, and not a marketing site.

---

## 2. Trust & honesty (non-negotiable)

These behaviors already exist and must not regress:

1. **Separate three concepts**
   - Device **connection** (online / offline / unknown)
   - **Last contact** freshness
   - **Last-reported PC state** (on / off / not reported)  
   Implementation: `DeviceStatusPresentation.kt` / iOS `DeviceStatusSummary`.

2. **Command lifecycle is not PC proof**  
   Labels must distinguish queued → awaiting acknowledgement → device acknowledged → expired. Acknowledgement **must not** claim the PC finished shutting down.  
   Implementation: `CommandPresentation.kt` / iOS model helpers.

3. **Disruptive actions confirm with the device name**  
   Power Off, Force Off, Reset require a confirmation that names the target and consequence (`PowerControls.kt`).

4. **In-flight locking**  
   Power controls disable while a request is submitting; show “Submitting command request…”.

5. **Billing honesty**  
   Prefer provider-agnostic copy (“Pay now”, “Manage receipts”). Respect `billing_enabled` (free full access when off). Do not ship Polar secrets in the client.

---

## 3. Information architecture

| Priority | Surface | Content |
|---|---|---|
| P0 | Devices list | Status + power controls + trial cues |
| P0 | Device detail | Status, telemetry snapshot, power, history, chart |
| P1 | Account | Identity, security, deletion |
| P1 | Billing | Per-device unlock / free-access messaging |
| P2 | Auth | Login / register / forgot / social |

**Navigation today:** flat Compose/SwiftUI stack; devices is home; account/billing via menu or deep links from upgrade prompts. Keep devices as the post-login home unless research says otherwise.

---

## 4. Screen-level UX notes (current)

### Auth
- Brand logo + product name + one-line value prop.
- Social buttons **hidden until configured** (no dead buttons).
- Errors as inline text; loading on primary CTA.

### Devices
- Pull-to-refresh; snackbars for command feedback.
- Cards per device with status summary + power controls.
- Empty state with path to add device.
- Overflow menu for Account / Logout (affordances should become clearer — see gaps).

### Device detail
- 30s auto-refresh while visible.
- Firmware version as metadata only.
- Chart: temperature focus; empty chart copy when insufficient data.
- Upgrade dialog when trial blocks a command (`402` / device locked).

### Billing
- Device-centric unlock, not a subscription storefront.
- Refresh after returning from external checkout.
- Free-access mode when billing disabled.

### Account
- Verification banner, change email/password, delete with confirmation, logout confirm.

---

## 5. Accessibility

**Keep / extend:**
- `contentDescription` on power buttons, menu, loading indicators, status summaries (`clearAndSetSemantics` where a composite is read as one).
- Sufficient contrast: light text on dark canvas; status colors with text labels (not color alone).

**Gaps:**
- Emoji hamburger is a weak affordance for screen readers / some locales.
- Text-only `←` back buttons — acceptable but prefer icon + description consistently.
- Chart is visual; ensure summary text for min/max remains.
- No Dynamic Type / font-scale audit documented.
- No reduced-motion policy.

---

## 6. Feedback & errors

| Situation | Pattern |
|---|---|
| Success / command accepted | Snackbar with honest queue/ack wording |
| Network failure | Generic “Network error” from repository; screen-level retry |
| Partial refresh | Soft message: some info could not refresh |
| Auth expired | Silent navigate to login |
| Trial locked | Dialog → billing with device preselected |

Avoid toast spam: one snackbar channel per screen (`SnackbarHostState`).

---

## 7. UX gaps vs world-class (honest)

| Gap | Impact |
|---|---|
| No sleep / hibernate controls | Incomplete power vocabulary if hardware/API adds them |
| No dedicated notification center / prefs | Users can’t manage push categories in-app |
| iOS push not wired | Parity hole for offline/command events |
| External Polar checkout on store builds | Policy / trust risk on Play/App Store |
| Menu chrome & hierarchy | Feels utilitarian; not polished IA |
| No onboarding / first-device wizard | Token reveal is abrupt for new users |
| No offline mode / cached device list | Blank/error when network fails |
| Ownership / multi-user | Not represented |
| Firmware update guidance | Version shown; no “what to do” |

---

## 8. Writing style

- Prefer plain language: “Queued”, “Awaiting device acknowledgement”.
- Name the device in confirmations: `Power Off “Office PC”?`.
- Do not anthropomorphize the relay (“brain”, “magic”).
- Do not promise physical outcomes the API cannot verify.

---

## 9. Review checklist (PR / release)

- [ ] Connection vs PC state still separated  
- [ ] Disruptive commands still confirm with device name  
- [ ] Command snackbars still honest about queue/ack  
- [ ] Social / billing CTAs still config- or flag-gated  
- [ ] New UI has empty, loading, error, and a11y labels  
- [ ] No new secrets in client binaries  
- [ ] Store builds do not violate billing policy for the target storefront  
