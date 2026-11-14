const STRICT_EMAIL = /^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i

export function normalizeVerifyEmail(value: string): string | null {
  const email = value.trim().replace(/^mailto:/i, '').replace(/^[<\[("']+|[>\])"'.,;:!?]+$/g, '').toLowerCase()
  if (!email || email.length > 254 || !STRICT_EMAIL.test(email)) return null
  const [local, domain] = email.split('@')
  if (local.length > 64 || local.includes('..') || domain.includes('..')) return null
  return email
}
