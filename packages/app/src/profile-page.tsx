import { useState } from 'react'
import Avatar, { genConfig } from 'react-nice-avatar'
import type { DesktopPreferences } from '@leadsghr/schemas'
import { saveLocalAccount, type LocalAccount } from './account-data'

type SettingsBridge = {
  exportPreferences(): Promise<string>
  importPreferences(): Promise<{ preferences: DesktopPreferences; path: string; applied: number; skipped: number; ignored: number } | null>
  showSettingsExport(path: string): Promise<void>
}
const settingsBridge = () => (window as Window & { leadsGhrDesktop?: Partial<SettingsBridge> }).leadsGhrDesktop

type SettingsNotice =
  | { kind: 'exported'; path: string }
  | { kind: 'imported'; path: string; applied: number; skipped: number; ignored: number }
  | { kind: 'error'; message: string }

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "12 settings updated", plus what was left unchanged when the file came from another version. */
function importSummary(notice: { applied: number; skipped: number; ignored: number }): string {
  const parts = [`${plural(notice.applied, 'setting')} updated`]
  if (notice.skipped) parts.push(`${plural(notice.skipped, 'setting')} kept as before (value not supported)`)
  if (notice.ignored) parts.push(`${plural(notice.ignored, 'setting')} from another version ignored`)
  return parts.join('; ')
}

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path

/** Export and import of all preferences as a JSON file, with a notice after each action. */
function SettingsTransfer({ onImported }: { onImported(next: DesktopPreferences): void }) {
  const [notice, setNotice] = useState<SettingsNotice | null>(null)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)

  async function exportSettings() {
    const api = settingsBridge()
    if (!api?.exportPreferences) { setNotice({ kind: 'error', message: 'Restart the desktop app to enable settings export.' }); return }
    setBusy('export')
    try { setNotice({ kind: 'exported', path: await api.exportPreferences() }) }
    catch (error) { setNotice({ kind: 'error', message: error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(error) }) }
    finally { setBusy(null) }
  }

  async function importSettings() {
    const api = settingsBridge()
    if (!api?.importPreferences) { setNotice({ kind: 'error', message: 'Restart the desktop app to enable settings import.' }); return }
    setBusy('import')
    try {
      const result = await api.importPreferences()
      if (!result) return
      onImported(result.preferences)
      setNotice({ kind: 'imported', path: result.path, applied: result.applied ?? 0, skipped: result.skipped ?? 0, ignored: result.ignored ?? 0 })
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(error) })
    } finally { setBusy(null) }
  }

  return <div className="la-settings-transfer">
    <div className="la-settings-transfer-bar">
      <div><h2>Set up in one click</h2><p>Import a teammate's settings instead of choosing every option again, or export yours to share.</p></div>
      <div className="la-settings-transfer-actions">
        <button type="button" disabled={busy !== null} onClick={() => void importSettings()}>{busy === 'import' ? 'Importing…' : 'Import settings'}</button>
        <button type="button" className="primary" disabled={busy !== null} onClick={() => void exportSettings()}>{busy === 'export' ? 'Exporting…' : 'Export settings'}</button>
      </div>
    </div>
    {notice && <div className={`la-settings-notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span className="la-settings-notice-icon" aria-hidden="true">{notice.kind === 'error' ? '!' : '✓'}</span>
      <div className="la-settings-notice-text">
        {notice.kind === 'exported' && <><strong>Settings exported</strong><span>Saved as {fileName(notice.path)} in C:\LeadsGhr\settings. Send this file to share your settings.</span></>}
        {notice.kind === 'imported' && <><strong>Settings imported successfully</strong><span>{importSummary(notice)} from {fileName(notice.path)}.</span></>}
        {notice.kind === 'error' && <><strong>Settings not changed</strong><span>{notice.message}</span></>}
      </div>
      {notice.kind === 'exported' && <button type="button" onClick={() => void settingsBridge()?.showSettingsExport?.(notice.path)}>Show in folder</button>}
      <button type="button" className="la-settings-notice-close" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
    </div>}
  </div>
}

type PreferenceKey = Exclude<keyof DesktopPreferences, 'crawlerEmailSource' | 'crawlerFetchMethod' | 'crawlerConcurrentPages' | 'emailVerifyMailFrom' | 'emailVerifyEhlo' | 'emailVerifyPerSession' | 'emailVerifyPaceMs'>
const groups: { title: string; description: string; options: { key: PreferenceKey; title: string; detail: string }[] }[] = [
  { title: 'Crawler', description: 'Control the public webpage test view.', options: [
    { key: 'showCrawlerPreview', title: 'Show webpage in Crawler', detail: 'Display the live page while the crawler scrolls and extracts emails.' },
    { key: 'crawlerContactOnly', title: 'Crawl homepage and contact page only', detail: 'On: inspect the homepage and contact page. Off: Crawler and Pipeline queue new same-site links found on crawled pages, up to their page limits.' },
  ] },
  { title: 'Search window', description: 'Choose whether the separate Chrome window is visible.', options: [
    { key: 'showChromeDuringSearch', title: 'Show Chrome while searching', detail: 'Watch each location search in Chrome. Turn off to run it in the background.' },
  ] },
  { title: 'Search sources', description: 'Choose whether public Maps business listings appear in Search Results.', options: [
    { key: 'searchGoogleMaps', title: 'Show Google Maps listings', detail: 'Show public business rows found in Maps.' },
  ] },
  { title: 'Search breadth', description: 'Control how many searches are made for each selected niche and location.', options: [
    { key: 'useNicheKeywords', title: 'Use Niche Library search terms', detail: 'Off: search the niche name once per location (faster). On: search every term in its pack (broader, slower).' },
  ] },
  { title: 'Search result filters', description: 'Choose which public business listings appear in the temporary table.', options: [
    { key: 'showListingsWithoutWebsite', title: 'Show businesses without a website', detail: 'Off by default. Hide listings whose website URL is not shown.' },
  ] },
  { title: 'Search result fields', description: 'Keep and display these fields in the temporary contractor results table.', options: [
    { key: 'includeCompanyName', title: 'Company name', detail: 'Include the business name when it is available.' },
    { key: 'includeWebsite', title: 'Website URL', detail: 'Include a clickable public business website link.' },
    { key: 'includePhone', title: 'Phone number', detail: 'Include a publicly displayed phone number.' },
    { key: 'includeAddress', title: 'Street address', detail: 'Include an address shown on the public result card.' },
    { key: 'includeLocation', title: 'Searched location', detail: 'Include the location used for this search.' },
  ] },
]

export function ProfilePage({ section, preferences, onPreferencesChange, onPreferencesImported, saveMessage, account, onAccountChange, avatarSeed, onRegenerateAvatar }: { section: 'account' | 'preferences'; preferences: DesktopPreferences; onPreferencesChange(next: DesktopPreferences): void; onPreferencesImported(next: DesktopPreferences): void; saveMessage: string; account: LocalAccount; onAccountChange(next: LocalAccount): void; avatarSeed: string; onRegenerateAvatar(): void }) {
  const [preferenceCategory, setPreferenceCategory] = useState<'Crawler' | 'Search' | 'Email Validation'>('Crawler')
  const [draft, setDraft] = useState(account)
  const [accountMessage, setAccountMessage] = useState('')
  function saveAccount(event: React.FormEvent) {
    event.preventDefault()
    const next = { firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), email: draft.email.trim() }
    if (!next.firstName || !next.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) { setAccountMessage('Enter a first name, last name, and valid email.'); return }
    try { saveLocalAccount(next); onAccountChange(next); setAccountMessage('Profile details saved on this computer.') }
    catch { setAccountMessage('Could not save profile details.') }
  }
  return <div className="la-profile">
    {section === 'account' ? <div className="la-profile-account-content" aria-label="Profile">
      <section className="la-profile-account"><div className="la-profile-identity"><div className="la-profile-avatar"><Avatar style={{ width: 76, height: 76 }} {...genConfig(avatarSeed)} /></div><div><h2>{account.firstName} {account.lastName}</h2><p>Local workspace profile</p></div><button type="button" onClick={onRegenerateAvatar}>Generate new</button></div>
      <form className="la-account-form" onSubmit={saveAccount}><div className="la-account-fields"><label>First Name<input type="text" value={draft.firstName} maxLength={80} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} required /></label><label>Last Name<input type="text" value={draft.lastName} maxLength={80} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} required /></label><label className="la-account-email">Email<input type="email" value={draft.email} maxLength={254} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required /></label></div><div className="la-account-actions"><span role="status">{accountMessage}</span><button type="submit">Save profile</button></div></form>
      <p className="la-profile-note">These details are stored on this computer. Supabase authentication is not connected yet.</p></section>
      <section className="la-profile-account la-password-section"><div><h2>Reset Password</h2><p>Account password changes will be available when Supabase sign-in is connected.</p></div><div className="la-account-fields"><label>Current password<input type="password" autoComplete="current-password" disabled placeholder="Authentication required" /></label><label>New password<input type="password" autoComplete="new-password" disabled placeholder="Authentication required" /></label><label>Confirm new password<input type="password" autoComplete="new-password" disabled placeholder="Authentication required" /></label></div><button type="button" disabled>Reset password</button></section>
    </div> : <div className="la-profile-preferences" aria-label="Preferences">
      <SettingsTransfer onImported={onPreferencesImported} />
      <div className="la-profile-tabs" role="tablist" aria-label="Preference categories">
        {(['Crawler', 'Search', 'Email Validation'] as const).map((category) => <button type="button" role="tab" id={`la-preference-tab-${category.toLowerCase().replace(/\s+/g, '-')}`} aria-controls="la-preference-panel" key={category} aria-selected={preferenceCategory === category} onClick={() => setPreferenceCategory(category)}>{category}</button>)}
      </div>
      <div className="la-preference-content" role="tabpanel" id="la-preference-panel" aria-labelledby={`la-preference-tab-${preferenceCategory.toLowerCase().replace(/\s+/g, '-')}`}>
        {preferenceCategory === 'Crawler' && <section className="la-profile-preference-group"><div><h2>Crawler email source</h2><p>Choose how the Crawler test finds addresses on public pages.</p></div><div className="la-profile-option-list"><label className="la-profile-option"><span><strong>Our behavior</strong><small>Use the existing LeadsGhr page extraction and URL queue.</small></span><input type="radio" name="crawler-email-source" checked={preferences.crawlerEmailSource === 'leadsghr'} onChange={() => onPreferencesChange({ ...preferences, crawlerEmailSource: 'leadsghr' })} /></label><label className="la-profile-option"><span><strong>Email Hunter-style</strong><small>Scan the complete rendered HTML, including scripts and attributes. This can include placeholders and false matches; it does not access the installed Chrome extension or its saved results.</small></span><input type="radio" name="crawler-email-source" checked={preferences.crawlerEmailSource === 'email-hunter'} onChange={() => onPreferencesChange({ ...preferences, crawlerEmailSource: 'email-hunter' })} /></label></div></section>}
        {preferenceCategory === 'Crawler' && <section className="la-profile-preference-group"><div><h2>Page fetch method</h2><p>Choose how Crawler and Pipeline inspect public websites. Search listings still use their existing browser flow.</p></div><div className="la-profile-option-list"><label className="la-profile-option"><span><strong>Browser rendering</strong><small>Open each page in an isolated Electron browser and scroll it. Slower, but can find content added by JavaScript.</small></span><input type="radio" name="crawler-fetch-method" checked={preferences.crawlerFetchMethod === 'browser'} onChange={() => onPreferencesChange({ ...preferences, crawlerFetchMethod: 'browser' })} /></label><label className="la-profile-option"><span><strong>Direct HTTP</strong><small>Inspect the public HTML response without loading a browser. Faster, but JavaScript-added content will be missed.</small></span><input type="radio" name="crawler-fetch-method" checked={preferences.crawlerFetchMethod === 'http'} onChange={() => onPreferencesChange({ ...preferences, crawlerFetchMethod: 'http' })} /></label></div></section>}
        {preferenceCategory === 'Crawler' && <section className="la-profile-preference-group"><div><h2>Concurrent pages</h2><p>Maximum pages inspected at once in Crawler and Pipeline. Same-site requests still respect robots.txt and crawl delays.</p></div><div className="la-profile-option-list"><label className="la-profile-option la-profile-concurrency-option"><span><strong>Workers</strong><small>Choose 1 to 8 pages to process at once.</small></span><input type="number" min="1" max="8" step="1" value={preferences.crawlerConcurrentPages} onChange={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 1 && value <= 8) onPreferencesChange({ ...preferences, crawlerConcurrentPages: value }) }} aria-label="Concurrent pages" /></label></div></section>}
        {preferenceCategory === 'Email Validation' && <section className="la-profile-preference-group"><div><h2>SMTP identity</h2><p>Use a routable mailbox. Addresses like verify@localhost are rejected by gateways before the recipient is checked.</p></div><div className="la-profile-option-list"><label className="la-profile-option la-profile-concurrency-option"><span><strong>MAIL FROM</strong><small>Routable mailbox for the local RCPT probe. Nothing is sent. Default verify@example.com works with many gateways.</small></span><input type="text" value={preferences.emailVerifyMailFrom} maxLength={254} onChange={(event) => onPreferencesChange({ ...preferences, emailVerifyMailFrom: event.currentTarget.value })} aria-label="Email validation MAIL FROM" /></label><label className="la-profile-option la-profile-concurrency-option"><span><strong>EHLO hostname</strong><small>FQDN presented during the SMTP handshake.</small></span><input type="text" value={preferences.emailVerifyEhlo} maxLength={255} onChange={(event) => onPreferencesChange({ ...preferences, emailVerifyEhlo: event.currentTarget.value })} aria-label="Email validation EHLO hostname" /></label></div></section>}
        {preferenceCategory === 'Email Validation' && <section className="la-profile-preference-group"><div><h2>Session pacing</h2><p>How many recipients share one SMTP session, and how long to wait before opening another session to the same mail server.</p></div><div className="la-profile-option-list"><label className="la-profile-option la-profile-concurrency-option"><span><strong>Recipients per session</strong><small>1 to 40. Google hosts use 3 regardless of this value.</small></span><input type="number" min="1" max="40" step="1" value={preferences.emailVerifyPerSession} onChange={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 1 && value <= 40) onPreferencesChange({ ...preferences, emailVerifyPerSession: value }) }} aria-label="Email validation recipients per session" /></label><label className="la-profile-option la-profile-concurrency-option"><span><strong>Pace (ms)</strong><small>Base delay before a new session to the same host.</small></span><input type="number" min="0" max="5000" step="50" value={preferences.emailVerifyPaceMs} onChange={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 0 && value <= 5000) onPreferencesChange({ ...preferences, emailVerifyPaceMs: value }) }} aria-label="Email validation pace milliseconds" /></label></div></section>}
        {preferenceCategory !== 'Email Validation' && groups.filter((group) => preferenceCategory === 'Crawler' ? group.title === 'Crawler' : group.title !== 'Crawler').map((group) => <section className="la-profile-preference-group" key={group.title}><div><h2>{group.title}</h2><p>{group.description}</p></div><div className="la-profile-option-list">{group.options.map((option) => <label className="la-profile-option" key={option.key}><span><strong>{option.title}</strong><small>{option.detail}</small></span><input type="checkbox" checked={preferences[option.key]} onChange={(event) => onPreferencesChange({ ...preferences, [option.key]: event.target.checked })} aria-label={option.title} /></label>)}</div></section>)}
        <p className="la-profile-note">Preference settings are saved on this computer.</p><p className="la-profile-save-status" role="status">{saveMessage}</p>
      </div>
    </div>}
  </div>
}
