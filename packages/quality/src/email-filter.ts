import { isDisposableDomain } from './disposable-domains.ts'

export type FilteredEmail = { email: string; source: string; reason: string }
export type RejectedEmail = { value: string; reason: string; source: string }
export type FilterResult = { kept: FilteredEmail[]; rejected: RejectedEmail[]; duplicates: number; total: number }

const STRICT_EMAIL = /^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i
const PLACEHOLDER_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'test.com', 'test.org', 'invalid', 'localhost', 'domain.com', 'yourdomain.com'])
const PLACEHOLDER_LOCAL = /^(?:test|testing|example|sample|name|yourname|username|user|email|someone|abc|xxx|foo|bar|you|your|youremail|yourmail|john\.?doe|jane\.?doe|first\.?last|firstname\.?lastname)(?:\d+)?$/i
/** Error-reporting and analytics endpoints that look like addresses (for example Sentry keys embedded in Wix pages). */
const TRACKING_DOMAIN = /(?:^|\.)(?:sentry\.io|wixpress\.com)$/i
const KEY_LIKE_LOCAL = /^[0-9a-f]{24,}$/i
const NO_REPLY = /^(?:no[._-]?reply|do[._-]?not[._-]?reply)$/i
const COMMON_TLDS = new Set(['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'io', 'co', 'biz', 'info', 'us', 'uk', 'pk', 'ca', 'au', 'in', 'de', 'fr', 'nl', 'it', 'es', 'me', 'ai', 'app', 'dev', 'tech', 'store', 'site', 'online', 'agency', 'company', 'email', 'mail'])

function gmailKey(email: string): string {
  const [local, domain] = email.split('@')
  return domain === 'gmail.com' || domain === 'googlemail.com' ? `${local.split('+')[0].replace(/\./g, '')}@gmail.com` : email
}

/** Local syntax and junk-pattern filtering; it does not verify delivery or mailbox existence. */
export function filterEmails(inputs: { value: string; source: string }[]): FilterResult {
  const kept: FilteredEmail[] = [], rejected: RejectedEmail[] = []
  const seen = new Set<string>()
  let duplicates = 0
  for (const input of inputs) {
    const email = input.value.trim().replace(/^mailto:/i, '').replace(/^[<\[("']+|[>\])"'.,;:!?]+$/g, '').toLowerCase()
    let reason = ''
    if (email.length > 254 || !STRICT_EMAIL.test(email)) reason = 'Malformed email address'
    else {
      const [local, domain] = email.split('@')
      const tld = domain.split('.').at(-1) ?? ''
      if (local.length > 64 || local.includes('..') || domain.includes('..')) reason = 'Invalid email structure'
      else if (/^(?:gmail|googlemail|yahoo|outlook|hotmail|icloud|aol)\.(?:com|co\.uk|fr|de|net)[a-z]{2,}$/.test(domain)) reason = 'Extra text attached to a mail domain'
      else if (TRACKING_DOMAIN.test(domain) || KEY_LIKE_LOCAL.test(local)) reason = 'Error-reporting or tracking key, not a mailbox'
      else if (PLACEHOLDER_DOMAINS.has(domain) || domain.endsWith('.invalid') || PLACEHOLDER_LOCAL.test(local)) reason = 'Placeholder address'
      else if (isDisposableDomain(domain)) reason = 'Known disposable email domain'
      else if (NO_REPLY.test(local)) reason = 'No-reply mailbox'
      else if (!COMMON_TLDS.has(tld)) reason = 'Unrecognized domain ending; review manually'
    }
    if (reason) { rejected.push({ value: input.value, reason, source: input.source }); continue }
    const key = gmailKey(email)
    if (seen.has(key)) { duplicates++; rejected.push({ value: input.value, reason: 'Duplicate address or Gmail alias', source: input.source }); continue }
    seen.add(key)
    kept.push({ email, source: input.source, reason: input.value.trim() === email ? 'Passed local checks' : 'Normalized case or punctuation' })
  }
  return { kept, rejected, duplicates, total: inputs.length }
}
