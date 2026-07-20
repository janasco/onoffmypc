'use strict'

const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, dialog } = require('electron')
const path = require('node:path')

const tokenStore = require('./tokenStore')
const { pairWithCode } = require('./pairing')
const { DeviceRelayClient } = require('./relay')
const { collectTelemetry } = require('./telemetry')
const { handleCommand } = require('./commands')
const autostart = require('./autostart')
const { checkForUpdates } = require('./updateCheck')
const { API_BASE_URL, WS_BASE_URL, TELEMETRY_INTERVAL_MS } = require('./config')

// Single instance: two copies of this agent racing to hold the same device's
// WebSocket would just repeatedly kick each other off (DeviceRelay closes any
// prior socket on a new connection).
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let tray = null
let pairingWindow = null
let relay = null
let telemetryTimer = null
let connected = false

function trayIcon() {
  return path.join(__dirname, 'assets', 'icon-16.png')
}

async function showDiagnostics() {
  const creds = tokenStore.load()
  const paired = Boolean(creds)
  const settingsStore = require('./settings')
  const settings = settingsStore.load()
  const autostartEnabled = await autostart.isEnabled()
  
  let info = `Application Version: ${app.getVersion()}\n`
  info += `OS Platform: ${process.platform} (${process.arch})\n`
  info += `Pairing Status: ${paired ? 'Paired' : 'Not paired'}\n`
  if (paired && creds) {
    info += `Device ID: ${creds.id}\n`
    info += `Relay Connection: ${connected ? 'Connected' : 'Disconnected / Reconnecting'}\n`
    info += `WebSocket Endpoint: ${WS_BASE_URL}/ws/${creds.id}\n`
  }
  info += `Telemetry Enabled: ${settings.telemetryEnabled ? 'Yes' : 'No'}\n`
  info += `Report CPU: ${settings.reportCpu ? 'Yes' : 'No'}\n`
  info += `Report RAM: ${settings.reportRam ? 'Yes' : 'No'}\n`
  info += `Report GPU: ${settings.reportGpu ? 'Yes' : 'No'}\n`
  info += `Report Wi-Fi: ${settings.reportWifi ? 'Yes' : 'No'}\n`
  info += `Autostart (Start at login): ${autostartEnabled ? 'Yes' : 'No'}\n`

  dialog.showMessageBox({
    type: 'info',
    title: 'OnOffMyPC Diagnostics',
    message: 'OnOffMyPC Agent Diagnostics',
    detail: info,
    buttons: ['OK']
  })
}

function updateTrayMenu() {
  if (!tray) return
  const creds = tokenStore.load()
  const paired = Boolean(creds)
  const settingsStore = require('./settings')
  const settings = settingsStore.load()

  tray.setToolTip(
    paired
      ? `OnOffMyPC — ${connected ? 'connected' : 'reconnecting…'}`
      : 'OnOffMyPC — not paired',
  )

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: paired ? (connected ? 'Connected' : 'Reconnecting…') : 'Not paired', enabled: false },
    { type: 'separator' },
    paired
      ? { label: 'Unpair this computer', click: unpair }
      : { label: 'Pair this computer…', click: openPairingWindow },
    {
      label: 'Enable telemetry',
      type: 'checkbox',
      checked: settings.telemetryEnabled,
      click: (item) => {
        const current = settingsStore.load()
        current.telemetryEnabled = item.checked
        settingsStore.save(current)
        if (item.checked) {
          sendTelemetryNow()
        }
      },
    },
    {
      label: 'Telemetry Settings',
      submenu: [
        {
          label: 'Report CPU load',
          type: 'checkbox',
          checked: settings.reportCpu,
          click: (item) => {
            const current = settingsStore.load()
            current.reportCpu = item.checked
            settingsStore.save(current)
            sendTelemetryNow()
          }
        },
        {
          label: 'Report RAM usage',
          type: 'checkbox',
          checked: settings.reportRam,
          click: (item) => {
            const current = settingsStore.load()
            current.reportRam = item.checked
            settingsStore.save(current)
            sendTelemetryNow()
          }
        },
        {
          label: 'Report GPU temperature',
          type: 'checkbox',
          checked: settings.reportGpu,
          click: (item) => {
            const current = settingsStore.load()
            current.reportGpu = item.checked
            settingsStore.save(current)
            sendTelemetryNow()
          }
        },
        {
          label: 'Report Wi-Fi signal',
          type: 'checkbox',
          checked: settings.reportWifi,
          click: (item) => {
            const current = settingsStore.load()
            current.reportWifi = item.checked
            settingsStore.save(current)
            sendTelemetryNow()
          }
        }
      ]
    },
    {
      label: 'Start at login',
      type: 'checkbox',
      checked: false,
      click: async (item) => { await autostart.setEnabled(item.checked) },
    },
    { type: 'separator' },
    { label: 'Run diagnostics…', click: showDiagnostics },
    { label: 'Quit', click: () => app.quit() },
  ]))

  autostart.isEnabled().then((enabled) => {
    const menu = tray.contextMenu
    if (menu) {
      const item = menu.items.find((i) => i.label === 'Start at login')
      if (item) item.checked = enabled
    }
  })
}

function openPairingWindow() {
  if (pairingWindow) {
    pairingWindow.focus()
    return
  }
  pairingWindow = new BrowserWindow({
    width: 360,
    height: 320,
    resizable: false,
    title: 'Pair this computer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  pairingWindow.setMenuBarVisibility(false)
  pairingWindow.loadFile(path.join(__dirname, '..', 'renderer', 'pairing.html'))
  pairingWindow.on('closed', () => { pairingWindow = null })
}

ipcMain.handle('pair', async (_event, code) => {
  try {
    const { deviceId, token } = await pairWithCode(API_BASE_URL, code)
    tokenStore.save({ deviceId, token, deviceName: null })
    startRelay()
    updateTrayMenu()
    setTimeout(() => pairingWindow?.close(), 1200)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

function unpair() {
  stopRelay()
  tokenStore.clear()
  updateTrayMenu()
}

function startRelay() {
  const creds = tokenStore.load()
  if (!creds) return

  stopRelay()
  relay = new DeviceRelayClient({ wsBaseUrl: WS_BASE_URL, deviceId: creds.deviceId, token: creds.token })

  relay.on('connected', () => {
    connected = true
    updateTrayMenu()
    sendTelemetryNow()
  })
  relay.on('disconnected', () => {
    connected = false
    updateTrayMenu()
  })
  relay.on('error', () => { /* surfaced via tray tooltip state, not a dialog */ })

  relay.on('settings', (settings) => {
    const settingsStore = require('./settings')
    const current = settingsStore.load()
    current.reportCpu = settings.reportCpu
    current.reportRam = settings.reportRam
    current.reportGpu = settings.reportGpu
    current.reportWifi = settings.reportWifi
    settingsStore.save(current)
    updateTrayMenu()
  })

  relay.on('command', async ({ command_id: commandId, type }) => {
    const handled = await handleCommand(type).catch(() => false)
    // Only ack what we actually did. An unhandled command (power_on, or a
    // future type this build doesn't know) is deliberately left un-acked —
    // the server's cron expires stale pending commands rather than this
    // agent inventing a "rejected" state the wire protocol has no slot for.
    if (handled) relay.sendAck(commandId)
  })

  relay.connect()

  telemetryTimer = setInterval(sendTelemetryNow, TELEMETRY_INTERVAL_MS)
}

function stopRelay() {
  if (telemetryTimer) clearInterval(telemetryTimer)
  telemetryTimer = null
  if (relay) relay.stop()
  relay = null
  connected = false
}

async function sendTelemetryNow() {
  if (!relay) return
  const settings = require('./settings').load()
  if (!settings.telemetryEnabled) return
  const reading = await collectTelemetry(settings).catch(() => null)
  if (reading) relay.sendTelemetry(reading)
}

app.on('second-instance', () => {
  if (pairingWindow) pairingWindow.focus()
})

app.whenReady().then(() => {
  // Menu-bar/tray-only app — no dock icon, no main window.
  if (app.dock) app.dock.hide()

  tray = new Tray(trayIcon())
  updateTrayMenu()

  const creds = tokenStore.load()
  if (creds) startRelay()
  else openPairingWindow()

  checkForUpdates()
})

app.on('window-all-closed', () => {
  // Tray app: stay running even with no windows open.
})
