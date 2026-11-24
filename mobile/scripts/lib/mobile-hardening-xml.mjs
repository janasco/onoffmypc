#!/usr/bin/env node
/**
 * Tiny namespace-agnostic XML reader for Android manifest/resource files.
 *
 * Android build files use a small, well-formed XML subset. This parser handles
 * comments, XML declarations, single/double-quoted attributes, arbitrary
 * attribute order/whitespace, self-closing tags, and hyphenated element names
 * such as `uses-permission-sdk-23` and `data-extraction-rules` without pulling
 * in a dependency.
 */

function stripComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '')
}

function parseAttributes(raw) {
  const attributes = Object.create(null)
  const pattern =
    /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match
  while ((match = pattern.exec(raw)) !== null) {
    attributes[match[1]] = match[2] ?? match[3]
  }
  return attributes
}

/** Parse XML into `{ name, attributes, children }` nodes. */
export function parseXml(source) {
  const document = { name: '#document', attributes: {}, children: [] }
  const stack = [document]
  const clean = stripComments(source).replace(/<\?[\s\S]*?\?>/g, '')
  const token =
    /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g

  let match
  while ((match = token.exec(clean)) !== null) {
    // Text node: nothing to model for the checks in this gate.
    if (match[5] !== undefined) continue

    const [, closing, name, rawAttributes, selfClosing] = match
    if (closing) {
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].name === name) {
          stack.length = index
          break
        }
      }
      continue
    }

    const node = {
      name,
      attributes: parseAttributes(rawAttributes),
      children: [],
    }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }

  return document
}

export function findAll(node, name) {
  const matches = []
  const visit = (current) => {
    for (const child of current.children) {
      if (child.name === name) matches.push(child)
      visit(child)
    }
  }
  visit(node)
  return matches
}

export function findDirect(node, name) {
  return node.children.find((child) => child.name === name)
}

export function attr(node, name) {
  return node?.attributes?.[name]
}

export function isTrueAttr(node, name) {
  return (attr(node, name) ?? '').toLowerCase() === 'true'
}
