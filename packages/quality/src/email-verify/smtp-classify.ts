export type SmtpSignal = 'accepted' | 'rejected' | 'temp' | 'blocked' | 'needs_tls' | 'unverifiable'

export type SmtpClassified = {
  signal: SmtpSignal
  code: string
  reason: string
  smtpCode?: number
}

const ENH = /\b[245]\.\d{1,3}\.\d{1,3}\b/
const TLS = /starttls|encryption required|tls required/i
const POLICY =
  /\b5\.7\.\d+\b|spamhaus|blacklist|blocklist|blocked|reputation|banned|policy|not allowed|denied|\brbl\b|\bspam/i
const NOT_FOUND =
  /user unknown|no such user|does not exist|unknown recipient|invalid recipient|recipient not found|mailbox (?:unavailable|not found)|no mailbox/i
const GREY = /grey|gray|try again|later|temporar/i

export function classifyRcpt(code: number, text = ''): SmtpClassified {
  const enh = ENH.exec(text)?.[0] ?? ''
  const lower = text.toLowerCase()
  if (code === 252)
    return {
      signal: 'unverifiable',
      code: 'provider_unverifiable',
      reason: 'Server will not verify',
      smtpCode: code,
    }
  if (code >= 200 && code < 300)
    return { signal: 'accepted', code: 'accepted', reason: 'Accepted', smtpCode: code }
  if (code === 530 || TLS.test(text))
    return { signal: 'needs_tls', code: 'needs_tls', reason: 'TLS required', smtpCode: code }
  if (enh === '5.1.1' || enh === '5.1.10')
    return {
      signal: 'rejected',
      code: 'mailbox_not_found',
      reason: 'Mailbox not found',
      smtpCode: code,
    }
  if (code === 552 || enh === '5.2.2')
    return { signal: 'accepted', code: 'mailbox_full', reason: 'Mailbox full', smtpCode: code }
  if (code === 572 || /host name is unknown|domain not found|name is unknown/i.test(lower)) {
    return {
      signal: 'rejected',
      code: 'domain_not_found',
      reason: 'Domain not found',
      smtpCode: code,
    }
  }
  if (code >= 500 && POLICY.test(`${text} ${enh}`))
    return {
      signal: 'blocked',
      code: 'policy_block',
      reason: 'Blocked by server policy',
      smtpCode: code,
    }
  if (code >= 500 && (NOT_FOUND.test(text) || enh === '5.2.1'))
    return {
      signal: 'rejected',
      code: 'mailbox_not_found',
      reason: 'Mailbox not found',
      smtpCode: code,
    }
  if (code >= 400 && code < 500) {
    return GREY.test(text) || /^4\.7\./.test(enh)
      ? { signal: 'temp', code: 'greylist', reason: 'Greylisted', smtpCode: code }
      : { signal: 'temp', code: 'temp_failure', reason: `Temporary (${code})`, smtpCode: code }
  }
  if (code >= 500)
    return {
      signal: 'blocked',
      code: 'rejected_other',
      reason: `Rejected (${code})`,
      smtpCode: code,
    }
  return { signal: 'unverifiable', code: 'rejected_other', reason: `SMTP ${code}`, smtpCode: code }
}

export function classifyMailFrom(code: number, text = ''): SmtpClassified {
  if (code === 530 || TLS.test(text))
    return { signal: 'needs_tls', code: 'needs_tls', reason: 'TLS required', smtpCode: code }
  return {
    signal: 'blocked',
    code: 'sender_blocked',
    reason: 'MAIL FROM rejected — set a routable address in Preferences',
    smtpCode: code,
  }
}
