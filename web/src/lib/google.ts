/**
 * Public Google OAuth **Web** client ID. This is not a secret.
 *
 * The API allowlists the same audience via GOOGLE_CLIENT_IDS, and the Android
 * app uses this client as its server client ID. The iOS app uses its own iOS
 * client ID, which is also allowlisted. One Web client therefore covers the
 * web button and the Android ID-token audience.
 *
 * Authorized JavaScript origins for this client must include onoffmypc.com,
 * www.onoffmypc.com, app.onoffmypc.com, and (for dev) localhost:3000.
 * See web/DEPLOY.md → "Google sign-in (web)".
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "156303072600-50a2rt2j0gnb81nr093bi7jkcgln5rlq.apps.googleusercontent.com";
