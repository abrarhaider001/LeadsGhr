import { composeAndSend } from './email-sending/compose'
import type { ComposePayload } from './email-sending/types'

// Gmail content script for LeadsGhr Mailer: fills and sends one compose window per campaign message.
// It adds nothing to Gmail's page and does not track opens.
chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (!message || typeof message !== 'object' || !('kind' in message)) return
  if (message.kind === 'sending:ping') {
    respond({ ok: true })
    return
  }
  if (message.kind !== 'sending:compose') return
  const payload = message as ComposePayload & { kind: string }
  // Sending works only while LeadsGhr Mailer has an active license (set by its popup and start-up check).
  void chrome.storage.local
    .get('leadsghr.licenseActive')
    .then((data) =>
      data['leadsghr.licenseActive'] === true
        ? composeAndSend({
            to: payload.to,
            subject: payload.subject,
            bodyHtml: payload.bodyHtml,
            stepDelayMs: payload.stepDelayMs,
          })
        : {
            ok: false,
            error:
              'LeadsGhr Mailer needs an active license. Open the Mailer popup and enter your license key.',
          },
    )
    .then(respond)
  return true
})
