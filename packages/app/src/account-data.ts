export type LocalAccount = { firstName: string; lastName: string; email: string }

const accountKey = 'leadsghr-local-account'
const avatarKey = 'leadsghr-profile-avatar-seed'
export const defaultLocalAccount: LocalAccount = { firstName: 'Abrar', lastName: 'Haider', email: 'abrar@leedsghr.com' }

export function loadLocalAccount(): LocalAccount {
  try {
    const saved = window.localStorage.getItem(accountKey)
    if (!saved) return defaultLocalAccount
    const data: unknown = JSON.parse(saved)
    if (!data || typeof data !== 'object') return defaultLocalAccount
    const record = data as Record<string, unknown>
    if (typeof record.firstName !== 'string' || typeof record.lastName !== 'string' || typeof record.email !== 'string') return defaultLocalAccount
    return { firstName: record.firstName, lastName: record.lastName, email: record.email }
  } catch { return defaultLocalAccount }
}

export function saveLocalAccount(account: LocalAccount) {
  window.localStorage.setItem(accountKey, JSON.stringify(account))
}

export function loadAvatarSeed(): string {
  const saved = window.localStorage.getItem(avatarKey)
  if (saved) return saved
  const seed = crypto.randomUUID()
  window.localStorage.setItem(avatarKey, seed)
  return seed
}

export function saveAvatarSeed(seed: string) {
  window.localStorage.setItem(avatarKey, seed)
}
