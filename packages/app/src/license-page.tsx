import { useState } from 'react'
import { LICENSE_KEY_LENGTH, LICENSE_PRODUCTS, maskLicenseKey, type LicenseProduct, type LicenseView } from '@leadsghr/license'
import { useMaskedKey } from '@leadsghr/license/masked-key'
import { SplashBackground } from './splash-screen'

const logoUrl = new URL('../../../public/leadsghr-logo-v1.svg', import.meta.url).href
const productLogos: Partial<Record<LicenseProduct, string>> = {
  mailer: new URL('../../../public/leadsghr-mailer-icon.svg', import.meta.url).href,
  tracker: new URL('../../../public/leadsghr-tracker-icon.svg', import.meta.url).href,
}

type LicenseBridge = { getLicenseStatus(force?: boolean): Promise<LicenseView>; activateLicense(key: string): Promise<LicenseView> }
export const licenseBridge = () => (window as Window & { leadsGhrDesktop?: Partial<LicenseBridge> }).leadsGhrDesktop

/** Start-up license check; the desktop app shows the license screen until it is active. */
export async function loadLicense(): Promise<LicenseView> {
  const api = licenseBridge()
  if (typeof api?.getLicenseStatus !== 'function') return { state: 'locked', reason: 'error', message: 'Restart LeadsGhr to load the license check.' }
  try { return await api.getLicenseStatus() } catch { return { state: 'locked', reason: 'error', message: 'Could not check the license. Restart LeadsGhr and try again.' } }
}

const desktopIcon = (size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>
const keyIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M17 6l3 3M14.5 8.5l2 2"/></svg>
const checkIcon = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>
const productIcon = (product: LicenseProduct, size = 18) => productLogos[product] ? <img src={productLogos[product]} alt="" width={size} height={size} /> : desktopIcon(size)

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const daysLeft = (value: string) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000))

/** Shown after the splash screen until this computer has an active license (design 1: splash style). */
export function LicenseScreen({ view, onActivated }: { view: Extract<LicenseView, { state: 'locked' }>; onActivated(next: LicenseView): void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(view.reason === 'missing' ? '' : view.message)
  const { key, fieldProps } = useMaskedKey(() => setMessage(''))
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const api = licenseBridge()
    if (!key.trim() || busy) return
    if (typeof api?.activateLicense !== 'function') { setMessage('Restart LeadsGhr to load the license check.'); return }
    setBusy(true)
    try {
      const next = await api.activateLicense(key)
      if (next.state === 'active') onActivated(next)
      else setMessage(next.message)
    } catch { setMessage('Could not activate the key. Try again.') }
    finally { setBusy(false) }
  }
  const onKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }
  return <main className="la-license" aria-labelledby="la-license-title">
    <SplashBackground />
    <form className="la-license-form" onSubmit={(event) => void submit(event)}>
      <img className="la-license-logo" src={logoUrl} alt="LeadsGhr" />
      <h1 id="la-license-title">Unlock your <span>lead workspace</span></h1>
      <p className="la-license-lead">Enter the license key you received from your admin.</p>
      <label className="la-license-label" htmlFor="la-license-key">License key</label>
      <div className={`la-license-field${message ? ' is-error' : ''}`}>{keyIcon}<textarea id="la-license-key" {...fieldProps} rows={1} autoFocus spellCheck={false} autoComplete="off" maxLength={200} placeholder={`Paste your ${LICENSE_KEY_LENGTH}-character license key`} aria-invalid={Boolean(message)} aria-describedby={message ? 'la-license-error' : undefined} onKeyDown={onKey} /></div>
      {message && <p className="la-license-error" id="la-license-error" role="alert">{message}</p>}
      <button type="submit" className="la-license-submit" disabled={busy || !key.trim()}>{busy ? 'Checking key...' : 'Activate LeadsGhr'}</button>
      <div className="la-license-chips" aria-label="Products this key can activate">{LICENSE_PRODUCTS.map((product) => <span key={product.id}>{productIcon(product.id, 15)}{product.name}</span>)}</div>
      <p className="la-license-foot">One key works once on each. Key expired? Ask your admin for a new one.</p>
    </form>
  </main>
}

/** Settings → License (design 1, with the brand-header card): status, masked key, expiry, and where the key is used. */
export function LicenseSettingsPage({ view, onChange }: { view: LicenseView | null; onChange(next: LicenseView): void }) {
  const [checking, setChecking] = useState(false)
  async function checkNow() {
    const api = licenseBridge()
    if (typeof api?.getLicenseStatus !== 'function') return
    setChecking(true)
    try { onChange(await api.getLicenseStatus(true)) } finally { setChecking(false) }
  }
  if (!view || view.state !== 'active') return <section className="la-license-settings"><p className="la-license-settings-note">{view?.state === 'locked' ? view.message : 'Checking license...'}</p></section>
  const left = daysLeft(view.expiresAt)
  return <section className="la-license-settings" aria-label="License">
    <div className="la-license-card">
      <div className="la-license-card-top"><span className="la-license-badge">{checkIcon}{view.offline ? 'Active (offline)' : 'Active'}</span><span>Activated {formatDate(view.activatedAt)} on this computer</span></div>
      <div className="la-license-card-grid">
        <div><small>License key</small><strong className="la-license-mono">{maskLicenseKey(view.keyEnd)}</strong></div>
        <div><small>Expires</small><strong>{formatDate(view.expiresAt)} <em>· {left} day{left === 1 ? '' : 's'} left</em></strong></div>
      </div>
    </div>
    <div className="la-license-used">
      <div className="la-license-used-head"><h3>Used on</h3><button type="button" onClick={() => void checkNow()} disabled={checking}>{checking ? 'Checking...' : 'Check now'}</button></div>
      <ul>{LICENSE_PRODUCTS.map((product) => {
        const used = product.id === 'desktop' || view.products[product.id] === 'used'
        return <li key={product.id}>{productIcon(product.id)}<strong>{product.name}</strong><span className={used ? 'is-used' : ''}>{product.id === 'desktop' ? 'This computer' : used ? 'Activated' : 'Not activated yet'}</span></li>
      })}</ul>
      <p className="la-license-settings-note">Last checked {new Date(view.lastCheckedAt).toLocaleString()}. The key is stored encrypted on this computer and is never shown in full.{view.offline ? ' LeadsGhr could not reach the license service and is working offline; it checks again at the next start.' : ''}</p>
    </div>
  </section>
}
