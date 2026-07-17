'use strict'

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

// Reading shape matches TelemetryMsg on the server (device_id comes from the
// WS path, not the payload). pc_on is always true — if this process is
// running and reporting, the PC it's running on is, by definition, on.
async function collectTelemetry() {
  const [load, mem, gpuTemp, rssi] = await Promise.all([
    si.currentLoad().catch(() => null),
    si.mem().catch(() => null),
    readGpuTemp(),
    readWifiSignal(),
  ])

  return {
    pc_on: true,
    cpu_load: load ? clampOrNull(load.currentLoad, 0, 100) : null,
    ram_used_mb: mem ? clampOrNull(mem.active / BYTES_PER_MB, 0, 1_000_000) : null,
    ram_total_mb: mem ? clampOrNull(mem.total / BYTES_PER_MB, 0, 1_000_000) : null,
    gpu_temp: clampOrNull(gpuTemp, -50, 150),
    rssi: clampOrNull(rssi, -120, 0),
    firmware_version: `desktop-agent ${require('../../package.json').version} (${process.platform})`,
  }
}

module.exports = { collectTelemetry, clampOrNull }
