import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const checkOnly = process.argv.includes("--check");

const paths = {
  package: resolve(root, "package.json"),
  tokens: resolve(root, "tokens/foundation.json"),
  states: resolve(root, "states/presentation.json"),
  content: resolve(root, "content/en.json"),
  mark: resolve(root, "assets/brand/onoffmypc-mark.svg"),
  icons: resolve(root, "assets/icons/onoff-icons.svg"),
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const [pkg, source, states, content, mark, icons] = await Promise.all([
  readJson(paths.package),
  readJson(paths.tokens),
  readJson(paths.states),
  readJson(paths.content),
  readFile(paths.mark, "utf8"),
  readFile(paths.icons, "utf8"),
]);

const fail = (message) => {
  throw new Error(message);
};

if (source.version !== pkg.version || states.version !== pkg.version || content.version !== pkg.version) {
  fail("package, token, state, and content versions must match");
}

const tokenMap = new Map();

function collectTokens(node, path = [], inheritedType) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (Object.hasOwn(node, "$value")) {
    const name = path.join(".");
    if (tokenMap.has(name)) fail(`duplicate token: ${name}`);
    tokenMap.set(name, {
      name,
      type: node.$type ?? inheritedType,
      rawValue: node.$value,
    });
    return;
  }
  const nextType = node.$type ?? inheritedType;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$") || key === "version") continue;
    collectTokens(value, [...path, key], nextType);
  }
}

collectTokens(source);

function resolveValue(value, stack = []) {
  if (typeof value !== "string") return value;
  const exactReference = value.match(/^\{([^}]+)\}$/);
  if (exactReference) {
    const target = exactReference[1];
    if (stack.includes(target)) fail(`circular token reference: ${[...stack, target].join(" -> ")}`);
    const token = tokenMap.get(target);
    if (!token) fail(`unknown token reference: ${target}`);
    return resolveValue(token.rawValue, [...stack, target]);
  }
  return value.replace(/\{([^}]+)\}/g, (_, target) => {
    const token = tokenMap.get(target);
    if (!token) fail(`unknown token reference: ${target}`);
    return String(resolveValue(token.rawValue, [...stack, target]));
  });
}

const tokens = [...tokenMap.values()].map((token) => ({
  ...token,
  value: resolveValue(token.rawValue, [token.name]),
}));

const getToken = (name) => {
  const token = tokens.find((candidate) => candidate.name === name);
  if (!token) fail(`missing required token: ${name}`);
  return token;
};

for (const token of tokens.filter(({ type }) => type === "color")) {
  if (typeof token.value !== "string" || !/^#[0-9A-F]{6}$/i.test(token.value)) {
    fail(`color token must resolve to six-digit hex: ${token.name}`);
  }
}

const requiredCommandStates = ["pending", "sent", "delivered", "expired"];
const requiredCommandActions = ["power_on", "power_off", "power_off_force", "reset"];
for (const key of requiredCommandStates) {
  if (!states.command[key]) fail(`missing command presentation: ${key}`);
  if (!content.command[key]) fail(`missing command content: ${key}`);
}
for (const key of requiredCommandActions) {
  if (!states.commandAction[key]) fail(`missing command action presentation: ${key}`);
}
if (states.commandAction.power_on.tone !== "info") {
  fail("Power On requests must use the informational tone until PC-on telemetry is observed");
}

const allowedTones = new Set([
  "positive",
  "attention",
  "critical",
  "info",
  "neutral",
  "power-on",
  "power-off",
  "power-reset",
  "danger",
]);

function validateTones(node, path = []) {
  if (!node || typeof node !== "object") return;
  if (typeof node.tone === "string" && !allowedTones.has(node.tone)) {
    fail(`unknown presentation tone at ${path.join(".")}: ${node.tone}`);
  }
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "object") validateTones(value, [...path, key]);
  }
}

validateTones(states);

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((part) => Number.parseInt(part, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const contrastPairs = [];
for (const theme of ["light", "dark"]) {
  for (const role of ["primary", "danger"]) {
    contrastPairs.push([
      `color.semantic.${theme}.action.${role}.foreground`,
      `color.semantic.${theme}.action.${role}.background`,
    ]);
  }
  for (const role of ["on", "off", "reset"]) {
    contrastPairs.push([
      `color.semantic.${theme}.power.${role}.foreground`,
      `color.semantic.${theme}.power.${role}.background`,
    ]);
  }
  for (const role of ["positive", "attention", "critical", "info", "neutral"]) {
    contrastPairs.push([
      `color.semantic.${theme}.status.${role}.foreground`,
      `color.semantic.${theme}.status.${role}.container`,
    ]);
  }
}

for (const [foregroundName, backgroundName] of contrastPairs) {
  const foreground = getToken(foregroundName).value;
  const background = getToken(backgroundName).value;
  const ratio = contrast(foreground, background);
  if (ratio < 4.5) fail(`${foregroundName} on ${backgroundName} has contrast ${ratio.toFixed(2)}:1`);
}

for (const theme of ["light", "dark"]) {
  for (const role of ["background", "foreground"]) {
    const powerOn = getToken(`color.semantic.${theme}.power.on.${role}`).value;
    const primaryAction = getToken(`color.semantic.${theme}.action.primary.${role}`).value;
    if (powerOn !== primaryAction) {
      fail(`${theme} Power On ${role} must match the primary action ${role}`);
    }
  }
}

const kebab = (value) => value
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .replace(/[^a-zA-Z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase();

const pascal = (value) => value
  .split(/[^a-zA-Z0-9]+/)
  .filter(Boolean)
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join("");

const camel = (value) => {
  const converted = pascal(value);
  return converted ? converted[0].toLowerCase() + converted.slice(1) : converted;
};

function cssValue(token) {
  const { type, value } = token;
  if (type === "dimension" || type === "duration") return `${value.value}${value.unit}`;
  if (type === "fontFamily") {
    const generic = new Set(["serif", "sans-serif", "monospace", "system-ui", "ui-monospace"]);
    return value.map((family) => generic.has(family) ? family : `"${family}"`).join(", ");
  }
  if (type === "cubicBezier") return `cubic-bezier(${value.join(", ")})`;
  return String(value);
}

const isThemeToken = ({ name }) => name.startsWith("color.semantic.") || name.startsWith("shadow.light.") || name.startsWith("shadow.dark.");
const sharedTokens = tokens.filter((token) => !isThemeToken(token));

function themeTokens(theme) {
  const colorPrefix = `color.semantic.${theme}.`;
  const shadowPrefix = `shadow.${theme}.`;
  return tokens
    .filter(({ name }) => name.startsWith(colorPrefix) || name.startsWith(shadowPrefix))
    .map((token) => ({
      ...token,
      outputName: token.name.startsWith(colorPrefix)
        ? `color.${token.name.slice(colorPrefix.length)}`
        : `shadow.${token.name.slice(shadowPrefix.length)}`,
    }));
}

function cssDeclarations(entries, outputName = ({ name }) => name) {
  return entries
    .map((token) => `  --omp-${kebab(outputName(token))}: ${cssValue(token)};`)
    .join("\n");
}

const lightTokens = themeTokens("light");
const darkTokens = themeTokens("dark");
const cssHeader = `/* Generated from @onoffmypc/design ${pkg.version}. Do not edit. */`;
const webTokens = `${cssHeader}
:root {
${cssDeclarations(sharedTokens)}
}

:root,
:root[data-theme="light"] {
${cssDeclarations(lightTokens, ({ outputName }) => outputName)}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${cssDeclarations(darkTokens, ({ outputName }) => outputName).split("\n").map((line) => `  ${line}`).join("\n")}
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${cssDeclarations(darkTokens, ({ outputName }) => outputName)}
  color-scheme: dark;
}
`;

const webStates = `${cssHeader}
.omp-status,
[data-omp-tone] {
  display: inline-flex;
  align-items: center;
  gap: var(--omp-space-1);
  min-height: 24px;
  border-radius: var(--omp-radius-pill);
  padding: 2px var(--omp-space-2);
  color: var(--omp-tone-foreground);
  background: var(--omp-tone-container);
  font-size: var(--omp-font-size-caption);
  font-weight: var(--omp-font-weight-semibold);
  line-height: 1.35;
}

[data-omp-tone="positive"] { --omp-tone-foreground: var(--omp-color-status-positive-foreground); --omp-tone-container: var(--omp-color-status-positive-container); }
[data-omp-tone="attention"] { --omp-tone-foreground: var(--omp-color-status-attention-foreground); --omp-tone-container: var(--omp-color-status-attention-container); }
[data-omp-tone="critical"] { --omp-tone-foreground: var(--omp-color-status-critical-foreground); --omp-tone-container: var(--omp-color-status-critical-container); }
[data-omp-tone="info"] { --omp-tone-foreground: var(--omp-color-status-info-foreground); --omp-tone-container: var(--omp-color-status-info-container); }
[data-omp-tone="neutral"] { --omp-tone-foreground: var(--omp-color-status-neutral-foreground); --omp-tone-container: var(--omp-color-status-neutral-container); }
`;

const webA11y = `${cssHeader}
[data-contrast="more"] {
  --omp-color-border-default: var(--omp-color-border-strong);
  --omp-color-text-secondary: var(--omp-color-text-primary);
}
[data-contrast="more"] a { text-decoration: underline; }
[data-contrast="more"] :focus-visible { outline-width: 4px; }

[data-motion="reduce"] *,
[data-motion="reduce"] *::before,
[data-motion="reduce"] *::after {
  scroll-behavior: auto !important;
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
}

@media (forced-colors: active) {
  :root { --omp-color-focus-ring: Highlight; }
  button, .button-link { border: 1px solid ButtonText; }
}

[data-forced-colors="preview"] {
  --omp-color-background-canvas: Canvas;
  --omp-color-background-surface: Canvas;
  --omp-color-background-subtle: Canvas;
  --omp-color-text-primary: CanvasText;
  --omp-color-text-secondary: CanvasText;
  --omp-color-text-link: LinkText;
  --omp-color-border-default: CanvasText;
  --omp-color-border-strong: CanvasText;
  --omp-color-action-primary-background: ButtonFace;
  --omp-color-action-primary-foreground: ButtonText;
  --omp-color-focus-ring: Highlight;
}
[data-forced-colors="preview"] * { box-shadow: none !important; }
`;

function colorLiteral(hex) {
  return `Color(0xFF${hex.slice(1).toUpperCase()})`;
}

function themeColorEntries(theme) {
  const prefix = `color.semantic.${theme}.`;
  return tokens
    .filter(({ name, type }) => type === "color" && name.startsWith(prefix))
    .map((token) => ({ name: token.name.slice(prefix.length), value: token.value }));
}

const kotlinThemeProperties = themeColorEntries("light").map(({ name }) => `    val ${camel(name)}: Color,`).join("\n");
const kotlinThemeValues = (theme) => themeColorEntries(theme).map(({ name, value }) => `    ${camel(name)} = ${colorLiteral(value)},`).join("\n");
const dimensionTokens = (prefix) => tokens.filter(({ name, type }) => name.startsWith(prefix) && type === "dimension");

const kotlinTokens = `// Generated from @onoffmypc/design ${pkg.version}. Do not edit.
package com.onoffmypc.design.generated

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Immutable
data class OnOffColorScheme(
${kotlinThemeProperties}
)

val OnOffLightColors = OnOffColorScheme(
${kotlinThemeValues("light")}
)

val OnOffDarkColors = OnOffColorScheme(
${kotlinThemeValues("dark")}
)

object OnOffSpacing {
${dimensionTokens("space.").map(({ name, value }) => `    val x${name.slice("space.".length)} = ${value.value}.dp`).join("\n")}
}

object OnOffRadius {
${dimensionTokens("radius.").map(({ name, value }) => `    val ${camel(name.slice("radius.".length))} = ${value.value}.dp`).join("\n")}
}

object OnOffControlSize {
${dimensionTokens("size.control.").map(({ name, value }) => `    val ${camel(name.slice("size.control.".length))} = ${value.value}.dp`).join("\n")}
}
`;

const stateRows = Object.entries(states.command).map(([key, value]) =>
  `    "${key}" to OnOffStatePresentation("${value.label.replaceAll('"', '\\"')}", OnOffTone.${pascal(value.tone)}, "${value.icon}"),`
).join("\n");

const kotlinStates = `// Generated from @onoffmypc/design ${pkg.version}. Do not edit.
package com.onoffmypc.design.generated

enum class OnOffTone { ${[...allowedTones].map(pascal).join(", ")} }

data class OnOffStatePresentation(
    val label: String,
    val tone: OnOffTone,
    val icon: String,
)

val OnOffCommandStates = mapOf(
${stateRows}
)
`;

function swiftColor(hex) {
  return `Color(ompHex: 0x${hex.slice(1).toUpperCase()})`;
}

const swiftProperties = themeColorEntries("light").map(({ name }) => `    let ${camel(name)}: Color`).join("\n");
const swiftValues = (theme) => themeColorEntries(theme).map(({ name, value }) => `        ${camel(name)}: ${swiftColor(value)}`).join(",\n");
const swiftTokens = `// Generated from @onoffmypc/design ${pkg.version}. Do not edit.
import SwiftUI

struct OnOffColorScheme {
${swiftProperties}

    static let light = OnOffColorScheme(
${swiftValues("light")}
    )

    static let dark = OnOffColorScheme(
${swiftValues("dark")}
    )
}

enum OnOffSpacing {
${dimensionTokens("space.").map(({ name, value }) => `    static let x${name.slice("space.".length)}: CGFloat = ${value.value}`).join("\n")}
}

enum OnOffRadius {
${dimensionTokens("radius.").map(({ name, value }) => `    static let ${camel(name.slice("radius.".length))}: CGFloat = ${value.value}`).join("\n")}
}

private extension Color {
    init(ompHex: UInt32) {
        self.init(
            red: Double((ompHex >> 16) & 0xff) / 255,
            green: Double((ompHex >> 8) & 0xff) / 255,
            blue: Double(ompHex & 0xff) / 255
        )
    }
}
`;

const swiftStateRows = Object.entries(states.command).map(([key, value]) =>
  `        "${key}": OnOffStatePresentation(label: "${value.label.replaceAll('"', '\\"')}", tone: .${camel(value.tone)}, icon: "${value.icon}")`
).join(",\n");
const swiftStates = `// Generated from @onoffmypc/design ${pkg.version}. Do not edit.
import Foundation

enum OnOffTone: String { ${[...allowedTones].map((tone) => `case ${camel(tone)} = "${tone}"`).join("; ")} }

struct OnOffStatePresentation {
    let label: String
    let tone: OnOffTone
    let icon: String
}

let onOffCommandStates: [String: OnOffStatePresentation] = [
${swiftStateRows}
]
`;

const dark = Object.fromEntries(themeColorEntries("dark").map(({ name, value }) => [name, value]));
const firmwareHeader = `// Generated from @onoffmypc/design ${pkg.version}. Do not edit.
#pragma once

#define OMP_COLOR_BACKGROUND "${dark["background.canvas"]}"
#define OMP_COLOR_SURFACE "${dark["background.surface"]}"
#define OMP_COLOR_SURFACE_SUBTLE "${dark["background.subtle"]}"
#define OMP_COLOR_BORDER "${dark["border.default"]}"
#define OMP_COLOR_TEXT "${dark["text.primary"]}"
#define OMP_COLOR_TEXT_SECONDARY "${dark["text.secondary"]}"
#define OMP_COLOR_LINK "${dark["text.link"]}"
#define OMP_COLOR_ACTION "${dark["action.primary.background"]}"
#define OMP_COLOR_ACTION_TEXT "${dark["action.primary.foreground"]}"
#define OMP_COLOR_FOCUS "${dark["focus.ring"]}"
#define OMP_COLOR_SUCCESS "${dark["status.positive.foreground"]}"
#define OMP_COLOR_SUCCESS_CONTAINER "${dark["status.positive.container"]}"
#define OMP_COLOR_DANGER "${dark["status.critical.foreground"]}"
#define OMP_SETUP_THEME_CSS ":root{--omp-bg:${dark["background.canvas"]};--omp-surface:${dark["background.surface"]};--omp-surface-subtle:${dark["background.subtle"]};--omp-border:${dark["border.default"]};--omp-text:${dark["text.primary"]};--omp-muted:${dark["text.secondary"]};--omp-link:${dark["text.link"]};--omp-action:${dark["action.primary.background"]};--omp-action-text:${dark["action.primary.foreground"]};--omp-focus:${dark["focus.ring"]};--omp-success:${dark["status.positive.foreground"]};--omp-success-container:${dark["status.positive.container"]};--omp-danger:${dark["status.critical.foreground"]}}"
`;

const light = Object.fromEntries(themeColorEntries("light").map(({ name, value }) => [name, value]));
const emailTokens = `// Generated from @onoffmypc/design ${pkg.version}. Do not edit.
export const onOffEmailTokens = Object.freeze(${JSON.stringify({
  background: light["background.canvas"],
  surface: light["background.surface"],
  border: light["border.default"],
  text: light["text.primary"],
  muted: light["text.secondary"],
  action: light["action.primary.background"],
  actionText: light["action.primary.foreground"],
  positive: light["status.positive.foreground"],
  danger: light["status.critical.foreground"],
  radius: 12,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}, null, 2)} as const);
`;

const outputs = new Map([
  ["dist/web/onoffmypc-tokens.css", webTokens],
  ["dist/web/onoffmypc-states.css", webStates],
  ["dist/web/onoffmypc-a11y.css", webA11y],
  ["dist/web/states.json", `${JSON.stringify(states, null, 2)}\n`],
  ["dist/web/content.en.json", `${JSON.stringify(content, null, 2)}\n`],
  ["dist/compose/OnOffTokens.kt", kotlinTokens],
  ["dist/compose/OnOffStates.kt", kotlinStates],
  ["dist/swift/OnOffTokens.swift", swiftTokens],
  ["dist/swift/OnOffStates.swift", swiftStates],
  ["dist/firmware/onoff_design_tokens.h", firmwareHeader],
  ["dist/email/onoffEmailTokens.ts", emailTokens],
  ["dist/assets/onoffmypc-mark.svg", mark],
  ["dist/assets/onoff-icons.svg", icons],
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = {
  $schema: "../schema/generated-manifest.schema.json",
  designVersion: pkg.version,
  generatedAt: "deterministic",
  sources: Object.fromEntries(await Promise.all(
    Object.entries(paths).filter(([key]) => !["package"].includes(key)).map(async ([key, path]) => [key, sha256(await readFile(path))]),
  )),
  artifacts: Object.fromEntries([...outputs].map(([path, value]) => [path.replace("dist/", ""), sha256(value)])),
};
outputs.set("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

const stale = [];
for (const [relativePath, value] of outputs) {
  const path = resolve(root, relativePath);
  if (checkOnly) {
    try {
      const existing = await readFile(path, "utf8");
      if (existing !== value) stale.push(relativePath);
    } catch {
      stale.push(relativePath);
    }
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, value);
  }
}

if (stale.length) fail(`generated artifacts are stale:\n${stale.map((path) => `- ${path}`).join("\n")}`);
console.log(checkOnly ? `Design artifacts are current (${pkg.version}).` : `Generated design artifacts ${pkg.version}.`);
