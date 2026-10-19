'use strict'

const { app, Notification } = require('electron')

function compareVersions(v1, v2) {
  const clean = (v) => v.replace(/^v/, '').split('.').map(Number)
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

async function checkForUpdates() {
  if (!Notification.isSupported()) return

  try {
    const response = await fetch('https://api.github.com/repos/onoffmypc/onoffmypc-desktop/releases/latest', {
      headers: { 'User-Agent': 'OnOffMyPC-Desktop-Agent' }
    })
    if (!response.ok) return
    const data = await response.json()
    const latestVersion = data.tag_name
    if (!latestVersion) return

    const currentVersion = app.getVersion()
    if (compareVersions(latestVersion, currentVersion) > 0) {
      const notification = new Notification({
        title: 'OnOffMyPC Update Available',
        body: `A new version (${latestVersion}) is available. Please update to get the latest features.`,
        silent: false
      })
      notification.show()
    }
  } catch (err) {
    // Fail silently on network errors
  }
}

module.exports = { checkForUpdates }
