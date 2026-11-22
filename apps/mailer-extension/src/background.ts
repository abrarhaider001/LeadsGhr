import { checkExtensionLicense } from '@leadsghr/license/extension'
import { registerSendingRuntime } from './email-sending/runner'

// LeadsGhr Mailer only sends: the queue, delays, and Gmail tab control live in the sending runtime.
registerSendingRuntime()

// License check at every browser start (the popup checks again when it opens).
chrome.runtime.onStartup.addListener(() => { void checkExtensionLicense('mailer', { force: true }).catch(() => undefined) })
