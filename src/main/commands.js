'use strict'

const { execFile } = require('node:child_process')
const { existsSync } = require('node:fs')
const { win32: winPath } = require('node:path')

// Software-side equivalents of the three commands the ESP32 relay pin can also
// perform. POWER_ON is deliberately unsupported here: if this process isn't
// running, the PC is off, and nothing in-OS can turn it back on — that job
// belongs to the firmware relay (or Wake-on-LAN, when it works). A command
// this agent can't fulfill is left un-acked; the server's cron expires it
// rather than this agent inventing a "rejected" state the protocol has no
// slot for yet.
//
// Every executable below is resolved to a fixed, absolute system path (never
// looked up on PATH) and run with a minimal, explicitly-built environment
// (never `process.env`) — a destructive command must not be resolvable to,
// or influenced by, anything a lower-privileged process on this machine could
// place ahead of it on PATH or inject via LD_PRELOAD/LD_LIBRARY_PATH.

function systemRoot() {
  return process.env.SystemRoot || 'C:\\Windows'
}

function linuxEnv() {
  return { PATH: '/usr/bin:/bin' }
}

function windowsEnv() {
  const root = systemRoot()
  return {
    SystemRoot: root,
    windir: root,
    ComSpec: winPath.join(root, 'System32', 'cmd.exe'),
    PATH: winPath.join(root, 'System32'),
  }
}

// Pure candidate table: absolute-path candidates (checked in order — some
// distros only have one of /usr/bin or /bin) plus arguments. No filesystem
// access here, so this is directly unit-testable on any host/platform.
function commandSpec(platform, type) {
  if (type === 'power_on') return null
  if (platform === 'linux') {
    const table = {
      power_off: [['/usr/bin/systemctl', '/bin/systemctl'], ['poweroff']],
      power_off_force: [['/usr/bin/systemctl', '/bin/systemctl'], ['poweroff', '-i']],
      reset: [['/usr/bin/systemctl', '/bin/systemctl'], ['reboot']],
      sleep: [['/usr/bin/systemctl', '/bin/systemctl'], ['suspend']],
      lock: [['/usr/bin/loginctl', '/bin/loginctl'], ['lock-session']],
      logout: [['/usr/bin/loginctl', '/bin/loginctl'], ['terminate-session', '']],
    }
    const entry = table[type]
    return entry ? { candidates: entry[0], args: entry[1], env: linuxEnv() } : null
  }
  if (platform === 'win32') {
    const shutdownExe = winPath.join(systemRoot(), 'System32', 'shutdown.exe')
    const rundll32Exe = winPath.join(systemRoot(), 'System32', 'rundll32.exe')
    const table = {
      power_off: [[shutdownExe], ['/s', '/t', '0']],
      power_off_force: [[shutdownExe], ['/s', '/f', '/t', '0']],
      reset: [[shutdownExe], ['/r', '/f', '/t', '0']],
      // No dedicated shutdown.exe flag for sleep — this is the standard
      // Hibernate=0, Force=1, DisableWakeEvent=0 incantation via powrprof.dll.
      sleep: [[rundll32Exe], ['powrprof.dll,SetSuspendState', '0,1,0']],
      lock: [[rundll32Exe], ['user32.dll,LockWorkStation']],
      logout: [[shutdownExe], ['/l']],
    }
    const entry = table[type]
    return entry ? { candidates: entry[0], args: entry[1], env: windowsEnv() } : null
  }
  return null
}

// Returns the first candidate that actually exists, or null. `exists` is
// injectable so this fail-closed behavior is testable without depending on
// what happens to be installed on the machine running the test suite.
function resolveExecutable(candidates, exists = existsSync) {
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate
  }
  return null
}

// Resolves canonical-path candidates against the real filesystem and returns
// [cmd, args, env], or null if `type` has no action on `platform`, or none of
// its candidate binaries exist on this machine (fails closed rather than
// falling back to a PATH lookup).
function resolveAction(platform, type, exists = existsSync) {
  const spec = commandSpec(platform, type)
  if (!spec) return null
  const cmd = resolveExecutable(spec.candidates, exists)
  if (!cmd) return null
  return [cmd, spec.args, spec.env]
}

function runOsAction(cmd, args, env) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { env }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// Returns true if the command was recognized and executed (caller should ack),
// false if unsupported on this platform/type, or its canonical binary is
// missing on this machine (caller should not ack).
async function handleCommand(type) {
  const action = resolveAction(process.platform, type)
  if (!action) return false

  const [cmd, args, env] = action
  await runOsAction(cmd, args, env)
  return true
}

module.exports = { handleCommand, resolveAction, resolveExecutable, commandSpec }
