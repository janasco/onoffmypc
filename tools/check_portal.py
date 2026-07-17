#!/usr/bin/env python3
"""Static contract checks for the offline captive-portal UI."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "src" / "main.cpp").read_text(encoding="utf-8")
TOKENS = (ROOT / "src" / "generated" / "onoff_design_tokens.h").read_text(
    encoding="utf-8"
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"portal check failed: {message}")


portal_start = SOURCE.index("// ── Provisioning portal")
portal_end = SOURCE.index("// ── Globals", portal_start)
portal = SOURCE[portal_start:portal_end]

require(SOURCE.count('R"HTML(') == SOURCE.count(')HTML"'), "unbalanced HTML raw strings")
require(portal.count("OMP_SETUP_THEME_CSS") == 2, "both portal pages must consume generated tokens")
require('<meta name="viewport"' in portal, "responsive viewport is required")
require("min-height:48px" in portal, "form controls must retain 48px touch targets")
require("min-height:44px" in portal, "secondary disclosure must retain a 44px touch target")
require("prefers-reduced-motion:reduce" in portal, "reduced-motion support is required")
require('role="status" aria-live="polite"' in portal, "network scan feedback must be announced")
require('aria-busy' in portal, "network scan busy state must be exposed")
require('role="alert"' in portal, "form validation errors must be announced")
require("aria-errormessage" in portal, "custom form errors must identify their message")
require("reportValidity()" in portal, "native form constraints must be reported")
require('pattern="[0-9]{6}"' in portal, "setup PIN must declare its six-digit format")
require("PC state" not in portal, "setup completion must not invent PC power state")
require("WiFi" not in portal, "visible copy must use the standard Wi-Fi spelling")

for forbidden in ('<script src=', '<link rel="stylesheet"', '@import', 'url(http'):
    require(forbidden not in portal, f"portal must remain offline-safe ({forbidden})")

input_tags = re.findall(r"<input\b[^>]*>", portal)
input_ids = {
    match.group(1)
    for tag in input_tags
    if (match := re.search(r'\bid="([^"]+)"', tag))
}
require(len(input_ids) == len(input_tags), "every input must have a stable id")

label_targets = set(re.findall(r'<label\s+for="([^"]+)"', portal))
require(input_ids <= label_targets, "every input must have an associated label")

for password_id in re.findall(r'<input\b[^>]*type="password"[^>]*id="([^"]+)"[^>]*>', portal):
    require(
        f'aria-controls="{password_id}"' in portal,
        f"password reveal must identify {password_id}",
    )

for variable in (
    "--omp-bg",
    "--omp-surface",
    "--omp-border",
    "--omp-text",
    "--omp-muted",
    "--omp-link",
    "--omp-action",
    "--omp-action-text",
    "--omp-focus",
    "--omp-success-container",
):
    require(variable in TOKENS, f"generated theme is missing {variable}")

for old_literal in ("#93c5fd", "#60a5fa", "#123b25", "#718078"):
    require(old_literal not in portal.lower(), f"semantic color must use a token ({old_literal})")

require("Generated from @onoffmypc/design" in TOKENS, "generated provenance is required")
print(f"Portal contract verified ({len(input_tags)} labeled inputs).")
