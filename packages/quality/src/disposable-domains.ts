export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'throwaway.email',
  'fakeinbox.com',
  'mailnesia.com',
  'tempail.com',
  'moakt.com',
  'emailondeck.com',
  'getairmail.com',
  'mintemail.com',
  'mytemp.email',
])

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase())
}
