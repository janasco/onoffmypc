# UX writing

OnOffMyPC copy should make remote control feel calm, precise, and trustworthy.
Use the approved trust-critical messages in `content/en.json` where they apply.

## Voice and mechanics

- Be direct, specific, and reassuring without promising an outcome the product
  has not observed.
- Use sentence case for headings, ordinary buttons, status labels, and
  messages. The compact hardware-command labels “Power On,” “Power Off,”
  “Force Off,” and “Reset” are fixed product labels; use sentence case when
  describing those actions in prose.
- Prefer short sentences and familiar verbs: “Try again,” “Sign in,” and
  “Power off.” Avoid enthusiasm, blame, and internal implementation terms.
- Write “Wi-Fi” with that capitalization and hyphen. Use “network” only when
  the distinction between Wi-Fi and another connection does not matter.
- Distinguish the device controller from the connected PC. “Device online”
  does not mean “PC on.”

## State and command language

Describe only observed facts. A requested command is queued; a sent command is
waiting for acknowledgement; an acknowledged command was received by the
device. None of those states confirms the PC's physical state. Use “confirmed”
only after command-linked telemetry reports the result. Include the relevant
time when recency changes the meaning. Likewise, do not describe or color a
Power On request as successful before the PC reports that it is on.

For destructive actions, name the action and device in the title, explain the
physical effect, and state the risk before the confirm button. Keep “Cancel”
available and never use a vague confirmation such as “Are you sure?”

## Errors and recovery

Use this order when the information is available:

1. Say what could not happen in user terms.
2. Preserve known state or clarify what is unknown.
3. Give one concrete next action.

For example: “Couldn’t reach OnOffMyPC. Check your connection and try again.”
Do not expose stack traces, transport codes, or blame the user.

## Localization

Use named placeholders wrapped in braces, such as `{device}`, `{action}`, and
`{expiresAt}`. Do not concatenate fragments or embed grammar in a placeholder.
Keep punctuation outside placeholders, provide translator context for device
versus PC state, and allow labels and messages to expand without truncation.
Dates, times, and numbers must be formatted for the active locale.
