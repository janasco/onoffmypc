# Push notifications (FCM)

The app is wired for Firebase Cloud Messaging but **inert until you add Firebase
config** — it builds and runs fine without it (the google-services plugin is
applied only when `app/google-services.json` exists, and all FCM calls no-op
when Firebase isn't initialized).

## What's already built (client)
- `firebase-messaging` dependency + conditional google-services plugin.
- `push/OnOffMessagingService` — receives messages (shows a notification) and token rotations.
- `push/PushManager` — registers the FCM token with the backend (`POST /push/register`) on login/register, app start, and token refresh; guarded by sign-in + Firebase availability.
- `push/Notifications` — the `device_status` channel + notification display.
- `POST_NOTIFICATIONS` runtime permission request on Android 13+.
- Backend calls: `POST /push/register` and `POST /push/unregister` (`{ token, platform }`).

## To switch it on

### 1. Create the Firebase project
- Firebase console → Add project (can reuse an existing Google Cloud project).
- Add an **Android app** with package name `com.onoffmypc.android`.
- Download **`google-services.json`** and place it at `app/google-services.json`, then commit it (this is client config, safe in a private repo). Builds/releases will pick it up automatically.

### 2. Backend send credentials (onoffmypc-app)
FCM sending uses the **HTTP v1 API** with a Google **service account**:
- Firebase console → Project settings → Service accounts → Generate new private key (JSON).
- Add it to the worker as secrets (see the backend push module): the service-account JSON and the Firebase **project ID**.
- Without these, the backend stores tokens but send is a no-op.

### 3. Verify
- Install a build that has `google-services.json`, sign in → the app registers its token.
- Trigger a notification event (device offline/online, command delivered/failed) → the phone gets a push.

## Notes
- Notifications fire for: device went **offline**, device came **online**, command **delivered**, command **failed/expired**.
- Tokens are re-registered on every login, so a token maps to the most recent signed-in user on that device.
