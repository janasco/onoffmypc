'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveAction } = require('../src/main/commands')

test('power_on has no action on any platform — firmware/WoL only', () => {
  assert.equal(resolveAction('linux', 'power_on'), null)
  assert.equal(resolveAction('win32', 'power_on'), null)
})

test('linux maps power_off/power_off_force/reset to systemctl', () => {
  assert.deepEqual(resolveAction('linux', 'power_off'), ['systemctl', ['poweroff']])
  assert.deepEqual(resolveAction('linux', 'power_off_force'), ['systemctl', ['poweroff', '-i']])
  assert.deepEqual(resolveAction('linux', 'reset'), ['systemctl', ['reboot']])
})

test('win32 maps power_off/power_off_force/reset to shutdown.exe', () => {
  assert.deepEqual(resolveAction('win32', 'power_off'), ['shutdown', ['/s', '/t', '0']])
  assert.deepEqual(resolveAction('win32', 'power_off_force'), ['shutdown', ['/s', '/f', '/t', '0']])
  assert.deepEqual(resolveAction('win32', 'reset'), ['shutdown', ['/r', '/f', '/t', '0']])
})

test('sleep maps to systemctl suspend on linux and SetSuspendState on win32', () => {
  assert.deepEqual(resolveAction('linux', 'sleep'), ['systemctl', ['suspend']])
  assert.deepEqual(resolveAction('win32', 'sleep'), ['rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']])
})

test('lock maps to loginctl on linux and LockWorkStation on win32', () => {
  assert.deepEqual(resolveAction('linux', 'lock'), ['loginctl', ['lock-session']])
  assert.deepEqual(resolveAction('win32', 'lock'), ['rundll32.exe', ['user32.dll,LockWorkStation']])
})

test('logout maps to loginctl on linux and shutdown /l on win32', () => {
  assert.deepEqual(resolveAction('linux', 'logout'), ['loginctl', ['terminate-session', '']])
  assert.deepEqual(resolveAction('win32', 'logout'), ['shutdown', ['/l']])
})

test('unsupported platform (e.g. darwin) resolves to null, not a crash', () => {
  assert.equal(resolveAction('darwin', 'power_off'), null)
})

test('unknown command type resolves to null', () => {
  assert.equal(resolveAction('linux', 'do_a_barrel_roll'), null)
})
