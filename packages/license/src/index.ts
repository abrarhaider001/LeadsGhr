/*
 * LeadsGhr license keys (see AGENTS.md, "License keys").
 *
 * The admin creates keys in Supabase (`select create_license_key(...)`). A key can be activated once per
 * product (the desktop app, LeadsGhr Mailer, LeadsGhr Tracker, and any future extension); the activation is
 * bound to one installation through a random installation ID. Every product checks its key with the
 * `license` Edge Function when it starts and shows the license screen when the key is missing, expired,
 * revoked, or used elsewhere. Only the key, product, installation ID, and dates ever reach Supabase.
 */

/**
 * The app mode, set with LEADSGHR_MODE in the repository's .env file (or the environment): `local` turns license
 * keys off for development and testing; `production` (the default) requires them. Anything other than `local`,
 * including a missing value or a typo, counts as production. The desktop app honours `local` only when it is not
 * installed (`pnpm dev`); the extensions read it when they are built.
 */
export function isLocalMode(value: string | undefined | null): boolean {
  return (value ?? '').trim().toLowerCase() === 'local'
}

/** The LEADSGHR_MODE value written in a .env file's text, or undefined when the file does not set it. */
export function modeFromEnvFile(text: string): string | undefined {
  const line = text.match(/^\s*LEADSGHR_MODE\s*=\s*(.*)$/m)
  return line?.[1].replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2')
}

/** The license view used in local mode: active, with nothing to check, copy, or renew. */
export function localLicenseView(now = new Date()): LicenseView {
  return {
    state: 'active',
    local: true,
    expiresAt: '9999-12-31T00:00:00.000Z',
    keyEnd: '',
    keyLength: 0,
    products: {},
    activatedAt: now.toISOString(),
    lastCheckedAt: now.toISOString(),
    offline: false,
  }
}

/** The Supabase Edge Function that activates and checks keys (`supabase/functions/license`). */
export const LICENSE_ENDPOINT = 'https://ihooxhqcoycumpvgogle.supabase.co/functions/v1/license'

/** Products a key can be activated on, once each. A new extension adds an entry here and in the Edge Function. */
export const LICENSE_PRODUCTS = [
  { id: 'desktop', name: 'Desktop app', short: 'Desktop app' },
  { id: 'mailer', name: 'LeadsGhr Mailer', short: 'Mailer' },
  { id: 'tracker', name: 'LeadsGhr Tracker', short: 'Tracker' },
] as const
export type LicenseProduct = (typeof LICENSE_PRODUCTS)[number]['id']

/** How long a product keeps working without reaching the license service (no internet at start-up). */
export const OFFLINE_GRACE_DAYS = 7

export type LicenseServerStatus =
  | 'active'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'used'
  | 'not_activated'
export type ProductSlots = Partial<Record<LicenseProduct, 'used' | 'available'>>
export type LicenseResponse = {
  status: LicenseServerStatus
  expiresAt?: string
  keyEnd?: string
  products?: ProductSlots
  activatedAt?: string
}
export type LicenseRequest = {
  action: 'activate' | 'check'
  key: string
  product: LicenseProduct
  installationId: string
}

/** What a product keeps locally (encrypted). The full key never leaves this record. */
export type StoredLicense = {
  key: string
  expiresAt: string
  keyEnd: string
  products: ProductSlots
  activatedAt: string
  lastCheckedAt: string
}

/** What the UI is allowed to see: never the full key. */
export type LicenseView =
  | {
      state: 'active'
      expiresAt: string
      keyEnd: string
      keyLength?: number
      products: ProductSlots
      activatedAt: string
      lastCheckedAt: string
      offline: boolean
      /** Local mode (LEADSGHR_MODE=local): no key is needed or checked. */
      local?: boolean
    }
  | {
      state: 'locked'
      reason: LicenseServerStatus | 'missing' | 'offline' | 'error'
      message: string
      expiresAt?: string
      products?: ProductSlots
    }

/**
 * A license key is 32 characters: capital and small letters, digits, and the special characters !@#$%&*?
 * (made in Supabase from the name, email, time, and a random part; supabase/migrations/0006_license_key_32.sql).
 * Keys are case-sensitive. Older 64-character hex keys are still accepted.
 */
export const LICENSE_KEY_LENGTH = 32
const KEY_PATTERN = /^[A-HJ-NP-Za-km-np-z2-9!@#$%&*?]{32}$/
const LEGACY_KEY_PATTERN = /^[0-9A-Fa-f]{64}$/

/** Removes spaces and line breaks from a pasted key; returns the key, or null when it is not a valid key. */
export function normalizeLicenseKey(input: string): string | null {
  const key = input.replace(/\s/g, '')
  if (KEY_PATTERN.test(key)) return key
  return LEGACY_KEY_PATTERN.test(key) ? key.toLowerCase() : null
}

/** Shows only the last eight characters of a key. */
/** The key at its real length: one dot for each hidden character, then the last characters as they are. */
export const maskLicenseKey = (keyEnd: string, keyLength = LICENSE_KEY_LENGTH) =>
  KEY_MASK_CHAR.repeat(Math.max(0, keyLength - keyEnd.length)) + keyEnd

const productName = (product: LicenseProduct) =>
  LICENSE_PRODUCTS.find((item) => item.id === product)?.name ?? product

/** The sentence a product shows when its key cannot be used. */
export type LockReason = Extract<LicenseView, { state: 'locked' }>['reason']

export function licenseMessage(
  reason: LockReason,
  product: LicenseProduct,
  expiresAt?: string,
): string {
  const date = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''
  switch (reason) {
    case 'invalid':
      return 'This license key does not exist. Check it for typos, or ask your admin for a key.'
    case 'expired':
      return `This key has expired${date ? ` (${date})` : ''}. Ask your admin for a new key.`
    case 'revoked':
      return 'This key has been turned off by your admin. Ask your admin for a new key.'
    case 'used':
      return `This key is already used for ${productName(product)} on another computer. Ask your admin for a new key.`
    case 'not_activated':
      return `This key is not activated for ${productName(product)} on this computer. Enter it again to activate.`
    case 'offline':
      return `LeadsGhr could not check your license for ${OFFLINE_GRACE_DAYS} days. Connect to the internet and try again.`
    case 'error':
      return 'The license service did not answer. Check your internet connection and try again.'
    default:
      return 'Enter the license key you received from your admin.'
  }
}

/** Calls the license service. Throws only when it cannot be reached (the caller decides about offline use). */
export async function callLicenseService(
  request: LicenseRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<LicenseResponse> {
  const response = await fetchImpl(LICENSE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (response.status >= 500)
    throw new Error(`License service unavailable (HTTP ${response.status})`)
  const data = (await response.json().catch(() => null)) as LicenseResponse | null
  if (
    !data ||
    !['active', 'invalid', 'expired', 'revoked', 'used', 'not_activated'].includes(data.status)
  )
    throw new Error('Unexpected answer from the license service')
  return data
}

/** True while the last successful check is recent enough to keep working without the license service. */
export function withinOfflineGrace(stored: StoredLicense, now = Date.now()): boolean {
  return (
    now - new Date(stored.lastCheckedAt).getTime() < OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000 &&
    new Date(stored.expiresAt).getTime() > now
  )
}

/** Turns a service answer into the stored record (when active) and the view the UI shows. */
export function applyLicenseResponse(
  key: string,
  product: LicenseProduct,
  response: LicenseResponse,
  previous?: StoredLicense,
  now = new Date(),
): { stored: StoredLicense | null; view: LicenseView } {
  if (response.status === 'active' && response.expiresAt && response.keyEnd) {
    const stored: StoredLicense = {
      key,
      expiresAt: response.expiresAt,
      keyEnd: response.keyEnd,
      products: response.products ?? previous?.products ?? {},
      activatedAt: response.activatedAt ?? previous?.activatedAt ?? now.toISOString(),
      lastCheckedAt: now.toISOString(),
    }
    return {
      stored,
      view: {
        state: 'active',
        expiresAt: stored.expiresAt,
        keyEnd: stored.keyEnd,
        keyLength: stored.key.length,
        products: stored.products,
        activatedAt: stored.activatedAt,
        lastCheckedAt: stored.lastCheckedAt,
        offline: false,
      },
    }
  }
  const reason = response.status === 'active' ? 'error' : response.status
  return {
    stored: null,
    view: {
      state: 'locked',
      reason,
      message: licenseMessage(reason, product, response.expiresAt),
      expiresAt: response.expiresAt,
      products: response.products,
    },
  }
}

/** Start-up check shared by every product: re-validate the stored key, allowing offline use within the grace period. */
export async function checkStoredLicense(
  stored: StoredLicense | null,
  product: LicenseProduct,
  installationId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ stored: StoredLicense | null; view: LicenseView }> {
  if (!stored)
    return {
      stored: null,
      view: { state: 'locked', reason: 'missing', message: licenseMessage('missing', product) },
    }
  try {
    return applyLicenseResponse(
      stored.key,
      product,
      await callLicenseService(
        { action: 'check', key: stored.key, product, installationId },
        fetchImpl,
      ),
      stored,
    )
  } catch {
    if (withinOfflineGrace(stored))
      return {
        stored,
        view: {
          state: 'active',
          expiresAt: stored.expiresAt,
          keyEnd: stored.keyEnd,
          keyLength: stored.key.length,
          products: stored.products,
          activatedAt: stored.activatedAt,
          lastCheckedAt: stored.lastCheckedAt,
          offline: true,
        },
      }
    return {
      stored,
      view: { state: 'locked', reason: 'offline', message: licenseMessage('offline', product) },
    }
  }
}

/** Activation shared by every product. Throws only when the license service cannot be reached. */
export async function activateLicense(
  input: string,
  product: LicenseProduct,
  installationId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ stored: StoredLicense | null; view: LicenseView }> {
  const key = normalizeLicenseKey(input)
  if (!key)
    return {
      stored: null,
      view: {
        state: 'locked',
        reason: 'invalid',
        message:
          'A license key is 32 characters (letters, digits, and !@#$%&*?). Paste the whole key and try again.',
      },
    }
  return applyLicenseResponse(
    key,
    product,
    await callLicenseService({ action: 'activate', key, product, installationId }, fetchImpl),
  )
}

/** Character shown in place of each hidden key character while typing. */
export const KEY_MASK_CHAR = '•'

/** What the key field shows: every character as a dot except the one at `reveal` (-1 shows none). */
export function maskKeyForDisplay(key: string, reveal = -1): string {
  return Array.from(key, (char, index) => (index === reveal ? char : KEY_MASK_CHAR)).join('')
}

/**
 * Applies an edit made to the masked field to the real key. `before` is what the field showed, `after` is
 * what it shows after the edit; the changed part between their common start and end is the typed, pasted, or
 * deleted text. Returns the new key and the position of the one typed character to reveal (-1 for a paste
 * or a deletion).
 */
export function applyMaskedKeyEdit(
  key: string,
  before: string,
  after: string,
): { key: string; reveal: number } {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++
  let end = 0
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++
  const inserted = after.slice(start, after.length - end)
  return {
    key: key.slice(0, start) + inserted + key.slice(before.length - end),
    reveal: inserted.length === 1 ? start : -1,
  }
}
