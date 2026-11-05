import { useState } from 'react'
import Avatar, { genConfig } from 'react-nice-avatar'
import type { DesktopPreferences } from '@leadsghr/schemas'
import { saveLocalAccount, type LocalAccount } from './account-data'

type PreferenceKey = Exclude<keyof DesktopPreferences, 'crawlerEmailSource' | 'crawlerFetchMethod'>
const groups: { title: string; description: string; options: { key: PreferenceKey; title: string; detail: string }[] }[] = [
  { title: 'Crawler', description: 'Control the public webpage test view.', options: [
    { key: 'showCrawlerPreview', title: 'Show webpage in Crawler', detail: 'Display the live page while the crawler scrolls and extracts emails.' },
    { key: 'crawlerContactOnly', title: 'Crawl homepage and contact page only', detail: 'On: inspect the homepage and contact page. Off: the Pipeline follows new same-site links recursively; the Crawler test queues links found on the homepage.' },
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

export function ProfilePage({ section, preferences, onPreferencesChange, saveMessage, account, onAccountChange, avatarSeed, onRegenerateAvatar }: { section: 'account' | 'preferences'; preferences: DesktopPreferences; onPreferencesChange(next: DesktopPreferences): void; saveMessage: string; account: LocalAccount; onAccountChange(next: LocalAccount): void; avatarSeed: string; onRegenerateAvatar(): void }) {
  const [preferenceCategory, setPreferenceCategory] = useState<'Crawler' | 'Search'>('Crawler')
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
      <div className="la-profile-tabs" role="tablist" aria-label="Preference categories">
        {(['Crawler', 'Search'] as const).map((category) => <button type="button" role="tab" id={`la-preference-tab-${category.toLowerCase()}`} aria-controls="la-preference-panel" key={category} aria-selected={preferenceCategory === category} onClick={() => setPreferenceCategory(category)}>{category}</button>)}
      </div>
      <div className="la-preference-content" role="tabpanel" id="la-preference-panel" aria-labelledby={`la-preference-tab-${preferenceCategory.toLowerCase()}`}>
        {preferenceCategory === 'Crawler' && <section className="la-profile-preference-group"><div><h2>Crawler email source</h2><p>Choose how the Crawler test finds addresses on public pages.</p></div><div className="la-profile-option-list"><label className="la-profile-option"><span><strong>Our behavior</strong><small>Use the existing LeadsGhr page extraction and URL queue.</small></span><input type="radio" name="crawler-email-source" checked={preferences.crawlerEmailSource === 'leadsghr'} onChange={() => onPreferencesChange({ ...preferences, crawlerEmailSource: 'leadsghr' })} /></label><label className="la-profile-option"><span><strong>Email Hunter-style</strong><small>Scan the complete rendered HTML, including scripts and attributes. This can include placeholders and false matches; it does not access the installed Chrome extension or its saved results.</small></span><input type="radio" name="crawler-email-source" checked={preferences.crawlerEmailSource === 'email-hunter'} onChange={() => onPreferencesChange({ ...preferences, crawlerEmailSource: 'email-hunter' })} /></label></div></section>}
        {preferenceCategory === 'Crawler' && <section className="la-profile-preference-group"><div><h2>Page fetch method</h2><p>Choose how Crawler and Pipeline inspect public websites. Search listings still use their existing browser flow.</p></div><div className="la-profile-option-list"><label className="la-profile-option"><span><strong>Browser rendering</strong><small>Open each page in an isolated Electron browser and scroll it. Slower, but can find content added by JavaScript.</small></span><input type="radio" name="crawler-fetch-method" checked={preferences.crawlerFetchMethod === 'browser'} onChange={() => onPreferencesChange({ ...preferences, crawlerFetchMethod: 'browser' })} /></label><label className="la-profile-option"><span><strong>Direct HTTP</strong><small>Inspect the public HTML response without loading a browser. Faster, but JavaScript-added content will be missed.</small></span><input type="radio" name="crawler-fetch-method" checked={preferences.crawlerFetchMethod === 'http'} onChange={() => onPreferencesChange({ ...preferences, crawlerFetchMethod: 'http' })} /></label></div></section>}
        {groups.filter((group) => preferenceCategory === 'Crawler' ? group.title === 'Crawler' : group.title !== 'Crawler').map((group) => <section className="la-profile-preference-group" key={group.title}><div><h2>{group.title}</h2><p>{group.description}</p></div><div className="la-profile-option-list">{group.options.map((option) => <label className="la-profile-option" key={option.key}><span><strong>{option.title}</strong><small>{option.detail}</small></span><input type="checkbox" checked={preferences[option.key]} onChange={(event) => onPreferencesChange({ ...preferences, [option.key]: event.target.checked })} aria-label={option.title} /></label>)}</div></section>)}
        <p className="la-profile-note">Preference settings are saved on this computer.</p><p className="la-profile-save-status" role="status">{saveMessage}</p>
      </div>
    </div>}
  </div>
}
