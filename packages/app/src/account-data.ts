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
  persistProfile()
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
  persistProfile()
}

/*
 * The profile file in C:\LeadsGhr\data\profile.json is the saved copy: it survives reinstalling LeadsGhr.
 * localStorage stays as a fast start-up copy so the first frame already shows the name and avatar.
 */
export type StoredProfile = { account: LocalAccount; avatarSeed: string }
type ProfileBridge = { loadProfile(): Promise<StoredProfile | null>; saveProfile(profile: StoredProfile): Promise<void> }
const profileBridge = () => (window as Window & { leadsGhrDesktop?: Partial<ProfileBridge> }).leadsGhrDesktop

function persistProfile() {
  void profileBridge()?.saveProfile?.({ account: loadLocalAccount(), avatarSeed: loadAvatarSeed() })?.catch(() => undefined)
}

/**
 * Reads the profile file. When it exists, it replaces the start-up copy; when it does not (first start
 * after moving to the data folder), the current profile is written to it.
 */
export async function syncProfileFromDisk(): Promise<StoredProfile | null> {
  const api = profileBridge()
  if (!api?.loadProfile) return null
  const stored = await api.loadProfile().catch(() => null)
  if (stored) {
    try { window.localStorage.setItem(accountKey, JSON.stringify(stored.account)); window.localStorage.setItem(avatarKey, stored.avatarSeed) } catch { /* start-up copy only */ }
    return stored
  }
  persistProfile()
  return null
}
