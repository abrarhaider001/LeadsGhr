import type {
  ComposePayload,
  ComposeResult,
  Recipient,
  SendJob,
  SendRange,
  Template,
} from './types'

export const SENDING_ALARM = 'sending-tick'

export type SendingStartRequest = {
  kind: 'sending:start'
  template: Template
  recipients: Recipient[]
  range: SendRange
  delayMs: number
}

export type SendingControlRequest =
  | { kind: 'sending:pause' }
  | { kind: 'sending:resume' }
  | { kind: 'sending:cancel' }
  | { kind: 'sending:status' }
  | { kind: 'sending:clear-history' }

export type SendingComposeRequest = {
  kind: 'sending:compose'
} & ComposePayload

export type SendingRequest = SendingStartRequest | SendingControlRequest | SendingComposeRequest

export type SendingStatusResponse = {
  ok: true
  job: SendJob | null
}

export type SendingActionResponse = { ok: true; job: SendJob | null } | { ok: false; error: string }

export type SendingComposeResponse = ComposeResult

export function isSendingRequest(message: unknown): message is SendingRequest {
  return (
    !!message &&
    typeof message === 'object' &&
    'kind' in message &&
    typeof (message as { kind: unknown }).kind === 'string' &&
    String((message as { kind: string }).kind).startsWith('sending:')
  )
}
