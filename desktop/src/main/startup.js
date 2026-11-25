'use strict'

/**
 * Existing credentials are intentionally reused across normal restarts. After
 * an install/update, however, the user should explicitly confirm that the PC is
 * still meant to connect to the account that previously paired it. The marker
 * stores the app version that was last acknowledged, so normal restarts do not
 * prompt but a version change prompts once.
 */
function shouldConfirmExistingPairing({ hasCredentials, markerVersion, appVersion }) {
  return Boolean(hasCredentials) && markerVersion !== appVersion
}

module.exports = { shouldConfirmExistingPairing }
