# Component specifications

Shared components define anatomy, state, writing, and accessibility. Web,
Compose, and SwiftUI implement them with native primitives.

## Status badge

Accepts a typed presentation role, never an arbitrary color. It contains visible
text and may contain one decorative icon. Connection, PC state, command state,
and access state remain separate namespaces even when they share a tone.

## Device status summary

Required information:

- verified connection status;
- last contact time or an explicit unavailable value;
- latest PC power report and its observation time;
- stale or unknown language when freshness cannot be established.

It must not infer current PC state from connection or command data.

## Command progress

Shows one updating event rather than a sequence of unrelated success toasts.
The supported current sequence is queued, awaiting acknowledgement, device
acknowledged, and expired. A confirmed result is reserved until the backend
supplies command-linked telemetry evidence.

## Power controls

Controls are grouped by device and lock while a request is being submitted.
Power On uses the ordinary blue action role; requesting power does not prove
that the PC is on. Green is reserved for a positively observed PC-on state.
Power Off, Force Off, and Reset confirmations name the device and describe the
consequence. Force Off explains the six-second hold and potential loss of
unsaved work. Offline queue behavior includes the expiry before submission.

## Dialog

Dialogs have a labelled title, description, safe initial focus, focus
containment, Escape policy, and focus restoration. The confirmation button
restates the action; it is not labelled only “Confirm.” Native clients use
native dialog and sheet behavior.

## Credential reveal

Pairing code is the default route. Raw device token entry is an advanced
fallback. The component warns that the value is shown once, confirms copying,
clears sensitive in-memory presentation on close, and never places secrets in
analytics or logs.

## Async content

Loading, empty, stale, partial, unavailable, and error are distinct. Refresh
failure preserves last-known data with its timestamp. Error messages offer one
specific recovery action where possible.
