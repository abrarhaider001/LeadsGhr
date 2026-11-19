import { useEffect, useState, type ReactNode } from 'react'
import { activateLicense, checkStoredLicense, LICENSE_PRODUCTS, type LicenseProduct, type LicenseView, type StoredLicense } from './index'

/*
 * License handling shared by every LeadsGhr Chrome extension (Mailer, Tracker, and future ones).
 *
 * The activated license is kept in chrome.storage.local, encrypted with AES-GCM (random key per
 * installation), so the key is not readable in storage. The installation ID is kept separately and never
 * removed, so entering the same key again on this installation re-activates it. Content scripts read only
 * the `leadsghr.licenseActive` flag before doing anything in Gmail.
 */

type ChromeStorageArea = { get(keys: string[]): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void>; remove(keys: string[]): Promise<void> }
declare const chrome: { storage: { local: ChromeStorageArea }; runtime: { getURL(path: string): string } }

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
  const record = (await chrome.storage.local.get([LICENSE_RECORD]))[LICENSE_RECORD] as { iv?: string; data?: string } | undefined
  if (!record?.iv || !record.data) return null
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, await cipherKey(), fromBase64(record.data))
    return JSON.parse(new TextDecoder().decode(plain)) as StoredLicense
  } catch { return null }
}

async function saveLicense(stored: StoredLicense | null): Promise<void> {
  if (!stored) { await chrome.storage.local.remove([LICENSE_RECORD]); await chrome.storage.local.set({ [LICENSE_ACTIVE_FLAG]: false }); return }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cipherKey(), new TextEncoder().encode(JSON.stringify(stored))))
  await chrome.storage.local.set({ [LICENSE_RECORD]: { iv: toBase64(iv), data: toBase64(data) }, [LICENSE_ACTIVE_FLAG]: true })
}

/** Checks the stored license with the service (or within the offline grace period). Removes it when it is no longer valid. */
export async function checkExtensionLicense(product: LicenseProduct, options: { force?: boolean } = {}): Promise<LicenseView> {
  const stored = await readLicense()
  if (stored && !options.force && Date.now() - new Date(stored.lastCheckedAt).getTime() < RECHECK_MS && new Date(stored.expiresAt).getTime() > Date.now()) {
    return { state: 'active', expiresAt: stored.expiresAt, last4: stored.last4, products: stored.products, activatedAt: stored.activatedAt, lastCheckedAt: stored.lastCheckedAt, offline: false }
  }
  const result = await checkStoredLicense(stored, product, await installationId())
  if (result.view.state === 'locked' && result.view.reason !== 'offline') await saveLicense(null)
  else if (result.view.state === 'locked') await chrome.storage.local.set({ [LICENSE_ACTIVE_FLAG]: false })
  else if (result.stored) await saveLicense(result.stored)
  return result.view
}

export async function activateExtensionLicense(product: LicenseProduct, key: string): Promise<LicenseView> {
  try {
    const result = await activateLicense(key, product, await installationId())
    if (result.stored) await saveLicense(result.stored)
    return result.view
  } catch {
    return { state: 'locked', reason: 'error', message: 'The license service did not answer. Check your internet connection and try again.' }
  }
}

/** True when content scripts may act (set by the popup and the background start-up check). */
export async function isLicenseActive(): Promise<boolean> {
  return (await chrome.storage.local.get([LICENSE_ACTIVE_FLAG]))[LICENSE_ACTIVE_FLAG] === true
}

const styles = `
  @font-face{font-family:'Instrument Sans';src:url('/fonts/InstrumentSans.ttf') format('truetype');font-weight:400 700;font-display:swap}
  html,body{margin:0}
  .lg-lic{box-sizing:border-box;display:flex;flex-direction:column;width:360px;max-width:100%;margin:0 auto;height:100%;min-height:560px;font:13px/1.4 'Instrument Sans',Arial,sans-serif;color:#190B2D;background:#FFF}
  .lg-lic-head{position:relative;overflow:hidden;padding:26px 20px 22px;text-align:center;color:#FFF;background:linear-gradient(150deg,#5B12C9,#2A0D5E)}
  .lg-lic-head::after{content:'';position:absolute;right:-60px;top:-60px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(41,203,234,.4),transparent 65%)}
  .lg-lic-head img{width:58px;height:58px;padding:7px;border-radius:16px;background:#FFF;box-shadow:0 10px 30px rgba(10,0,40,.35)}
  .lg-lic-head h1{margin:12px 0 0;font-size:19px;letter-spacing:-.01em}
  .lg-lic-head p{margin:3px 0 0;font-size:12.5px;color:#DCD0F5}
  .lg-lic-body{flex:1;display:flex;flex-direction:column;padding:18px}
  .lg-lic-body label{font-size:12px;font-weight:600;color:#3A2E4D}
  .lg-lic-field{display:flex;align-items:center;gap:10px;height:44px;margin-top:7px;padding:0 14px;border:1.5px solid #D9CCF5;border-radius:12px;background:#FFF;box-shadow:0 0 0 4px #F3EEFF}
  .lg-lic-field.bad{border-color:#E7B4AF;box-shadow:0 0 0 4px #FDF0EF}
  .lg-lic-field svg{flex:none;color:#5B12C9}
  .lg-lic-field input{flex:1;min-width:0;border:0;outline:0;background:none;font:500 14.5px/1 ui-monospace,Consolas,monospace;letter-spacing:.1em;color:#190B2D;text-transform:uppercase}
  .lg-lic-field input::placeholder{color:#B3A9C6;letter-spacing:.1em}
  .lg-lic-btn{height:42px;margin-top:12px;border:0;border-radius:11px;background:#5B12C9;color:#FFF;font:600 14px 'Instrument Sans',Arial,sans-serif;box-shadow:0 10px 24px rgba(91,18,201,.25);cursor:pointer}
  .lg-lic-btn:disabled{opacity:.65;cursor:default}
  .lg-lic-err{display:flex;gap:9px;margin-top:10px;padding:10px 12px;border:1px solid #F3C4C0;border-radius:10px;background:#FDF0EF;color:#8A1C12;font-size:12.5px;line-height:1.45}
  .lg-lic-slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}
  .lg-lic-slot{display:flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid #E4DCF6;border-radius:999px;background:#FBF9FF;font-size:12.5px;color:#3A2E4D}
  .lg-lic-slot svg{color:#5B12C9}
  .lg-lic-note{margin:8px 0 0;color:#675E76;font-size:11.5px}
  .lg-lic *{box-sizing:border-box}
  .lg-lic-wait{display:grid;place-items:center;width:360px;max-width:100%;margin:0 auto;height:560px;color:#675E76;font:13px 'Instrument Sans',Arial,sans-serif}
`
const keyIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M17 6l3 3M14.5 8.5l2 2"/></svg>
const slotIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>

/** The license screen (design B): brand header, key field, Activate, and the products one key covers. */
export function ExtensionLicenseScreen({ product, logo, initialMessage, onActivated }: { product: LicenseProduct; logo: string; initialMessage?: string; onActivated(view: LicenseView): void }) {
  const name = LICENSE_PRODUCTS.find((item) => item.id === product)?.name ?? product
  const short = LICENSE_PRODUCTS.find((item) => item.id === product)?.short ?? product
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(initialMessage ?? '')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!key.trim() || busy) return
    setBusy(true)
    const view = await activateExtensionLicense(product, key)
    setBusy(false)
    if (view.state === 'active') onActivated(view)
    else setMessage(view.message)
  }
  return <div className="lg-lic"><style>{styles}</style>
    <header className="lg-lic-head"><img src={logo} alt="" /><h1>{name}</h1><p>License required to continue</p></header>
    <form className="lg-lic-body" onSubmit={(event) => void submit(event)}>
      <label htmlFor="lg-lic-key">License key</label>
      <div className={`lg-lic-field${message ? ' bad' : ''}`}>{keyIcon}<input id="lg-lic-key" value={key} autoFocus spellCheck={false} autoComplete="off" maxLength={40} placeholder="LGHR-XXXX-XXXX-XXXX" aria-invalid={Boolean(message)} onChange={(event) => { setKey(event.target.value); setMessage('') }} /></div>
      {message && <div className="lg-lic-err" role="alert">{message}</div>}
      <button type="submit" className="lg-lic-btn" disabled={busy || !key.trim()}>{busy ? 'Checking key...' : `Activate ${short}`}</button>
      <div className="lg-lic-slots" aria-label="Products this key can activate">{LICENSE_PRODUCTS.map((item) => <span className="lg-lic-slot" key={item.id}>{slotIcon}{item.short}</span>)}</div>
      <p className="lg-lic-note">One key works once on each product. Key expired? Ask your admin for a new one.</p>
    </form>
  </div>
}

/**
 * Entry point for every extension popup: shows the license screen until this extension has an active key,
 * then the popup. A stored key is re-checked with the service when the popup opens (at most once an hour).
 */
export function LicenseGate({ product, logo, children }: { product: LicenseProduct; logo: string; children: ReactNode }) {
  const [view, setView] = useState<LicenseView | null>(null)
  useEffect(() => { void checkExtensionLicense(product).then(setView, () => setView({ state: 'locked', reason: 'error', message: 'Could not read the license. Try again.' })) }, [product])
  if (!view) return <div className="lg-lic-wait"><style>{styles}</style>Checking license...</div>
  if (view.state === 'active') return <>{children}</>
  return <ExtensionLicenseScreen product={product} logo={logo} initialMessage={view.reason === 'missing' ? '' : view.message} onActivated={setView} />
}
