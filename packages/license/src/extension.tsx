import { useEffect, useState, type ReactNode } from 'react'
import { useMaskedKey } from './masked-key'
import {
  activateLicense,
  checkStoredLicense,
  LICENSE_KEY_LENGTH,
  LICENSE_PRODUCTS,
  localLicenseView,
  type LicenseProduct,
  type LicenseView,
  type StoredLicense,
} from './index'

/*
 * License handling shared by every LeadsGhr Chrome extension (Mailer, Tracker, and future ones).
 *
 * The activated license is kept in chrome.storage.local, encrypted with AES-GCM (random key per
 * installation), so the key is not readable in storage. The installation ID is kept separately and never
 * removed, so entering the same key again on this installation re-activates it. Content scripts read only
 * the `leadsghr.licenseActive` flag before doing anything in Gmail.
 */

type ChromeStorageArea = {
  get(keys: string[]): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string[]): Promise<void>
}
declare const chrome: {
  storage: { local: ChromeStorageArea }
  runtime: { getURL(path: string): string }
}

/** Set by each extension's vite.config.ts from LEADSGHR_MODE (the repository's .env) when it is built: true for `local`. */
declare const __LEADSGHR_LOCAL_MODE__: boolean | undefined
/** True in an extension built in local mode: no license key is needed or checked. */
export const EXTENSION_LOCAL_MODE =
  typeof __LEADSGHR_LOCAL_MODE__ !== 'undefined' && __LEADSGHR_LOCAL_MODE__ === true

const LICENSE_RECORD = 'leadsghr.license'
const CIPHER_KEY = 'leadsghr.licenseCipher'
const INSTALLATION = 'leadsghr.installationId'
/** Read by content scripts: true only while this extension has an active license. */
export const LICENSE_ACTIVE_FLAG = 'leadsghr.licenseActive'
/** The popup re-checks with the service at most this often; browser start-up always checks. */
const RECHECK_MS = 60 * 60 * 1000

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

async function cipherKey(): Promise<CryptoKey> {
  const saved = (await chrome.storage.local.get([CIPHER_KEY]))[CIPHER_KEY]
  let raw = typeof saved === 'string' ? fromBase64(saved) : null
  if (!raw || raw.length !== 32) {
    raw = crypto.getRandomValues(new Uint8Array(32))
    await chrome.storage.local.set({ [CIPHER_KEY]: toBase64(raw) })
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function installationId(): Promise<string> {
  const saved = (await chrome.storage.local.get([INSTALLATION]))[INSTALLATION]
  if (typeof saved === 'string' && saved.length >= 16) return saved
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ [INSTALLATION]: id })
  return id
}

async function readLicense(): Promise<StoredLicense | null> {
  const record = (await chrome.storage.local.get([LICENSE_RECORD]))[LICENSE_RECORD] as
    | { iv?: string; data?: string }
    | undefined
  if (!record?.iv || !record.data) return null
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(record.iv) },
      await cipherKey(),
      fromBase64(record.data),
    )
    return JSON.parse(new TextDecoder().decode(plain)) as StoredLicense
  } catch {
    return null
  }
}

async function saveLicense(stored: StoredLicense | null): Promise<void> {
  if (!stored) {
    await chrome.storage.local.remove([LICENSE_RECORD])
    await chrome.storage.local.set({ [LICENSE_ACTIVE_FLAG]: false })
    return
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await cipherKey(),
      new TextEncoder().encode(JSON.stringify(stored)),
    ),
  )
  await chrome.storage.local.set({
    [LICENSE_RECORD]: { iv: toBase64(iv), data: toBase64(data) },
    [LICENSE_ACTIVE_FLAG]: true,
  })
}

/** Checks the stored license with the service (or within the offline grace period). Removes it when it is no longer valid. */
export async function checkExtensionLicense(
  product: LicenseProduct,
  options: { force?: boolean } = {},
): Promise<LicenseView> {
  if (EXTENSION_LOCAL_MODE) {
    // Local mode: content scripts may act without a key.
    await chrome.storage.local.set({ [LICENSE_ACTIVE_FLAG]: true })
    return localLicenseView()
  }
  const stored = await readLicense()
  if (
    stored &&
    !options.force &&
    Date.now() - new Date(stored.lastCheckedAt).getTime() < RECHECK_MS &&
    new Date(stored.expiresAt).getTime() > Date.now()
  ) {
    return {
      state: 'active',
      expiresAt: stored.expiresAt,
      keyEnd: stored.keyEnd,
      keyLength: stored.key.length,
      products: stored.products,
      activatedAt: stored.activatedAt,
      lastCheckedAt: stored.lastCheckedAt,
      offline: false,
    }
  }
  const result = await checkStoredLicense(stored, product, await installationId())
  if (result.view.state === 'locked' && result.view.reason !== 'offline') await saveLicense(null)
  else if (result.view.state === 'locked')
    await chrome.storage.local.set({ [LICENSE_ACTIVE_FLAG]: false })
  else if (result.stored) await saveLicense(result.stored)
  return result.view
}

export async function activateExtensionLicense(
  product: LicenseProduct,
  key: string,
): Promise<LicenseView> {
  if (EXTENSION_LOCAL_MODE) return localLicenseView()
  try {
    const result = await activateLicense(key, product, await installationId())
    if (result.stored) await saveLicense(result.stored)
    return result.view
  } catch {
    return {
      state: 'locked',
      reason: 'error',
      message: 'The license service did not answer. Check your internet connection and try again.',
    }
  }
}

/** True when content scripts may act (set by the popup and the background start-up check). */
export async function isLicenseActive(): Promise<boolean> {
  return (await chrome.storage.local.get([LICENSE_ACTIVE_FLAG]))[LICENSE_ACTIVE_FLAG] === true
}

/* Styles from the design tokens (packages/ui/src/tokens.css, loaded by every extension page): the extensions use the light theme.
   The header is an inverse (charcoal) panel with a green tint, like the desktop Settings → License card. */
const styles = `
  html,body{margin:0}
  .lg-lic{box-sizing:border-box;display:flex;flex-direction:column;width:360px;max-width:100%;margin:0 auto;height:100%;min-height:560px;font-family:var(--ui-font-sans);font-size:var(--ui-text-md);line-height:1.4;color:var(--ui-color-text);background:var(--ui-color-surface)}
  .lg-lic *{box-sizing:border-box}
  .lg-lic-head{position:relative;overflow:hidden;padding:var(--ui-space-6) var(--ui-space-5) var(--ui-space-5);text-align:center;color:var(--ui-color-surface);background:linear-gradient(150deg,color-mix(in srgb,var(--ui-color-primary) 24%,var(--ui-color-surface-inverse)),var(--ui-color-surface-inverse) 70%)}
  .lg-lic-head::after{content:'';position:absolute;right:-60px;top:-60px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--ui-color-accent) 40%,transparent),transparent 65%)}
  .lg-lic-head img{position:relative;z-index:1;width:58px;height:58px;padding:var(--ui-space-1-5);border-radius:var(--ui-radius-xl);background:var(--ui-color-surface);box-shadow:var(--ui-shadow-lg)}
  .lg-lic-head h1{position:relative;z-index:1;margin:var(--ui-space-3) 0 0;font-size:var(--ui-text-2xl);letter-spacing:-.01em}
  .lg-lic-head p{position:relative;z-index:1;margin:var(--ui-space-1) 0 0;font-size:var(--ui-text-sm);color:color-mix(in srgb,var(--ui-color-surface) 75%,transparent)}
  .lg-lic-body{flex:1;display:flex;flex-direction:column;padding:var(--ui-space-4-5)}
  .lg-lic-body label{font-size:var(--ui-text-sm);font-weight:var(--ui-weight-semibold);color:var(--ui-color-text-secondary)}
  .lg-lic-field{display:flex;align-items:center;gap:var(--ui-space-2-5);margin-top:var(--ui-space-2);padding:var(--ui-space-3);border:1.5px solid var(--ui-color-primary-muted);border-radius:var(--ui-field-radius);background:var(--ui-color-surface);box-shadow:0 0 0 4px var(--ui-color-primary-soft)}
  .lg-lic-field:focus-within{border-color:var(--ui-color-primary)}
  .lg-lic-field.bad{border-color:var(--ui-color-danger-border);box-shadow:0 0 0 4px var(--ui-color-danger-soft)}
  .lg-lic-field svg{flex:none;color:var(--ui-color-primary)}
  .lg-lic-field textarea{flex:1;min-width:0;height:20px;padding:0;border:0;outline:0;resize:none;overflow:hidden;white-space:nowrap;background:none;font-family:var(--ui-font-mono);font-size:var(--ui-text-sm);font-weight:var(--ui-weight-medium);line-height:20px;color:var(--ui-color-text)}
  .lg-lic-field textarea::placeholder{color:var(--ui-color-text-muted);font-family:var(--ui-font-sans);font-size:var(--ui-text-md)}
  .lg-lic-btn{height:var(--ui-control-height-lg);margin-top:var(--ui-space-3);border:0;border-radius:var(--ui-button-radius-lg);background:var(--ui-color-primary);color:var(--ui-color-on-primary);font-family:var(--ui-font-sans);font-size:var(--ui-text-base);font-weight:var(--ui-weight-semibold);box-shadow:0 10px 24px color-mix(in srgb,var(--ui-color-primary) 25%,transparent);cursor:pointer}
  .lg-lic-btn:hover:not(:disabled){background:var(--ui-color-primary-hover)}
  .lg-lic-btn:disabled{opacity:.65;cursor:default}
  .lg-lic-err{display:flex;gap:var(--ui-space-2);margin-top:var(--ui-space-2-5);padding:var(--ui-space-2-5) var(--ui-space-3);border:var(--ui-border-width) solid var(--ui-color-danger-border);border-radius:var(--ui-radius-md);background:var(--ui-color-danger-soft);color:var(--ui-color-danger);font-size:var(--ui-text-sm);line-height:1.45}
  .lg-lic-slots{display:flex;flex-wrap:wrap;gap:var(--ui-space-2);margin-top:auto}
  .lg-lic-slot{display:flex;align-items:center;gap:var(--ui-space-1-5);padding:var(--ui-space-1-5) var(--ui-space-3);border:var(--ui-border);border-radius:var(--ui-radius-full);background:var(--ui-color-surface);font-size:var(--ui-text-sm);color:var(--ui-color-text-secondary)}
  .lg-lic-slot svg{color:var(--ui-color-primary)}
  .lg-lic-note{margin:var(--ui-space-2) 0 0;color:var(--ui-color-text-secondary);font-size:var(--ui-text-xs)}
  .lg-lic-wait{display:grid;place-items:center;width:360px;max-width:100%;margin:0 auto;height:560px;color:var(--ui-color-text-secondary);font-family:var(--ui-font-sans);font-size:var(--ui-text-md)}
`
const keyIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8.7-8.7M17 6l3 3M14.5 8.5l2 2" />
  </svg>
)
const slotIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12 5 5 9-10" />
  </svg>
)

/** The license screen (design B): brand header, key field, Activate, and the products one key covers. */
export function ExtensionLicenseScreen({
  product,
  logo,
  initialMessage,
  onActivated,
}: {
  product: LicenseProduct
  logo: string
  initialMessage?: string
  onActivated(view: LicenseView): void
}) {
  const name = LICENSE_PRODUCTS.find((item) => item.id === product)?.name ?? product
  const short = LICENSE_PRODUCTS.find((item) => item.id === product)?.short ?? product
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(initialMessage ?? '')
  const { key, fieldProps } = useMaskedKey(() => setMessage(''))
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!key.trim() || busy) return
    setBusy(true)
    const view = await activateExtensionLicense(product, key)
    setBusy(false)
    if (view.state === 'active') onActivated(view)
    else setMessage(view.message)
  }
  return (
    <div className="lg-lic">
      <style>{styles}</style>
      <header className="lg-lic-head">
        <img src={logo} alt="" />
        <h1>{name}</h1>
        <p>License required to continue</p>
      </header>
      <form className="lg-lic-body" onSubmit={(event) => void submit(event)}>
        <label htmlFor="lg-lic-key">License key</label>
        <div className={`lg-lic-field${message ? ' bad' : ''}`}>
          {keyIcon}
          <textarea
            id="lg-lic-key"
            {...fieldProps}
            rows={1}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            maxLength={200}
            placeholder={`Paste your ${LICENSE_KEY_LENGTH}-character license key`}
            aria-invalid={Boolean(message)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
        </div>
        {message && (
          <div className="lg-lic-err" role="alert">
            {message}
          </div>
        )}
        <button type="submit" className="lg-lic-btn" disabled={busy || !key.trim()}>
          {busy ? 'Checking key...' : `Activate ${short}`}
        </button>
        <div className="lg-lic-slots" aria-label="Products this key can activate">
          {LICENSE_PRODUCTS.map((item) => (
            <span className="lg-lic-slot" key={item.id}>
              {slotIcon}
              {item.short}
            </span>
          ))}
        </div>
        <p className="lg-lic-note">
          One key works once on each product. Key expired? Ask your admin for a new one.
        </p>
      </form>
    </div>
  )
}

/**
 * Entry point for every extension popup: shows the license screen until this extension has an active key,
 * then the popup. A stored key is re-checked with the service when the popup opens (at most once an hour).
 */
export function LicenseGate({
  product,
  logo,
  children,
}: {
  product: LicenseProduct
  logo: string
  children: ReactNode
}) {
  const [view, setView] = useState<LicenseView | null>(null)
  useEffect(() => {
    void checkExtensionLicense(product).then(setView, () =>
      setView({
        state: 'locked',
        reason: 'error',
        message: 'Could not read the license. Try again.',
      }),
    )
  }, [product])
  if (!view)
    return (
      <div className="lg-lic-wait">
        <style>{styles}</style>Checking license...
      </div>
    )
  if (view.state === 'active') return <>{children}</>
  return (
    <ExtensionLicenseScreen
      product={product}
      logo={logo}
      initialMessage={view.reason === 'missing' ? '' : view.message}
      onActivated={setView}
    />
  )
}
