# Play Data Safety — draft answers

Draft for the Play Console **Data safety** form. Based on what the app actually
does: account auth (email), FCM push (device token), and device management +
telemetry. **No analytics SDK, no ads, no crash-reporting SDK.** Firebase Cloud
Messaging is used as a **service provider** (processing on our behalf), so its
data is *collected* but not *shared*.

> Verify these match your published privacy policy (`onoffmypc.com/privacy-policy`)
> before submitting — the two must be consistent.

## 1. Does your app collect or share any required user data types?
**Yes** (collects; does not share).

## 2. Data collected

| Data type (Play category) | Collected | Shared | Optional/Required | Purposes |
|---|---|---|---|---|
| **Email address** (Personal info) | Yes | No | Required | Account management, App functionality |
| **User IDs** (Personal info) | Yes | No | Required | Account management, App functionality |
| **Device or other IDs** (Device or other IDs) | Yes | No | Required | App functionality (push notifications via FCM) |
| **Other user-generated content** (App activity) | Yes | No | Optional | App functionality (device names/labels you create) |

Notes:
- **Email address** — used to create and sign in to the account.
- **User IDs** — the account identifier tying devices/commands to you.
- **Device or other IDs** — the FCM registration token, used to deliver push notifications. (Firebase installation identifiers.)
- **Other user-generated content** — the names you give your devices. Device telemetry (temperature/humidity/Wi-Fi signal) and command history are readings from *your hardware* tied to your account; if the form asks, classify device names/labels here.

### For every data type, set:
- **Collected**: Yes
- **Shared**: No
- **Processed ephemerally**: No (it's stored server-side)
- **Users can request deletion**: Yes (see §4)

## 3. Data NOT collected (leave unchecked)
Location · Financial info · Health & fitness · Messages · Photos/videos · Audio ·
Files/docs · Calendar · Contacts · Web browsing history · Search history ·
Installed apps · **Crash logs / Diagnostics / Analytics** (no such SDK) · **Ads** (none).

## 4. Security practices
- **Is all user data encrypted in transit?** → **Yes.** All API traffic uses HTTPS/TLS; device links use WSS.
- **Do you provide a way for users to request that their data be deleted?** → **Yes.** In-app: **Account → Delete account** permanently deletes the account and all associated devices, commands, telemetry, and push tokens. Give the deletion method/URL if asked (in-app account deletion; account page at `app.onoffmypc.com`).
- Independent security review: optional — leave unless you've had one.

## 5. Data sharing = None
No data is shared with third parties. FCM (Google) is a **service provider**
processing push delivery on our behalf, which Play does not count as "sharing."
There are **no advertising or analytics SDKs** in the app.

## Quick console checklist
1. Data collection & security → **Yes**, app collects data.
2. Add the 4 data types above (each: collected = Yes, shared = No, required except device names = optional, purposes as listed).
3. Security → encrypted in transit **Yes**; deletion available **Yes**.
4. Confirm it matches `onoffmypc.com/privacy-policy`.
