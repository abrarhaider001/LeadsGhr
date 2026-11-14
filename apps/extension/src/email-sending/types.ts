export type Template = {
  subject: string
  bodyHtml: string
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

export type SendJobStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed'

export type SendJob = {
  id: string
  status: SendJobStatus
  template: Template
  recipients: Recipient[]
  cursor: number
  delayMs: number
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
}

export type ComposeResult = {
  ok: true
} | {
  ok: false
  error: string
}
