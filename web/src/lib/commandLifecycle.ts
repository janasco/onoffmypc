/**
 * One honest vocabulary for a command's journey, shared by every surface.
 *
 * The backend tracks two axes:
 *   status:         pending -> sent -> delivered | expired
 *   delivery_state: queued -> sending -> socket_written -> acknowledged
 *                   (or expired / failed_ambiguous)
 *
 * A socket write is NOT proof the PC changed state, and an acknowledgement is
 * NOT a confirmed state change. Only a `confirmed` stage would justify showing
 * success, and the backend does not emit that yet — so nothing here is green
 * except confirmation.
 */

export type CommandStage =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'acknowledged'
  | 'expired'
  | 'uncertain'
  | 'confirmed'
  | 'unknown'

export type CommandTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success'

export interface CommandProgress {
  stage: CommandStage
  /** Short label for a chip/badge. */
  label: string
  /** One sentence the user can act on. */
  detail: string
  tone: CommandTone
  /** True once no further transition is expected without a new request. */
  terminal: boolean
}

export interface CommandLike {
  status?: string | null
  delivery_state?: string | null
  delivered?: boolean
  expires_at?: string | null
  created_at?: string | null
}

const DESCRIBE: Record<CommandStage, Omit<CommandProgress, 'stage'>> = {
  queued: {
    label: 'Queued',
    detail: 'The device is offline. This will be sent when it reconnects, and expires if it does not.',
    tone: 'neutral',
    terminal: false,
  },
  sending: {
    label: 'Sending',
    detail: 'Handing the request to the device connection.',
    tone: 'info',
    terminal: false,
  },
  sent: {
    label: 'Sent — awaiting acknowledgement',
    detail: 'Written to the device connection. The device has not confirmed receipt yet.',
    tone: 'info',
    terminal: false,
  },
  acknowledged: {
    label: 'Device acknowledged',
    detail: 'The device confirmed it received the command. This does not confirm the PC changed state.',
    tone: 'info',
    terminal: true,
  },
  expired: {
    label: 'Expired',
    detail: 'The device never acknowledged before the deadline. No further attempt was made.',
    tone: 'warning',
    terminal: true,
  },
  uncertain: {
    label: 'Delivery uncertain',
    detail: 'The connection failed mid-send. The command may or may not have reached the device — check its state before retrying.',
    tone: 'danger',
    terminal: true,
  },
  confirmed: {
    label: 'PC state confirmed',
    detail: 'Telemetry confirms the PC reached the requested state.',
    tone: 'success',
    terminal: true,
  },
  unknown: {
    label: 'Status unknown',
    detail: 'No delivery information is available for this command.',
    tone: 'neutral',
    terminal: false,
  },
}

export function commandProgress(command: CommandLike, now: number = Date.now()): CommandProgress {
  const status = (command.status ?? '').toLowerCase()
  const delivery = (command.delivery_state ?? '').toLowerCase()
  const expiresAt = command.expires_at ? Date.parse(command.expires_at) : NaN
  const deadlinePassed = Number.isFinite(expiresAt) && expiresAt <= now

  let stage: CommandStage
  if (status === 'expired' || delivery === 'expired') {
    stage = 'expired'
  } else if (status === 'delivered' || delivery === 'acknowledged') {
    stage = 'acknowledged'
  } else if (delivery === 'failed_ambiguous') {
    stage = 'uncertain'
  } else if (delivery === 'socket_written') {
    stage = "sent"
  } else if (delivery === 'sending' || delivery === 'dispatching') {
    stage = 'sending'
  } else if (deadlinePassed && (status === 'pending' || status === 'sent' || status === '')) {
    // The cron marks these expired within five minutes; showing the deadline
    // as already passed is more honest than "queued" forever.
    stage = 'expired'
  } else if (status === 'pending' || delivery === 'queued') {
    stage = 'queued'
  } else if (status === 'sent') {
    stage = 'sent'
  } else {
    stage = 'unknown'
  }

  return { stage, ...DESCRIBE[stage] }
}

/** The immediate result of POST /commands/:id, before any polling. */
export function progressFromSendResult(
  result: { status?: string | null; delivery_state?: string | null; delivered?: boolean; expires_at?: string | null; reason?: string },
  now: number = Date.now(),
): CommandProgress {
  if (result.reason === 'idempotency_conflict') return commandProgress({ status: 'unknown' }, now)
  if (result.status || result.delivery_state) return commandProgress(result, now)
  // Backward compatible: older responses only carried `delivered`.
  if (result.delivered) return commandProgress({ status: 'sent', delivery_state: 'socket_written' }, now)
  return commandProgress({ status: 'pending', delivery_state: 'queued' }, now)
}
