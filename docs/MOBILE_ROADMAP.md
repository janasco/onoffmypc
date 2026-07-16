# Mobile roadmap (incremental)

**Audited:** 2026-07-16  
**Principle:** Ship small, non-breaking slices on the current Android app; keep iOS in feature parity where cheap; defer big-bang rewrites. KMP detail lives in [`KMP_MIGRATION_PLAN.md`](KMP_MIGRATION_PLAN.md).

---

## North star (honest)

A trusted, fast control surface for OnOffMyPC devices on Android and iOS, with shared domain logic, solid tests, store-compliant billing, and push on both platforms — **without** discarding the working Compose/SwiftUI UIs.

We are **not** aiming to replace the app with a greenfield redesign in one program.

---

## Phase overview

| Phase | Focus | Outcome |
|---|---|---|
| **P0** | Stabilize & document (now) | Docs, known gaps visible, no architecture thrash |
| **P1** | Android quality | Tests for pure logic, R8 path, UX chrome polish, security hardening options |
| **P2** | iOS production readiness | APNs, signing/TestFlight, push parity |
| **P3** | Shared logic extraction | KMP Phase 2–3 (API/models/repos) |
| **P4** | Optional CMP iOS UI | KMP Phase 4 — only if P3 pays off |

Phases P1–P2 can overlap with early P3 prep (seams, tests) but **UI rewrite is last**.

---

## Phase 0 — Current Android (baseline)

**Status:** Largely done as of 0.3.x.

- Auth (email + config-gated Google/Apple/Microsoft)
- Devices + power + status honesty
- Detail telemetry/history
- Account + billing_enabled / unlocks
- FCM path (config-dependent)
- Docs in `docs/` (this set)

**Exit criteria:** Play-ready APK/AAB process documented (`RELEASE.md`, `PLAYSTORE.md`); security assessment tracked privately.

---

## Phase 1 — Android hardening (shippable slices)

| Slice | Size | Goal |
|---|---|---|
| 1.1 Unit tests for `CommandPresentation` + `DeviceStatusPresentation` | S | Lock honesty rules |
| 1.2 Repository error-mapping tests (`ApiException` / 402) | S | Billing upgrade path |
| 1.3 Enable R8 on a debug-equivalent build + keep rules | M | Smaller/safer release |
| 1.4 Replace emoji menu with Material icon top bar | S | A11y / polish |
| 1.5 Extract Empty/Error/Chart components | S–M | [`COMPONENT_LIBRARY.md`](COMPONENT_LIBRARY.md) |
| 1.6 Optional: certificate pinning to `api.onoffmypc.com` | M | Security (needs rotate story) |
| 1.7 Optional: biometric app unlock | M | Security UX |
| 1.8 Store billing strategy decision | M | Play Billing vs sideload/Polar-gated |

---

## Phase 2 — iOS readiness

| Slice | Size | Goal |
|---|---|---|
| 2.1 APNs + `POST /push/register` with `platform: ios` | M | Real push |
| 2.2 TestFlight / signing workflow in CI | M | Distribution |
| 2.3 Parity pass on copy/status helpers after Android changes | S | Drift control |
| 2.4 App Store billing policy path | M | Same constraint as Play |

---

## Phase 3 — Shared core (KMP prep → extract)

See [`KMP_MIGRATION_PLAN.md`](KMP_MIGRATION_PLAN.md) Phases 2–3.

- Introduce `:shared` module; move models + pure presentation + repository interfaces first.
- Keep Compose and SwiftUI as consumers.
- Do **not** move UI yet.

---

## Phase 4 — Compose Multiplatform iOS (optional)

Only after shared core is proven in production Android builds and iOS still consumes shared logic via thin wrappers (or a CMP experiment app). High risk to App Store timeline — treat as strategic, not default.

---

## Feature backlog (product, not architecture)

Prioritize only if API/hardware supports them:

1. Sleep / hibernate command types + confirmations  
2. Ownership / transfer UI  
3. Firmware update guidance / OTA status  
4. In-app notification preferences  
5. First-run device setup wizard (token + flash instructions)  
6. Cached device list for offline viewing  

---

## Explicit non-goals (near term)

- Rewriting the app in Flutter/React Native  
- Big-bang CMP iOS before shared domain exists  
- Visual redesign that breaks status/command honesty  
- Shipping Polar unlock CTAs on storefronts that require IAP without a compliant path  

---

## Approved implementation slices (this program)

User approved the full audit plan. Execute in order; do not stop after docs.

| ID | Size | Slice | Status |
|---|---|---|---|
| **D0** | S | Docs pack (`ARCHITECTURE`, UX, design system, components, roadmap, KMP) + README index | First |
| **S1** | M | Android design-system foundation (`ui/designsystem/` tokens + Empty/Error/Loading/StatusBadge); migrate key screens lightly | After D0 |
| **S2** | M | Home fleet summary on Devices (total / online / offline; attention only from existing APIs) | After S1 |
| **S3** | M | Device detail sections (Overview / Power / Activity / Telemetry / Settings) | With S2 |
| **S4** | S | Dangerous-action confirm copy (`Restart {name}`, etc.) in PowerControls / dialogs | With S2–S3 |
| **S5** | M | Unit tests for `CommandPresentation` (+ pure helpers / easy repo mapping) | After S1 |
| **S6** | L | First KMP-prep extract: `:shared:model` (prefer models; defer `:shared:network` if risky) | After S5 |

**Still deferred until asked:** biometric auth, cert pinning, full onboarding wizard, offline cache/paging, CMP iOS rewrite, Hilt/Koin, Play Billing vs Polar gating implementation, iOS APNs production wiring.
