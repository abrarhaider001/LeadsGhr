import type { Lead } from '@leadsghr/schemas'
export { filterEmails } from './email-filter.ts'
export type { FilterResult, FilteredEmail, RejectedEmail } from './email-filter.ts'
export {
  normalizeVerifyEmail,
  looseVerifyEmail,
  checkDisposable,
  checkRoleBased,
  classifyRcpt,
  classifyMailFrom,
  finalizeResult,
  scoreChecks,
  checksComplete,
  isRetryable,
} from './email-verify/index.ts'
export type {
  EmailVerifyResult,
  EmailVerifyEnabledChecks,
  SmtpClassified,
} from './email-verify/index.ts'
export { DISPOSABLE_DOMAINS, isDisposableDomain } from './disposable-domains.ts'

export function dedupeLeads(leads: Lead[]): Lead[] {
  const byKey = new Map<string, Lead>()
  for (const lead of leads) {
    const key = `${lead.orgId}:${lead.domain ?? `${lead.name.toLowerCase()}:${lead.city ?? ''}`}`
    const prior = byKey.get(key)
    byKey.set(
      key,
      prior
        ? {
            ...prior,
            emails: [...new Set([...prior.emails, ...lead.emails])],
            phones: [...new Set([...prior.phones, ...lead.phones])],
          }
        : lead,
    )
  }
  return [...byKey.values()]
}

export function quickScore(lead: Lead): number {
  return Math.min(
    100,
    (lead.emails.length ? 40 : 0) +
      (lead.phones.length ? 25 : 0) +
      (lead.website ? 20 : 0) +
      (lead.niche ? 15 : 0),
  )
}
