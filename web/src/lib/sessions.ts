/**
 * Presentation helpers for the active-sessions list. Pure so they can be
 * tested without rendering the page.
 */

export interface SessionSummary {
  id: string
  created_at: string
  last_seen_at: string
  expires_at: string
  ip: string | null
  user_agent: string | null
  current: boolean
}

/** Turn a User-Agent into something a person recognises. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device"
  const s = ua.toLowerCase()
  const browser = s.includes("edg/") ? "Edge"
    : s.includes("chrome/") && !s.includes("chromium") ? "Chrome"
    : s.includes("firefox/") ? "Firefox"
    : s.includes("safari/") && !s.includes("chrome") ? "Safari"
    : s.includes("okhttp") ? "Android app"
    : s.includes("cfnetwork") || s.includes("darwin") ? "iOS app"
    : "Browser"
  const os = s.includes("android") ? "Android"
    : s.includes("iphone") || s.includes("ipad") ? "iOS"
    : s.includes("windows") ? "Windows"
    : s.includes("mac os") || s.includes("macintosh") ? "macOS"
    : s.includes("linux") ? "Linux"
    : ""
  return os ? `${browser} on ${os}` : browser
}

export function formatWhen(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "unknown"
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return "unknown"
  const mins = Math.round((now - t) / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}
