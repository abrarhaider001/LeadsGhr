import { registerSendingRuntime } from './email-sending/runner'

// LeadsGhr Mailer only sends: the queue, delays, and Gmail tab control live in the sending runtime.
registerSendingRuntime()
