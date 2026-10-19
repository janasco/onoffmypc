'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { commandSpec, resolveExecutable, resolveAction } = require('../src/main/commands')

test('power_on has no action on any platform — firmware/WoL only', () => {
  assert.equal(commandSpec('linux', 'power_on'), null)
  assert.equal(commandSpec('win32', 'power_on'), null)
})

test('linux maps power_off/power_off_force/reset to canonical systemctl candidates', () => {
  assert.deepEqual(commandSpec('linux', 'power_off').candidates, ['/usr/bin/systemctl', '/bin/systemctl'])
  assert.deepEqual(commandSpec('linux', 'power_off').args, ['poweroff'])
  assert.deepEqual(commandSpec('linux', 'power_off_force').args, ['poweroff', '-i'])
  assert.deepEqual(commandSpec('linux', 'reset').args, ['reboot'])
})

test('linux commands run with a minimal explicit PATH, not process.env', () => {
  assert.deepEqual(commandSpec('linux', 'power_off').env, { PATH: '/usr/bin:/bin' })
})

test('win32 maps power_off/power_off_force/reset to an absolute System32 shutdown.exe', () => {
  const spec = commandSpec('win32', 'power_off')
  assert.match(spec.candidates[0], /\\System32\\shutdown\.exe$/)
  assert.deepEqual(spec.args, ['/s', '/t', '0'])
  assert.deepEqual(commandSpec('win32', 'power_off_force').args, ['/s', '/f', '/t', '0'])
  assert.deepEqual(commandSpec('win32', 'reset').args, ['/r', '/f', '/t', '0'])
})

test('sleep maps to systemctl suspend on linux and SetSuspendState via rundll32 on win32', () => {
  assert.deepEqual(commandSpec('linux', 'sleep').args, ['suspend'])
  const spec = commandSpec('win32', 'sleep')
  assert.match(spec.candidates[0], /\\System32\\rundll32\.exe$/)
  assert.deepEqual(spec.args, ['powrprof.dll,SetSuspendState', '0,1,0'])
})

test('lock maps to loginctl on linux and LockWorkStation via rundll32 on win32', () => {
  assert.deepEqual(commandSpec('linux', 'lock').candidates, ['/usr/bin/loginctl', '/bin/loginctl'])
  assert.deepEqual(commandSpec('linux', 'lock').args, ['lock-session'])
  assert.deepEqual(commandSpec('win32', 'lock').args, ['user32.dll,LockWorkStation'])
})

test('logout maps to loginctl on linux and shutdown /l on win32', () => {
  assert.deepEqual(commandSpec('linux', 'logout').args, ['terminate-session', ''])
  assert.deepEqual(commandSpec('win32', 'logout').args, ['/l'])
})

test('unsupported platform (e.g. darwin) resolves to null, not a crash', () => {
  assert.equal(commandSpec('darwin', 'power_off'), null)
})

test('unknown command type resolves to null', () => {
  assert.equal(commandSpec('linux', 'do_a_barrel_roll'), null)
})

test('resolveExecutable returns the first candidate that exists', () => {
  const exists = (p) => p === '/bin/systemctl'
  assert.equal(resolveExecutable(['/usr/bin/systemctl', '/bin/systemctl'], exists), '/bin/systemctl')
})

test('resolveExecutable fails closed (null) when no candidate exists — never falls back to PATH', () => {
  const exists = () => false
  assert.equal(resolveExecutable(['/usr/bin/systemctl', '/bin/systemctl'], exists), null)
})

test('resolveAction fails closed when the canonical binary is missing on this machine', () => {
  assert.equal(resolveAction('linux', 'power_off', () => false), null)
})

test('resolveAction resolves to the canonical absolute path plus args/env when present', () => {
  const exists = (p) => p === '/usr/bin/systemctl'
  assert.deepEqual(
    resolveAction('linux', 'power_off', exists),
    ['/usr/bin/systemctl', ['poweroff'], { PATH: '/usr/bin:/bin' }],
  )
})
