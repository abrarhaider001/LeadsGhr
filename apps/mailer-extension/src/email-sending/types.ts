export type Template = {
  subject: string
  bodyHtml: string
}

/** A named template kept in this Chrome profile and picked in the popup. */
export type SavedTemplate = Template & {
  id: string
  name: string
  updatedAt: number
}

/** Popup inputs, saved as they change so closing the popup loses nothing. */
export type SendingDraft = {
  templateId: string
  fileName: string
  recipients: Recipient[]
  from: string
  to: string
  delaySec: string
}

export type Recipient = {
  index: number
  email: string
  fields: Record<string, string>
}

export type SendRange = {
  from: number
  to: number
}

/**
 * How the Delay (s) value is used.
 * - `between`: wait that long after one email has been sent before starting the next.
 * - `steps`: each email takes that long in total; the time is split evenly over its four steps
 *   (open compose, fill the recipient, fill the template, click Send), then the next email starts.
 */
export type DelayMode = 'between' | 'steps'

export type SendingPreferences = {
  delayMode: DelayMode
}

export const COMPOSE_STEPS = 4

export type SendJobStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed'

export type SendJob = {
  id: string
  status: SendJobStatus
  template: Template
  recipients: Recipient[]
  cursor: number
  delayMs: number
  /** Missing on jobs created before delay types existed; treated as `between`. */
  delayMode?: DelayMode
  createdAt: number
  updatedAt: number
  lastError?: string
}

export type SendHistoryEntry = {
  id: string
  jobId: string
  email: string
  subject: string
  sentAt: number
  status: 'sent' | 'failed'
  error?: string
}

export type ComposePayload = {
  to: string
  subject: string
  bodyHtml: string
  /** Pause before each compose step after the first (0 = no pauses). */
  stepDelayMs?: number
}

export type ComposeResult = {
  ok: true
} | {
  ok: false
  error: string
}
