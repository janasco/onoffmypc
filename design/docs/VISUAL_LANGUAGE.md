# Visual language

## Character

OnOffMyPC is a remote operational tool, not a gaming dashboard. Interfaces are
quiet, legible, and candid about uncertainty. Use restrained green-tinted
neutrals, strong type hierarchy, thin borders, modest elevation, and only the
motion needed to explain a state change.

## Color responsibilities

- Blue identifies ordinary interaction: primary actions, navigation, links,
  focus, selection, and informational progress.
- Green identifies evidence of a positive operational state: device online, PC
  last reported on, or access truly unlocked.
- Amber identifies queued, pending, stale, expiring, or attention states.
- Red identifies destructive actions, failed/expired operations, and conditions
  that prevent the requested operation.
- Neutral identifies unknown, unavailable, disabled, or last-known information.

Do not use green to make a request merely feel successful. Device
acknowledgement is informational blue until a command-linked physical result is
available. The Power On control is blue because it submits a request; a
timestamped PC-on report may use green because it is positive operational
evidence.

## Surfaces and hierarchy

Prefer border-first hierarchy over large shadows. A screen normally contains:

1. one canvas;
2. one raised navigation surface;
3. low-emphasis grouped surfaces for related content;
4. a raised overlay only for dialogs, menus, or transient feedback.

Avoid putting every label in a separate card. Lists and tables may use dividers
inside one surface. Admin keeps a compact density but uses the same color and
type roles.

## Typography

Sora is the web display face and Source Sans 3 is the web reading face. Native
clients map the same roles onto Dynamic Type or Material typography and may use
system fonts for platform fit. Type roles are more important than identical
point sizes.

- `display`: brand and high-level marketing statements;
- `screen-title`: the current location or device;
- `section-title`: a scannable content group;
- `body`: instructions and explanations;
- `label`: controls and compact status;
- `metadata`: timestamps, versions, and supporting evidence;
- `mono`: credentials and machine identifiers only.

## Layout and density

Use the shared 4px-derived spacing scale. Customer control targets are at least
44 CSS points and 48 Android dp. Primary content must work at 320px wide, large
native text sizes, and browser zoom without hiding command context.

## Motion

Use 100–240ms transitions for hover, focus, panel, and progress continuity.
Remote commands are not celebrations: no confetti, glow stacks, or success
pulses. Reduced-motion mode removes nonessential transitions while retaining
immediate state feedback.
