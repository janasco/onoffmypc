# Accessibility standard

Accessibility is a release requirement, not a downstream consumer option.

## Required behavior

- Every interactive control has a programmatic name and visible focus.
- Status never depends on color alone; visible text describes the state.
- Composite device summaries expose a concise reading order without repeating
  decorative glyphs.
- Remote-command progress is announced politely; blocking failures use an
  assertive announcement only when immediate attention is necessary.
- Form errors are adjacent to their fields and connected programmatically.
- Dialogs label their title and description, contain focus, and restore focus.
- Charts include latest, minimum, maximum, unit, time range, and a nonvisual
  summary or table.
- Touch targets meet platform minimums and tolerate large text.
- Reduced-motion preference removes decorative movement.
- Zoom, reflow, landscape, keyboard, switch, screen-reader, and high-contrast
  behavior are checked before a stable component release.

## Automated gates

The generator checks contrast for every semantic action and status
foreground/container pair. Consumer CI adds keyboard and accessibility-tree
tests, screenshot comparisons for both themes, and native UI tests. Automation
supplements rather than replaces a screen-reader and large-text pass.

## Copy and evidence

Accessible wording follows the same evidence boundary as visible wording. The
name “Device acknowledged” must not become “Power action completed” in an
accessibility label or notification.
