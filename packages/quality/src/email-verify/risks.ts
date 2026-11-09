import { isDisposableDomain } from '../disposable-domains.ts'

const ROLE_PREFIXES = new Set([
  'admin',
  'support',
  'info',
  'sales',
  'contact',
  'billing',
  'help',
  'marketing',
  'webmaster',
  'noreply',
  'no-reply',
  'no_reply',
  'donotreply',
  'do-not-reply',
  'postmaster',
  'abuse',
  'office',
  'hello',
  'team',
  'jobs',
  'hr',
  'press',
  'media',
  'enquiry',
  'enquiries',
  'inquiry',
  'inquiries',
])

export function checkDisposable(domain: string): boolean {
  return isDisposableDomain(domain)
}

export function checkRoleBased(email: string): boolean {
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  if (ROLE_PREFIXES.has(local)) return true
  return /^(?:no[._-]?reply|do[._-]?not[._-]?reply)$/i.test(local)
}
