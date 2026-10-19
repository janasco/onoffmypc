'use strict'

const AutoLaunch = require('auto-launch')
const { app } = require('electron')

const launcher = new AutoLaunch({ name: 'OnOffMyPC', path: app.getPath('exe') })

async function isEnabled() {
  try {
    return await launcher.isEnabled()
  } catch {
    return false
  }
}

async function setEnabled(enabled) {
  const currentlyEnabled = await isEnabled()
  if (enabled === currentlyEnabled) return
  if (enabled) await launcher.enable()
  else await launcher.disable()
}

module.exports = { isEnabled, setEnabled }
