'use strict'

const { execFile } = require('node:child_process')

// Software-side equivalents of the three commands the ESP32 relay pin can also
// perform. POWER_ON is deliberately unsupported here: if this process isn't
// running, the PC is off, and nothing in-OS can turn it back on — that job
// belongs to the firmware relay (or Wake-on-LAN, when it works). A command
// this agent can't fulfill is left un-acked; the server's cron expires it
// rather than this agent inventing a "rejected" state the protocol has no
// slot for yet.
const OS_ACTIONS = {
  linux: {
    power_off: ['systemctl', ['poweroff']],
    power_off_force: ['systemctl', ['poweroff', '-i']],
    reset: ['systemctl', ['reboot']],
  },
  win32: {
    power_off: ['shutdown', ['/s', '/t', '0']],
    power_off_force: ['shutdown', ['/s', '/f', '/t', '0']],
    reset: ['shutdown', ['/r', '/f', '/t', '0']],
  },
}

// Pure lookup, no side effects — the piece that's actually worth unit testing.
// Returns [cmd, args] or null if `type` has no action on `platform`.
function resolveAction(platform, type) {
  if (type === 'power_on') return null
  return OS_ACTIONS[platform]?.[type] ?? null
}

function runOsAction(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// Returns true if the command was recognized and executed (caller should ack),
// false if unsupported on this platform/type (caller should not ack).
async function handleCommand(type) {
  const action = resolveAction(process.platform, type)
  if (!action) return false

  const [cmd, args] = action
  await runOsAction(cmd, args)
  return true
}

module.exports = { handleCommand, resolveAction }
