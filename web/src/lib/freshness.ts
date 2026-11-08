/**
 * Freshness helpers. A dashboard that shows "PC on" for a reading from three
 * days ago is worse than one that admits it does not know.
 */

export type PcStateLabel = 'On' | 'Off' | 'Unknown'

export interface PcState {
  state: PcStateLabel
  /** "on as of 4 minutes ago", or "no reading yet". */
  ageLabel: string
  /** True when the reading is old enough that it should not be trusted. */
  stale: boolean
  /** Raw observation timestamp, if any. */
  observedAt: string | null
}

/** Readings older than this are presented as stale rather than current. */
export const STALE_AFTER_MS = 5 * 60 * 1000

export function describeAge(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'never'
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return 'at an unknown time'
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return 'just now'
  if (seconds < 90) return 'a minute ago'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

export function isStale(iso: string | null | undefined, now: number = Date.now()): boolean {
  if (!iso) return true
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return true
  return now - then > STALE_AFTER_MS
}

export function describePcState(
  pcOn: number | null | undefined,
  observedAt: string | null | undefined,
  now: number = Date.now(),
): PcState {
  const observedAtValue = observedAt ?? null
  if (pcOn === null || pcOn === undefined) {
    return { state: 'Unknown', ageLabel: 'no reading yet', stale: true, observedAt: observedAtValue }
  }
  const state: PcStateLabel = pcOn === 1 ? 'On' : 'Off'
  const stale = isStale(observedAtValue, now)
  return {
    state,
    ageLabel: observedAtValue ? `observed ${describeAge(observedAtValue, now)}` : 'observation time unknown',
    stale,
    observedAt: observedAtValue,
  }
}

/**
 * Device presence. Separate from PC state: the controller can be online while
 * the PC is off, and the PC state can be stale while the controller is online.
 */
export function describeConnection(
  lastSeenAt: string | null | undefined,
  now: number = Date.now(),
): { online: boolean; label: string; ageLabel: string } {
  const stale = isStale(lastSeenAt, now)
  return {
    online: !stale && Boolean(lastSeenAt),
    label: !lastSeenAt ? 'Never connected' : stale ? 'Offline' : 'Online',
    ageLabel: lastSeenAt ? `last contact ${describeAge(lastSeenAt, now)}` : 'no contact yet',
  }
}
