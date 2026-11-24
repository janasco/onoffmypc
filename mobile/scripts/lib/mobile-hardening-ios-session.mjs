#!/usr/bin/env node
/**
 * Origin-binding rules for the iOS Keychain session.
 *
 * Staging and production builds share a bundle identifier and Keychain service.
 * A cookie stored without its issuing API origin could therefore be replayed
 * against the other environment. The checks below require one JSON Keychain
 * item, an exact origin comparison, deletion of legacy raw-cookie items, and
 * origin-aware call sites in APIClient and AppState.
 */

/**
 * Check `Networking/Session.swift` for origin-bound storage semantics.
 * @param {string} source
 * @returns {string[]}
 */
export function validateIosSessionStorage(source) {
  const failures = []
  const require = (pattern, message) => {
    if (!pattern.test(source)) failures.push(message)
  }
  const reject = (pattern, message) => {
    if (pattern.test(source)) failures.push(message)
  }

  require(
    /private\s+struct\s+StoredSession\s*:\s*Codable\s*\{[\s\S]{0,160}?let\s+cookie\s*:\s*String[\s\S]{0,160}?let\s+origin\s*:\s*String/,
    'iOS session item must be one Codable value containing cookie and origin',
  )
  require(
    /JSONEncoder\(\)\s*\.encode\(stored\)/,
    'iOS session item must be encoded as JSON',
  )
  require(
    /JSONDecoder\(\)\s*\.decode\(\s*StoredSession\.self\s*,\s*from:\s*data\s*\)/,
    'iOS session item must be decoded from JSON',
  )
  require(
    /static\s+func\s+cookie\s*\(\s*for\s+origin:\s*String\s*\)\s*->\s*String\?/,
    'iOS session must expose cookie(for origin:)',
  )
  require(
    /static\s+func\s+setCookie\s*\(\s*_\s+cookie:\s*String\?,\s*origin:\s*String\s*\)/,
    'iOS session must expose setCookie(_:origin:)',
  )
  require(
    /static\s+func\s+isLoggedIn\s*\(\s*for\s+origin:\s*String\s*\)\s*->\s*Bool/,
    'iOS session must expose isLoggedIn(for origin:)',
  )
  require(
    /static\s+func\s+clear\s*\(\s*\)\s*\{/,
    'iOS session must expose clear()',
  )
  require(
    /components\.scheme\?\.lowercased\(\)\s*==\s*"https"/,
    'iOS session origin must require HTTPS',
  )
  require(
    /components\.port\s*\?\?\s*443/,
    'iOS session origin must canonicalize the default HTTPS port',
  )
  require(
    /!value\.isEmpty/,
    'iOS session must reject empty/whitespace cookies',
  )
  require(
    /guard\s+stored\.origin\s*==\s+requested\s+else\s*\{\s*clear\(\)\s*return\s+nil\s*\}/,
    'iOS session lookup must clear a mismatched origin',
  )
  require(
    /legacyAccount\s*=\s*"session-cookie"/,
    'iOS session must identify the legacy raw-cookie account',
  )
  require(
    /delete\(\s*account:\s*legacyAccount\s*\)/,
    'iOS session must delete the legacy raw-cookie item',
  )
  require(
    /guard\s+let\s+stored\s*=\s*try\?\s+JSONDecoder\(\)\.decode\(StoredSession\.self[\s\S]{0,260}?else\s*\{[\s\S]{0,120}?delete\(\s*account:\s*account\s*\)/,
    'iOS session must delete a malformed/non-JSON Keychain item',
  )
  reject(
    /static\s+var\s+cookie\b/,
    'iOS session must not expose an origin-less cookie property',
  )
  reject(
    /static\s+var\s+isLoggedIn\b/,
    'iOS session must not expose an origin-less isLoggedIn property',
  )

  return failures
}

/**
 * Check APIClient/AppState for origin-aware session use.
 * @param {{apiClientSource: string, appStateSource: string}} sources
 * @returns {string[]}
 */
export function validateIosSessionConsumers({
  apiClientSource,
  appStateSource,
}) {
  const failures = []
  const require = (source, pattern, message) => {
    if (!pattern.test(source)) failures.push(message)
  }
  const reject = (source, pattern, message) => {
    if (pattern.test(source)) failures.push(message)
  }

  require(
    apiClientSource,
    /let\s+configuredOrigin:\s*String\?/,
    'APIClient must expose the configured session origin',
  )
  require(
    apiClientSource,
    /configuredOrigin\s*=\s*url\.flatMap\(Self\.originString\)/,
    'APIClient must derive the session origin from API_BASE_URL',
  )
  require(
    apiClientSource,
    /url\.port\s*\?\?\s*443/,
    'APIClient origin must include the canonical HTTPS port',
  )
  require(
    apiClientSource,
    /Session\.cookie\(for:\s*configuredOrigin\)/,
    'APIClient must read the cookie only for the configured origin',
  )
  require(
    apiClientSource,
    /Session\.setCookie\(session\.value,\s*origin:\s*configuredOrigin\)/,
    'APIClient must store the cookie with the configured origin',
  )
  require(
    apiClientSource,
    /if\s+http\.statusCode\s*==\s*401\s*\{[\s\S]{0,160}?Session\.clear\(\)/,
    'APIClient must clear the session on 401',
  )
  require(
    apiClientSource,
    /func\s+logout\(\)[\s\S]{0,700}?Session\.clear\(\)/,
    'APIClient must clear the session on logout',
  )
  require(
    appStateSource,
    /guard\s+let\s+origin\s*=\s*APIClient\.shared\.configuredOrigin\s+else\s*\{\s*return\s+false\s*\}/,
    'AppState must require the configured API origin for initial login',
  )
  require(
    appStateSource,
    /Session\.isLoggedIn\(for:\s*origin\)/,
    'AppState must check the stored session for the configured origin',
  )
  require(
    appStateSource,
    /func\s+sessionExpired\(\)[\s\S]{0,160}?Session\.clear\(\)/,
    'AppState must clear the origin-bound session on expiry',
  )

  reject(
    apiClientSource,
    /Session\.cookie\b(?!\s*\()/,
    'APIClient must not use an origin-less Session.cookie accessor',
  )
  reject(
    apiClientSource,
    /Session\.isLoggedIn\b(?!\s*\()/,
    'APIClient must not use an origin-less Session.isLoggedIn accessor',
  )
  reject(
    appStateSource,
    /Session\.cookie\b(?!\s*\()/,
    'AppState must not use an origin-less Session.cookie accessor',
  )
  reject(
    appStateSource,
    /Session\.isLoggedIn\b(?!\s*\()/,
    'AppState must not use an origin-less Session.isLoggedIn accessor',
  )

  return failures
}
