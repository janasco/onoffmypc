'use strict'

const os = require('node:os')
const si = require('systeminformation')

const BYTES_PER_MB = 1024 * 1024

// Mirrors sanitizeTelemetry's bounds server-side (onoffmypc-app/src/utils/telemetry.ts) —
// clamp here too so a flaky sensor reading never gets silently dropped as "out of range"
// without at least being visible in local agent logs.
function clampOrNull(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return value
}

async function readGpuTemp() {
  try {
    const graphics = await si.graphics()
    const withTemp = graphics.controllers.find((c) => typeof c.temperatureGpu === 'number')
    return withTemp ? withTemp.temperatureGpu : null
  } catch {
    return null
  }
}

async function readWifiSignal() {
  try {
    const connections = await si.wifiConnections()
    const active = connections.find((c) => typeof c.signalLevel === 'number')
    return active ? active.signalLevel : null
  } catch {
    return null
  }
}

// Pick a usable non-internal IPv4 interface. Prefer the OS default route, then
// the first usable one. Pure so it can be unit-tested without the host's NICs.
function pickNetworkIdentity(interfaces) {
  const list = Array.isArray(interfaces) ? interfaces : [interfaces]
  const usable = list.filter((i) => i && !i.internal
    && typeof i.ip4 === 'string' && i.ip4 && !i.ip4.startsWith('169.254.')
    && typeof i.mac === 'string' && i.mac && i.mac !== '00:00:00:00:00:00')
  // Prefer the OS default route, then a physical interface, then whatever is
  // left. Without the physical preference the first entry is often a Docker or
  // VPN adapter rather than the LAN address a user would recognize.
  const preferred = usable.find((i) => i.default === true)
    || usable.find((i) => i.virtual !== true)
    || usable[0]
  return {
    local_ip: preferred ? preferred.ip4 : null,
    mac_address: preferred ? preferred.mac : null,
  }
}

async function readNetworkIdentity() {
  try {
    return pickNetworkIdentity(await si.networkInterfaces())
  } catch {
    return { local_ip: null, mac_address: null }
  }
}

// Reading shape matches TelemetryMsg on the server (device_id comes from the
// WS path, not the payload). pc_on is always true — if this process is
// running and reporting, the PC it's running on is, by definition, on.
async function collectTelemetry(settings = {}) {
  const [load, mem, gpuTemp, rssi, network] = await Promise.all([
    settings.reportCpu !== false ? si.currentLoad().catch(() => null) : null,
    settings.reportRam !== false ? si.mem().catch(() => null) : null,
    settings.reportGpu !== false ? readGpuTemp() : null,
    settings.reportWifi !== false ? readWifiSignal() : null,
    readNetworkIdentity(),
  ])

  return {
    pc_on: true,
    cpu_load: load ? clampOrNull(load.currentLoad, 0, 100) : null,
    ram_used_mb: mem ? clampOrNull(mem.active / BYTES_PER_MB, 0, 1_000_000) : null,
    ram_total_mb: mem ? clampOrNull(mem.total / BYTES_PER_MB, 0, 1_000_000) : null,
    gpu_temp: clampOrNull(gpuTemp, -50, 150),
    rssi: clampOrNull(rssi, -120, 0),
    firmware_version: `desktop-agent ${require('../../package.json').version} (${process.platform})`,
    platform: process.platform,
    hostname: os.hostname(),
    local_ip: network.local_ip,
    mac_address: network.mac_address,
  }
}

module.exports = { collectTelemetry, clampOrNull, pickNetworkIdentity }
