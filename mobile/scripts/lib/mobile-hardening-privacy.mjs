#!/usr/bin/env node
/**
 * Structural checks for the committed iOS privacy manifest.
 *
 * The manifest is a small plist, but substring checks cannot prove that a
 * collected-data entry is linked, is not used for tracking, or carries the
 * reviewed purpose. This module parses the committed XML into dictionaries,
 * arrays, strings, and booleans, then validates the reviewed set.
 *
 * Adding a data type, purpose, or tracking flag requires a source review and an
 * update to the constants and documentation alongside this file.
 */

const APP_FUNCTIONALITY_PURPOSE = 'NSPrivacyCollectedDataTypePurposeAppFunctionality'

/** Reviewed data types sent by the mobile clients; see the privacy inventory. */
export const expectedCollectedDataTypes = Object.freeze([
  'NSPrivacyCollectedDataTypeEmailAddress',
  'NSPrivacyCollectedDataTypeUserID',
  'NSPrivacyCollectedDataTypeDeviceID',
  'NSPrivacyCollectedDataTypeOtherUserContent',
  'NSPrivacyCollectedDataTypePurchaseHistory',
  'NSPrivacyCollectedDataTypeProductInteraction',
  'NSPrivacyCollectedDataTypeOtherUsageData',
  'NSPrivacyCollectedDataTypeOtherDiagnosticData',
])

/** Only App Functionality is reviewed; no analytics, advertising, or other purpose exists. */
const allowedPurposes = new Set([APP_FUNCTIONALITY_PURPOSE])

/** Card and credit data never reach the app; Polar's hosted page handles payment entry. */
const forbiddenDataTypes = new Set([
  'NSPrivacyCollectedDataTypePaymentInfo',
  'NSPrivacyCollectedDataTypeCreditInfo',
])

function stripComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '')
}

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity) => {
    if (entity.startsWith('#x')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16))
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10))
    }
    switch (entity) {
      case 'lt': return '<'
      case 'gt': return '>'
      case 'amp': return '&'
      case 'quot': return '"'
      case 'apos': return "'"
      default: return match
    }
  })
}

function parseXmlTree(source) {
  const document = { name: '#document', text: '', children: [] }
  const stack = [document]
  const clean = stripComments(source)
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  const token = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g

  let match
  while ((match = token.exec(clean)) !== null) {
    if (match[5] !== undefined) {
      stack[stack.length - 1].text += decodeEntities(match[5])
      continue
    }

    const [, closing, name, , selfClosing] = match
    if (closing) {
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].name === name) {
          stack.length = index
          break
        }
      }
      continue
    }

    const node = { name, text: '', children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }

  return document
}

function toValue(node) {
  switch (node.name) {
    case 'dict': {
      const value = Object.create(null)
      for (let index = 0; index < node.children.length; index += 2) {
        const key = node.children[index]
        const child = node.children[index + 1]
        if (!key || key.name !== 'key' || !child) {
          throw new Error('malformed <dict> entry')
        }
        value[key.text.trim()] = toValue(child)
      }
      return value
    }
    case 'array':
      return node.children.map(toValue)
    case 'string':
      return node.text.trim()
    case 'true':
      return true
    case 'false':
      return false
    case 'integer':
    case 'real':
      return Number(node.text.trim())
    default:
      throw new Error(`unsupported plist element <${node.name}>`)
  }
}

/** Parse the committed plist subset into plain JavaScript values. */
export function parsePlist(source) {
  const document = parseXmlTree(source)
  const plist = document.children.find((node) => node.name === 'plist')
  if (!plist) throw new Error('missing <plist> root')
  const value = plist.children[0]
  if (!value) throw new Error('empty <plist> root')
  return toValue(value)
}

function isDictionary(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validate the reviewed iOS privacy manifest.
 * @param {string} source
 * @returns {string[]} human-readable failures
 */
export function validateIosPrivacyManifest(source) {
  const failures = []
  let manifest

  try {
    manifest = parsePlist(source)
  } catch (error) {
    return [`privacy manifest is not a valid plist: ${error.message}`]
  }

  if (!isDictionary(manifest)) {
    return ['privacy manifest must contain a top-level dictionary']
  }

  if (manifest.NSPrivacyTracking !== false) {
    failures.push('NSPrivacyTracking must be false')
  }
  if (
    !Array.isArray(manifest.NSPrivacyTrackingDomains) ||
    manifest.NSPrivacyTrackingDomains.length !== 0
  ) {
    failures.push('NSPrivacyTrackingDomains must be an empty array')
  }

  const accessedAPITypes = manifest.NSPrivacyAccessedAPITypes
  const userDefaults = Array.isArray(accessedAPITypes)
    ? accessedAPITypes.find(
        (entry) =>
          isDictionary(entry) &&
          entry.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPICategoryUserDefaults',
      )
    : undefined
  if (!userDefaults) {
    failures.push('NSPrivacyAccessedAPICategoryUserDefaults is not declared')
  } else if (
    !Array.isArray(userDefaults.NSPrivacyAccessedAPITypeReasons) ||
    !userDefaults.NSPrivacyAccessedAPITypeReasons.includes('CA92.1')
  ) {
    failures.push('UserDefaults must declare the app-only reason CA92.1')
  }

  const collected = manifest.NSPrivacyCollectedDataTypes
  if (!Array.isArray(collected)) {
    failures.push('NSPrivacyCollectedDataTypes must be an array')
    return failures
  }
  if (collected.length === 0) {
    failures.push('NSPrivacyCollectedDataTypes must not be empty')
    return failures
  }

  const seen = new Set()
  for (const entry of collected) {
    if (!isDictionary(entry)) {
      failures.push('each collected-data entry must be a dictionary')
      continue
    }

    const type = entry.NSPrivacyCollectedDataType
    if (typeof type !== 'string' || type.length === 0) {
      failures.push('each collected-data entry must declare NSPrivacyCollectedDataType')
      continue
    }
    if (forbiddenDataTypes.has(type)) {
      failures.push(`${type} is forbidden: the app does not collect card or credit data`)
    }
    if (seen.has(type)) {
      failures.push(`${type} is declared more than once`)
    }
    seen.add(type)

    if (entry.NSPrivacyCollectedDataTypeLinked !== true) {
      failures.push(`${type} must be linked to the account`)
    }
    if (entry.NSPrivacyCollectedDataTypeTracking !== false) {
      failures.push(`${type} must not be used for tracking`)
    }

    const purposes = entry.NSPrivacyCollectedDataTypePurposes
    if (!Array.isArray(purposes) || !purposes.includes(APP_FUNCTIONALITY_PURPOSE)) {
      failures.push(`${type} must declare App Functionality`)
    }
    if (Array.isArray(purposes)) {
      for (const purpose of purposes) {
        if (!allowedPurposes.has(purpose)) {
          failures.push(`${type} declares an unreviewed purpose: ${purpose}`)
        }
      }
    }
  }

  for (const type of expectedCollectedDataTypes) {
    if (!seen.has(type)) failures.push(`missing collected data type: ${type}`)
  }
  for (const type of seen) {
    if (!expectedCollectedDataTypes.includes(type)) {
      failures.push(`unreviewed collected data type: ${type}`)
    }
  }

  return failures
}
