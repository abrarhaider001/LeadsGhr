import { composeAndSend } from './email-sending/compose'
import type { ComposePayload } from './email-sending/types'

// Gmail content script for LeadsGhr Mailer: fills and sends one compose window per campaign message.
// It adds nothing to Gmail's page and does not track opens.
chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (!message || typeof message !== 'object' || !('kind' in message)) return
  if (message.kind === 'sending:ping') { respond({ ok: true }); return }
  if (message.kind !== 'sending:compose') return
  const payload = message as ComposePayload & { kind: string }
  void composeAndSend({ to: payload.to, subject: payload.subject, bodyHtml: payload.bodyHtml, stepDelayMs: payload.stepDelayMs }).then(respond)
  return true
})
