const STRICT_EMAIL = /^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i

function stripEmail(value: string): string {
  return value.trim().replace(/^mailto:/i, '').replace(/^[<\[("']+|[>\])"'.,;:!?]+$/g, '').toLowerCase()
}

/** Strict syntax used when the Syntax preference is on. */
export function normalizeVerifyEmail(value: string): string | null {
  const email = stripEmail(value)
  if (!email || email.length > 254 || !STRICT_EMAIL.test(email)) return null
  const [local, domain] = email.split('@')
  if (local.length > 64 || local.includes('..') || domain.includes('..')) return null
  return email
}

/** Minimal local@domain parse used only when the Syntax preference is off. */
export function looseVerifyEmail(value: string): string | null {
  const email = stripEmail(value)
  if (!email || email.length > 254) return null
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!local || !domain || local.includes(' ') || domain.includes(' ') || !domain.includes('.')) return null
  return `${local}@${domain}`
}
