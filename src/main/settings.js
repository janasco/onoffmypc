'use strict'

const { app } = require('electron')
const { readFileSync, writeFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

function load() {
  const path = settingsPath()
  if (!existsSync(path)) return { telemetryEnabled: true }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return {
      telemetryEnabled: typeof raw.telemetryEnabled === 'boolean' ? raw.telemetryEnabled : true
    }
  } catch {
    return { telemetryEnabled: true }
  }
}

function save(settings) {
  writeFileSync(
    settingsPath(),
    JSON.stringify(settings, null, 2),
    { mode: 0o600 }
  )
}

module.exports = { load, save }
