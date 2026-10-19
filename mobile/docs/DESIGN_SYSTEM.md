# Design system — mobile adapter and migration record

**Audited:** 2026-07-16

**Canonical source:** `onoffmypc-design` tokens, state catalog, and guidance.

**Android adapter:** generated Kotlin plus `ui/theme/` and `ui/designsystem/`.

**iOS adapter:** generated Swift plus `Components/AppDesignSystem.swift`.

This file began as the pre-shared-system audit and remains useful migration
history. New token values, state meaning, component specifications, writing,
and accessibility rules must be changed in `onoffmypc-design`, regenerated,
and then adapted natively. Do not create a second canonical palette here. See
[`MOBILE_ROADMAP.md`](MOBILE_ROADMAP.md).

---

## 1. Current state (Android)

### 1.1 Colors (exists)

Defined as top-level `Color` vals in `Color.kt`:

| Token (code name) | Hex | Role |
|---|---|---|
| `Background` | `#0F0F0F` | Dark canvas |
| `Surface` | `#1A1A1A` | Cards / elevated |
| `Border` | `#2A2A2A` | Outlines |
| `OnBackground` | `#F0F0F0` | Primary text (dark) |
| `Muted` | `#888888` | Secondary text |
| `BackgroundLight` … `MutedLight` | white / zinc-ish | Light theme mirrors |
| `Accent` / `AccentHover` | `#3B82F6` / `#2563EB` | Primary / hover |
| `Green` / `Red` / `Yellow` | `#22C55E` / `#EF4444` / `#F59E0B` | Status / power / warning |

`OnOffMyPCTheme` maps these into Material 3 `darkColorScheme` / `lightColorScheme` and follows **system** light/dark. Semantic accents (`Green`/`Red`/`Yellow`) are often used **directly** in screens rather than via `MaterialTheme.colorScheme`.

### 1.2 Typography (mostly missing)

- **No** custom `Typography` object, **no** brand typefaces.
- Screens use default Material 3 type roles (`headlineMedium`, `titleSmall`, `bodyMedium`, `labelLarge`, …).
- Monospace appears only for device tokens (`FontFamily.Monospace` in `DeviceDialogs.kt`).

### 1.3 Shape / spacing / elevation (mostly missing)

- No shared spacing scale, radius tokens, or elevation tokens.
- Layouts use ad-hoc `8.dp` / `12.dp` / `16.dp` / `24.dp` paddings.
- `Card` is used widely for device rows, billing blocks, telemetry tiles — Material defaults.

### 1.4 Motion (missing)

- No shared animation tokens or intentional motion language beyond Material defaults / pull-to-refresh / progress indicators.

### 1.5 Icons

- Logo via `AppLogo` drawable.
- Navigation uses text/`←` and emoji hamburger `☰` rather than Material Icons set consistently.
- Notification small icon: `@drawable/ic_stat_notify`.

### 1.6 iOS current state

- No shared design-token file equivalent to `Color.kt`.
- Components duplicate Android semantics (power colors, status labels) but styling is SwiftUI-native.
- Assets: AppIcon, AccentColor, Logo under `Assets.xcassets`.

---

## 2. What exists vs missing (summary)

| Area | Exists | Missing / weak |
|---|---|---|
| Brand palette (dark/light) | Yes (Android) | Named semantic layer beyond M3 mapping; iOS token file |
| Status colors (online/error/warn) | Yes (direct consts) | Documented usage rules; contrast checks |
| Typography scale | Default M3 only | Brand fonts, display/title/body roles, tracking |
| Spacing / radius scale | Ad-hoc | `Space` / `Radius` tokens |
| Elevation / borders | M3 Card defaults | Explicit border-first dark surfaces |
| Component library | Small set (see [`COMPONENT_LIBRARY.md`](COMPONENT_LIBRARY.md)) | Empty/error/skeleton primitives, nav chrome, buttons |
| Motion | Minimal | Enter/exit, status pulse, command progress |
| Accessibility tokens | Some `contentDescription`s | Focus order, large text verification, reduced-motion |
| Cross-platform tokens | None | JSON or KMP `commonMain` token module |

---

## 3. Target tokens (approved — adopt incrementally)

Keep Material 3 as the **engine**; wrap brand tokens so Compose (and later CMP) stay consistent. Prefer `ui/designsystem/` aliases over scattering raw `dp` / one-off colors.

### 3.1 Color roles (target)

| Role | Maps from today | Usage |
|---|---|---|
| `canvas` | Background | Screen background |
| `surface` | Surface | Section containers |
| `border` | Border / outline | Hairlines, card edges |
| `text.primary` | OnBackground | Titles, body |
| `text.secondary` | Muted | Meta, hints |
| `action.primary` | Accent | Primary CTAs (not power) |
| `status.online` | Green | Connection online |
| `status.offline` / `danger` | Red | Offline, destructive confirm |
| `status.pending` | Yellow | Queued / awaiting ack / trial warning |
| `power.on` / `power.off` / `power.reset` | Green / Red / Yellow | Power control buttons only |

**Rule:** Power colors stay reserved for power actions; primary blue is for navigation/account/billing CTAs.

### 3.2 Type roles (target)

| Role | Approx M3 | Notes |
|---|---|---|
| `displayBrand` | headlineMedium+ | Login brand title |
| `titleScreen` | titleLarge | TopAppBar / section |
| `titleSection` | titleSmall | “Device status”, “Command history” |
| `body` | bodyMedium | Default copy |
| `meta` | labelMedium / bodySmall | Last contact, timestamps |
| `mono` | bodySmall + monospace | Tokens only |

Prefer one expressive brand family for `displayBrand` later; until then, stick to M3 defaults to avoid a rewrite.

### 3.3 Space / radius (target)

| Token | Value | Use |
|---|---|---|
| `space.xs` | 4 | Inline gaps |
| `space.sm` | 8 | Button rows (matches PowerControls) |
| `space.md` | 16 | Card padding |
| `space.lg` | 24 | Screen edge (auth) |
| `radius.sm` | 8 | Chips / small controls |
| `radius.md` | 12 | Cards |

### 3.4 Shared components (see also COMPONENT_LIBRARY)

| Priority | Component | Notes |
|---|---|---|
| Done / landing | `EmptyState` / `ErrorState` / `LoadingState` / `StatusBadge` | `ui/designsystem/` |
| Exists | `PowerControls`, `DeviceStatusSummary`, command helpers | `ui/components/` |
| Later | `OnOffTopBar`, trial banner extract, chart extract | Non-blocking polish |

**Motion restraint:** Material progress + pull-to-refresh only; no glassmorphism, glow stacks, or celebratory command animations ([`UX_GUIDELINES.md`](UX_GUIDELINES.md)).

---

## 4. Adoption strategy (incremental)

1. Document palette + UX anti-patterns (done).
2. Add design-system tokens (`Spacing`, status colors) wrapping `Color.kt` / M3.
3. Migrate Devices, Device detail, Account, Login to Empty/Error/Loading/StatusBadge where natural.
4. Align iOS helpers later (Swift), without KMP yet.
5. After KMP Phase 2–3: move pure token constants into `commonMain` if useful.

**Anti-goals:** Full visual redesign, purple/glow “AI default” themes, card-heavy dashboard chrome, rewriting every screen to a new design language in one PR.
