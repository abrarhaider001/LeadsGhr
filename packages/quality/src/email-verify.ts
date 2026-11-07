/** SMTP RCPT reply classification and local syntax prep for desktop email validation. Network I/O stays in Electron main. */

export type EmailVerifyStatus = 'valid' | 'risky' | 'invalid' | 'unknown'

export type EmailVerifyResult = {
  email: string
  status: EmailVerifyStatus
  reason: string
  mxHost?: string
  smtpCode?: number
}

const STRICT_EMAIL = /^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i

/** Normalize an address for SMTP probing. Returns null when syntax is not usable. */
export function normalizeVerifyEmail(value: string): string | null {
  const email = value.trim().replace(/^mailto:/i, '').replace(/^[<\[("']+|[>\])"'.,;:!?]+$/g, '').toLowerCase()
  if (!email || email.length > 254 || !STRICT_EMAIL.test(email)) return null
  const [local, domain] = email.split('@')
  if (local.length > 64 || local.includes('..') || domain.includes('..')) return null
  return email
}

/**
 * Map an SMTP RCPT TO reply to a cautious status.
 * A 250 acceptance means the server accepted the recipient command; it is not proof of inbox delivery.
 */
export function classifySmtpRcptReply(code: number, text = ''): Pick<EmailVerifyResult, 'status' | 'reason'> {
  const lower = text.toLowerCase()
  if (code >= 200 && code < 300) {
    return { status: 'valid', reason: 'Mail server accepted RCPT TO for this address (SMTP probe; not a delivery guarantee).' }
  }
  if (code === 450 || code === 451 || code === 452 || /greylist|try again|temporarily/i.test(lower)) {
    return { status: 'unknown', reason: 'Mail server gave a temporary or greylist response; try again later.' }
  }
  if (code === 421) {
    return { status: 'unknown', reason: 'Mail server is temporarily unavailable.' }
  }
  if (code === 550 || code === 551 || code === 553 || /user unknown|mailbox unavailable|does not exist|no such user|recipient rejected/i.test(lower)) {
    return { status: 'invalid', reason: 'Mail server rejected the recipient address.' }
  }
  if (code === 552) {
    return { status: 'risky', reason: 'Mail server reported a mailbox or storage limit during the probe.' }
  }
  if (code >= 500) {
    return { status: 'invalid', reason: `Mail server rejected the probe (SMTP ${code}).` }
  }
  if (code >= 400) {
    return { status: 'unknown', reason: `Mail server returned a temporary SMTP ${code} response.` }
  }
  return { status: 'unknown', reason: `Unexpected SMTP reply code ${code}.` }
}

export function syntaxInvalidResult(value: string): EmailVerifyResult {
  return { email: value.trim() || value, status: 'invalid', reason: 'Malformed email address; SMTP probe was not attempted.' }
}

export function noMxResult(email: string): EmailVerifyResult {
  return { email, status: 'invalid', reason: 'No mail exchanger (MX or A record) found for the domain.' }
}

export function probeBlockedResult(email: string, mxHost?: string, detail = 'SMTP probe could not complete'): EmailVerifyResult {
  return {
    email,
    status: 'unknown',
    reason: `${detail}. Many networks block outbound port 25; this is not proof the mailbox is invalid.`,
    mxHost,
  }
}
