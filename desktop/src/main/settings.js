'use strict'

const { app } = require('electron')
const { readFileSync, writeFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

function load() {
  const path = settingsPath()
  const defaults = {
    telemetryEnabled: true,
    reportCpu: true,
    reportRam: true,
    reportGpu: true,
    reportWifi: true
  }
  if (!existsSync(path)) return defaults
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return {
      telemetryEnabled: typeof raw.telemetryEnabled === 'boolean' ? raw.telemetryEnabled : true,
      reportCpu: typeof raw.reportCpu === 'boolean' ? raw.reportCpu : true,
      reportRam: typeof raw.reportRam === 'boolean' ? raw.reportRam : true,
      reportGpu: typeof raw.reportGpu === 'boolean' ? raw.reportGpu : true,
      reportWifi: typeof raw.reportWifi === 'boolean' ? raw.reportWifi : true
    }
  } catch {
    return defaults
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
