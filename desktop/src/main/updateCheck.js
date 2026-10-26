'use strict'

const { app, Notification } = require('electron')

// Release artifacts live on Cloudflare R2; GitHub holds source only. The
// manifest is the same one the web downloads page reads.
const RELEASES_MANIFEST_URL = 'https://releases.onoffmypc.com/releases/manifest.json'

function compareVersions(v1, v2) {
  const clean = (v) => String(v).replace(/^v/, '').split('.').map(Number)
  const parts1 = clean(v1)
  const parts2 = clean(v2)
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p2 > p1) return -1
  }
  return 0
}

/**
 * Pull the desktop version out of the release manifest. Pure and lenient:
 * a malformed or older manifest yields null rather than throwing, because a
 * bad manifest must never break the agent.
 */
function latestDesktopVersion(manifest) {
  const version = manifest && manifest.families && manifest.families.desktop
    ? manifest.families.desktop.version
    : null
  return typeof version === 'string' && version.length > 0 ? version : null
}

async function checkForUpdates() {
  if (!Notification.isSupported()) return

  try {
    const response = await fetch(RELEASES_MANIFEST_URL, {
      headers: {
        'User-Agent': 'OnOffMyPC-Desktop-Agent',
        Accept: 'application/json',
      },
    })
    if (!response.ok) return

    const latestVersion = latestDesktopVersion(await response.json())
    if (!latestVersion) return

    const currentVersion = app.getVersion()
    if (compareVersions(latestVersion, currentVersion) > 0) {
      const notification = new Notification({
        title: 'OnOffMyPC Update Available',
        body: `A new version (${latestVersion}) is available. Please update to get the latest features.`,
        silent: false,
      })
      notification.show()
    }
  } catch {
    // Network or parse failures are non-fatal; update checks are best-effort.
  }
}

module.exports = { checkForUpdates, compareVersions, latestDesktopVersion, RELEASES_MANIFEST_URL }
