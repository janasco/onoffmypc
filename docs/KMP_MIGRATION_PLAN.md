# Kotlin Multiplatform migration plan

**Audited:** 2026-07-16  
**Constraint:** Incremental, shippable, non-breaking. **Do not** rewrite the Android Compose UI or abandon the SwiftUI app in one step.

Related: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`MOBILE_ROADMAP.md`](MOBILE_ROADMAP.md).

---

## 1. Why KMP (and why not yet everywhere)

**Good fit for OnOffMyPC mobile:**
- Nearly identical DTOs (`Models.kt` ↔ `Models.swift`)
- Same cookie-session API contract
- Same pure presentation rules (command status, connection heuristics, billing eligibility helpers)
- Single repository surface (`OnOffRepository` ↔ `APIClient`)

**Poor first targets:**
- FCM vs APNs
- Credential Manager / Custom Tabs vs AuthenticationServices / ASWebAuthenticationSession
- Compose vs SwiftUI layouts
- EncryptedSharedPreferences vs Keychain (expect `expect`/`actual` storage)

**Decision:** Extract **domain + networking + pure UX copy helpers** first. Keep platform UI native until Phase 4 (optional).

---

## 2. Phase map (aligned with product guidance)

| Phase | Name | Deliverable | Breaks apps? |
|---|---|---|---|
| **1** | Current Android | Documented baseline; Android remains source of truth for shared behavior | No |
| **2** | Extract API/models/repos/logic to shared | `:shared` KMP module; Android `:app` depends on it; iOS unchanged or optional XCFramework later | No if done behind facades |
| **3** | `commonMain` / `androidMain` / `iosMain` | Platform actuals for HTTP client, secure storage, dispatchers | No if Android behavior preserved |
| **4** | Compose Multiplatform iOS | Optional UI unification | **High risk** — separate program |

---

## 3. Phase 1 — Current Android (baseline)

**Already true:**
- Single-module Compose app under `android/app`
- Manual DI (`Graph`)
- Retrofit + OkHttp + kotlinx.serialization
- Pure helpers in `CommandPresentation.kt`, `DeviceStatusPresentation.kt`
- iOS parallel client exists but is not shared

**Exit criteria for Phase 1:**
- [x] Architecture / UX / component docs written
- [ ] Unit tests on pure helpers (recommended before moves — see awaiting approval **N1**)
- [ ] Inventory of “move first” vs “stay platform” files (below)

### Move-first candidates (Phase 2)

| Artifact | Path today | Why |
|---|---|---|
| DTOs + `CommandType` + `ApiException` | `data/model/Models.kt` | Identical on iOS |
| Command copy/colors logic | `ui/components/CommandPresentation.kt` | Pure; trust-critical |
| Connection / status presentation | `ui/components/DeviceStatusPresentation.kt` | Pure (drop Compose color → shared color ints or enums) |
| API path constants / base URL | `data/Constants.kt` | Shared config |
| Repository orchestration | `data/OnOffRepository.kt` | After HTTP abstraction exists |

### Stay on Android (Phase 2–3)

| Artifact | Why |
|---|---|
| All `@Composable` screens | UI |
| `PowerControls`, dialogs | Compose |
| `Graph`, `MainActivity`, FCM | Platform |
| OAuth helpers / Custom Tabs | Platform |
| Retrofit interface initially | May wrap Ktor later; don’t block on it |

---

## 4. Phase 2 — Extract shared API / models / repos / logic

### 4.1 Gradle shape (proposed)

```
android/
  settings.gradle.kts          # include(":app", ":shared")
  shared/                      # NEW kotlin("multiplatform")
    src/commonMain/kotlin/…
    src/androidMain/kotlin/…   # initially empty or thin
    src/iosMain/kotlin/…       # empty until Phase 3
  app/                         # depends on project(":shared")
```

Keep the **Gradle root in `android/`** initially to avoid relocating CI. Optionally later promote a repo-root Gradle for iOS framework export.

### 4.2 Suggested move order (each PR shippable)

1. **Skeleton** — empty `:shared` with `commonMain` hello + Android dependency (no behavior change).  
2. **Models** — move `Models.kt`; fix package `com.onoffmypc.shared.model`; Android imports update.  
3. **Pure presentation** — move command/status helpers; Compose wrappers stay in `:app` mapping enums → `Color`.  
4. **ApiConfig** — base URL + path constants.  
5. **Repository interface** — `OnOffRepository` interface in common; Android class implements with Retrofit (still in `:app` or `androidMain`).  
6. **Optional:** generate Kotlin serialization models as single source; iOS continues Codable until Phase 3 framework.

### 4.3 iOS in Phase 2

**Default:** leave Swift models alone; treat Android shared module as SSOT for Android only.  
**Optional stretch:** publish `shared.xcframework` and replace Swift `Models` — only after Android soak.

### 4.4 Risks & mitigations

| Risk | Mitigation |
|---|---|
| Package churn / merge pain | One package rename PR; no logic edits |
| Color in common code | Use status enums; map to Compose/SwiftUI colors in UI |
| Instant/time APIs | Prefer `kotlinx-datetime` when moving `connectionFromLastContact` |
| Over-extraction | Stop after models + helpers if velocity drops |

---

## 5. Phase 3 — Platform source sets (`commonMain` / `androidMain` / `iosMain`)

### 5.1 Expect/actual seams

| Capability | `commonMain` | `androidMain` | `iosMain` |
|---|---|---|---|
| Secure session storage | `SessionStorage` interface | EncryptedSharedPreferences | Keychain |
| HTTP | Prefer **Ktor** client in common | OkHttp engine | Darwin engine |
| Logging | `HttpLogger` | Logcat / OkHttp | os_log |
| Push token bridge | Interface only | FCM | APNs |
| OAuth | Interface | Credential Manager / Custom Tabs | AS / MSAL |

### 5.2 Networking strategy

**Recommended path:** Introduce Ktor in `commonMain` **behind** the existing repository API; delete Retrofit only when parity tests pass.

**Alternative (lower churn):** Keep Retrofit on Android forever; share only models + use cases; iOS keeps URLSession. Still valuable, less “pure” KMP.

### 5.3 Auth cookie handling

Cookie session must remain compatible with the web/API:
- Persist cookie name `session`
- Clear on logout / 401
- Secure flag / HTTPS only

Implement jar logic carefully per engine; add integration tests against a mock server if possible.

### 5.4 Exit criteria

- Android production build uses `:shared` for models + repository.  
- At least one iOS consumption path: XCFramework **or** documented decision to keep Swift networking with shared models only.  
- Unit tests in `commonTest` for presentation + error mapping.

---

## 6. Phase 4 — Compose Multiplatform iOS (optional)

### 6.1 Preconditions

- Phase 3 shared networking/storage stable in production Android for ≥1 release cycle  
- Design tokens extracted ([`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md))  
- CI Mac runners green for CMP  
- Product accepts dual maintenance risk during migration  

### 6.2 Approach if approved

1. Add CMP to `:shared` or `:composeApp` with `iosArm64` / simulator targets.  
2. Port **one** low-risk screen (Forgot password or Login) as experiment.  
3. Keep SwiftUI app as shipping client until CMP feature-complete.  
4. Cut over screen-by-screen; do not big-bang delete SwiftUI.

### 6.3 Why this is optional / last

- Social login and push are platform-heavy.  
- App Store / TestFlight pipeline today is SwiftUI-shaped.  
- Existing SwiftUI already near feature parity for core flows.  
- ROI is mainly long-term single UI codebase — not short-term shipping.

---

## 7. Testing strategy during migration

| Layer | When |
|---|---|
| `commonTest` pure helpers | Before/while Phase 2 moves |
| Android instrumented smoke | After repository move |
| iOS compile CI | Unchanged until XCFramework |
| Contract tests vs OpenAPI (if added later) | Phase 3 |

No UI screenshot farm required for Phase 2.

---

## 8. What success looks like

**After Phase 2–3:** Changing command status copy or a DTO field is a **one-file** change that Android (and ideally iOS) pick up; fewer honesty regressions.

**After Phase 4 (if ever):** One Compose UI tree ships to both stores — only if Phase 3 already reduced drift enough to justify the cost.

---

## 9. Awaiting approval — KMP-specific next slices

**Do not start until approved** (overlaps [`MOBILE_ROADMAP.md`](MOBILE_ROADMAP.md)):

| ID | Size | Work |
|---|---|---|
| **N1** | S | Unit-test pure helpers **before** moving them |
| **N4** | M | Add empty `:shared` KMP module + `:app` dependency |
| **N5** | M | Move models + presentation helpers into `commonMain` |
| **N8** | M | Introduce `SessionStorage` expect/actual; keep Android EncryptedSharedPreferences behavior |
| **N9** | M | Spike Ktor client for `GET /auth/me` only behind feature flag / debug build |

**Recommended KMP sequence if approved:** N1 → N4 → N5 → N8 → (decide Retrofit-keep vs Ktor) → N9.
