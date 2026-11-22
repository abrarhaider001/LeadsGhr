import { useEffect, useRef, useState } from 'react'
import { SplashScreen } from './splash-screen'
import { CrawlerPage } from './crawler-page'
import { EmailFilteringPage } from './email-filtering-page'
import { EmailValidationPage } from './email-validation-page'
import { EmailSpamEnginePage } from './email-spam-engine-page'
import { EmailTrackingPage } from './email-tracking-page'
import { DashboardPage } from './dashboard-page'
import { NicheLibraryPage } from './niche-library-page'
import { PageHeader } from './page-header'
import { SearchSetupPage } from './search-setup-page'
import { SearchResultsPage } from './search-results-page'
import { ProfilePage } from './profile-page'
import { defaultDesktopPreferences, type CrawlExport, type CrawlRunDetail, type CrawlRunSummary, type DesktopPreferences, type PipelineProvider, type SearchCriteria } from '@leadsghr/schemas'
import { applyTheme, followSystemTheme } from './theme'
import { crawlRunBridge } from './crawl-run-bridge'
import { ExportsPage } from './exports-page'
import { PipelineExportPage } from './pipeline-export-page'
import { PipelineOverviewPage } from './pipeline-overview-page'
import { PipelineTimeline } from './pipeline-timeline'
import type { PipelineDraft } from './pipeline-draft'
import { CustomSelect } from './custom-select'
import { Card, EmptyTable, Icon, BrandLogo, BrandMark, NavIcon, type NavIconName } from '@leadsghr/ui'
import Avatar, { genConfig } from 'react-nice-avatar'
import { loadAvatarSeed, loadLocalAccount, saveAvatarSeed, syncProfileFromDisk } from './account-data'
import { EmailSendingPage } from './email-sending-page'
import { UpdateBanner, useAppVersion, useUpdateState } from './updates'

/** Sidebar tabs. Each icon is a NavIcon in the duotone line style (packages/ui/src/nav-icons.tsx; AGENTS.md, "Sidebar icons"). */
const navigation: { label: string; icon: NavIconName }[] = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Pipeline', icon: 'pipeline' },
  { label: 'Crawler', icon: 'crawler' },
  { label: 'New Search', icon: 'newSearch' },
  { label: 'Niche Library', icon: 'nicheLibrary' },
  { label: 'Email Filtering', icon: 'emailFiltering' },
  { label: 'Email Validation', icon: 'emailValidation' },
  { label: 'Email Spam Check', icon: 'emailSpamCheck' },
  { label: 'Email Sending', icon: 'emailSending' },
  { label: 'Email Tracking', icon: 'emailTracking' },
  { label: 'Leads', icon: 'leads' },
  { label: 'Runs', icon: 'runs' },
  { label: 'Profiles', icon: 'profiles' },
  { label: 'Exports', icon: 'exports' },
  { label: 'Compliance', icon: 'compliance' },
  { label: 'Settings', icon: 'settings' },
]
const descriptions: Record<string, string> = {
  Dashboard: 'Real businesses. Public data. More opportunities.',
  Pipeline: 'Create, monitor, and resume your local business crawls.',
  'New Pipeline': 'Choose niches, states, and locations for a new pipeline.',
  'Pipeline Export': 'Your pipeline results have been saved as a CSV file.',
  Crawler: 'Discover public pages and emails from a homepage without saving results.',
  'New Search': 'Find and target leads across niches and locations.',
  'Niche Library': 'Browse and edit local business keyword packs for your searches.',
  'Email Filtering': 'Import Excel or CSV files, remove noisy addresses, and review a clean email list.',
  'Email Validation': 'Check mailbox acceptance with a local SMTP RCPT TO probe.',
  'Email Spam Check': 'Review email content for signals that may affect delivery.',
  'Email Sending': 'Prepare and send email campaigns from your workspace.',
  'Email Tracking': 'Review delivery and engagement for sent emails.',
  'Crawl Results': 'Review businesses found across the selected niche and locations.',
  Leads: 'Review businesses and contacts saved on this computer.',
  Runs: 'Review crawl progress, saved results, and selected state ranges.',
  Profiles: 'Organize reusable search settings and extraction rules.',
  Exports: 'Review and re-export CSV files from saved crawl runs.',
  Compliance: 'Review public data collection and source safeguards.',
  Profile: 'Account details and local workspace profile.',
  Preferences: 'Configure crawler and search behavior.',
}
type LocalLead = { name: string; emails: string[]; phones: string[]; sourceUrl: string }
type LocalRun = { id: string; url: string; status: string; startedAt?: string; finishedAt?: string; error?: string }
type DesktopBridge = { leads(): Promise<LocalLead[]>; runs(): Promise<LocalRun[]>; loadPreferences(): Promise<DesktopPreferences>; savePreferences(input: DesktopPreferences): Promise<DesktopPreferences>; onDisplaySizeChanged?(callback: (size: number) => void): () => void }
const bridge = () => (window as Window & { leadsGhrDesktop?: DesktopBridge }).leadsGhrDesktop

export function LeadsGhrApp() {
  const [page, setPage] = useState('Dashboard')
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [splashComplete, setSplashComplete] = useState(false)
  const [leads, setLeads] = useState<LocalLead[]>([])
  const [runs, setRuns] = useState<LocalRun[]>([])
  const [query, setQuery] = useState('')
  const [navQuery, setNavQuery] = useState('')
  const navSearchRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState('all')
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null)
  const [pipelineDetails, setPipelineDetails] = useState<{ name: string; provider: PipelineProvider } | null>(null)
  const [pipelineDraft, setPipelineDraft] = useState<PipelineDraft | null>(null)
  const [runDetail, setRunDetail] = useState<CrawlRunDetail | null>(null)
  const [crawlRuns, setCrawlRuns] = useState<CrawlRunSummary[]>([])
  const [crawlExports, setCrawlExports] = useState<CrawlExport[]>([])
  const [finishedExport, setFinishedExport] = useState<CrawlExport | null>(null)
  const [historyMessage, setHistoryMessage] = useState('')
  const [searchOrigin, setSearchOrigin] = useState<'Pipeline' | 'New Search'>('Pipeline')
  const [preferences, setPreferences] = useState<DesktopPreferences>(defaultDesktopPreferences)
  const [preferencesMessage, setPreferencesMessage] = useState('')
  useEffect(() => { applyTheme(preferences.theme); return followSystemTheme(preferences.theme) }, [preferences.theme])
  // Ctrl + / Ctrl - / Ctrl 0 change the zoom in the main process, which saves it; mirror it here so Appearance shows it.
  useEffect(() => bridge()?.onDisplaySizeChanged?.((displaySize) => setPreferences((current) => ({ ...current, displaySize }))), [])
  const [account, setAccount] = useState(loadLocalAccount)
  const appVersion = useAppVersion()
  const updateState = useUpdateState()
  const [avatarSeed, setAvatarSeed] = useState(loadAvatarSeed)
  // The profile file in the data folder wins over the start-up copy (for example after a reinstall).
  useEffect(() => { let active = true; void syncProfileFromDisk().then((stored) => { if (active && stored) { setAccount(stored.account); setAvatarSeed(stored.avatarSeed) } }); return () => { active = false } }, [])
  function regenerateAvatar() { const next = crypto.randomUUID(); saveAvatarSeed(next); setAvatarSeed(next) }

  useEffect(() => {
    let active = true
    const desktop = bridge()
    if (typeof desktop?.loadPreferences === 'function') void desktop.loadPreferences().then((saved) => { if (active) setPreferences(saved) }).catch(() => { if (active) setPreferencesMessage('Could not load saved preferences.') })
    else setPreferencesMessage('Restart the desktop app to enable saved preferences.')
    return () => { active = false }
  }, [])

  async function refreshCrawlHistory() {
    const desktop = crawlRunBridge()
    if (!desktop?.listCrawlRuns) return
    try {
      const [savedRuns, savedExports] = await Promise.all([desktop.listCrawlRuns(), desktop.listCrawlExports()])
      setCrawlRuns(savedRuns)
      setCrawlExports(savedExports)
      setHistoryMessage('')
    } catch (error) { setHistoryMessage(`Could not load crawl history: ${String(error)}`) }
  }

  useEffect(() => { void refreshCrawlHistory() }, [])

  async function resumeCrawl(id: string) {
    try {
      const saved = await crawlRunBridge()?.getCrawlRun(id)
      if (!saved) throw new Error('Saved run was not found')
      setRunDetail(saved)
      setPipelineDetails({ name: saved.name, provider: saved.provider })
      setSearchCriteria(saved.criteria)
      setSearchOrigin(saved.kind === 'pipeline' ? 'Pipeline' : 'New Search')
      setPage('Crawl Results')
    } catch (error) { setHistoryMessage(`Could not resume crawl: ${String(error)}`) }
  }

  async function exportCrawl(id: string) {
    try {
      await crawlRunBridge()?.exportCrawlRun(id, true)
      await refreshCrawlHistory()
    } catch (error) { setHistoryMessage(`Could not export CSV: ${String(error)}`) }
  }

  async function deletePipeline(id: string) {
    const run = crawlRuns.find((item) => item.id === id && item.kind === 'pipeline')
    if (!run) return
    if (!window.confirm(`Delete "${run.name}"? This removes its saved results, URL queue, and export history from the app. CSV files already saved on disk remain available.`)) return
    try {
      await crawlRunBridge()?.deleteCrawlRun(id)
      await refreshCrawlHistory()
    } catch (error) {
      const detail = String(error)
      setHistoryMessage(detail.includes("No handler registered for 'leadsghr:crawl-runs:delete'")
        ? 'Restart the desktop app to enable pipeline deletion, then try again. The current window is connected to an older Electron main process.'
        : `Could not delete pipeline: ${detail}`)
    }
  }

  useEffect(() => {
    const focusNavigation = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navSearchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusNavigation)
    return () => window.removeEventListener('keydown', focusNavigation)
  }, [])

  function updatePreferences(next: DesktopPreferences) {
    setPreferences(next)
    setPreferencesMessage('Saving preferences...')
    const desktop = bridge()
    if (typeof desktop?.savePreferences === 'function') void desktop.savePreferences(next).then(() => setPreferencesMessage('Preferences saved on this computer.')).catch(() => setPreferencesMessage('Could not save preferences.'))
    else setPreferencesMessage('Restart the desktop app to save preferences.')
  }

  async function showPage(next: string) {
    setPage(next)
    setQuery('')
    setFilter('all')
    if (next === 'Leads') setLeads(await bridge()?.leads() ?? [])
    if (next === 'Runs') setRuns(await bridge()?.runs() ?? [])
    if (next === 'Dashboard' || next === 'Runs' || next === 'Exports' || next === 'Pipeline') await refreshCrawlHistory()
  }

  const visibleLeads = leads.filter((lead) => (filter === 'all' || (filter === 'email' ? lead.emails.length > 0 : lead.emails.length === 0)) && [lead.name, lead.sourceUrl, ...lead.emails].some((part) => part.toLowerCase().includes(query.toLowerCase())))
  const visibleRuns = runs.filter((run) => (filter === 'all' || run.status === filter) && [run.url, run.status, run.error ?? ''].some((part) => part.toLowerCase().includes(query.toLowerCase())))

  if (!splashComplete) return <SplashScreen onComplete={() => setSplashComplete(true)} />
  return <div className="la-shell">
    <aside className="la-sidebar">
      <div className="la-brand"><BrandLogo className="la-brand-wordmark" /><BrandMark className="la-brand-symbol" size={32} /></div>
      <label className="la-sidebar-search"><Icon name="search" size={15}/><input ref={navSearchRef} type="search" value={navQuery} onChange={(event) => setNavQuery(event.target.value)} placeholder="Search..." aria-label="Find a page" /><kbd>Ctrl K</kbd></label>
      <nav className="la-nav" aria-label="Main navigation">
        {navigation.filter(({ label }) => label.toLowerCase().includes(navQuery.trim().toLowerCase()) || (label === 'Settings' && 'preferences'.includes(navQuery.trim().toLowerCase()))).map(({ label, icon }) => <div key={label} className="la-nav-item">{!navQuery && (label === 'Dashboard' || label === 'Crawler' || label === 'Leads') && <span className="la-nav-group">{label === 'Dashboard' ? 'MAIN' : label === 'Crawler' ? 'DISCOVERY TOOLS' : 'WORKSPACE'}</span>}<button type="button" aria-current={label !== 'Settings' && (page === label || ((page === 'Crawl Results' || page === 'New Pipeline' || page === 'Pipeline Export') && label === searchOrigin)) ? 'page' : undefined} aria-expanded={label === 'Settings' ? settingsExpanded : undefined} aria-controls={label === 'Settings' ? 'la-settings-submenu' : undefined} onClick={() => label === 'Settings' ? setSettingsExpanded((current) => !current) : void showPage(label)} title={label}><NavIcon name={icon} size={18} /><span>{label}</span>{label === 'Settings' && <svg className="la-nav-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>}</button>{label === 'Settings' && <div className="la-sidebar-settings-collapse" data-open={Boolean(settingsExpanded || navQuery.trim())} inert={!(settingsExpanded || navQuery.trim())}><div className="la-sidebar-settings-clip"><div className="la-sidebar-settings-children" id="la-settings-submenu"><button type="button" aria-current={page === 'Preferences' ? 'page' : undefined} onClick={() => void showPage('Preferences')}>Preferences</button></div></div></div>}</div>)}
      </nav>
      <div className="la-sidebar-bottom"><button className="la-sidebar-footer" type="button" aria-label="Open profile" aria-current={page === 'Profile' ? 'page' : undefined} onClick={() => void showPage('Profile')}><div className="la-sidebar-avatar"><Avatar style={{ width: 28, height: 28 }} {...genConfig(avatarSeed)} /></div><span><strong>Hi, {account.firstName}</strong><small>Local workspace{appVersion ? ` · v${appVersion}` : ''}</small></span></button></div>
    </aside>
    <main className="la-main">
      <PageHeader title={page} subtitle={descriptions[page]}>
        {page === 'Dashboard' && <span className="la-topbar-account"><span className="la-topbar-account-mark"><BrandMark size={22} /></span><span><strong>LeadsGhr</strong><small>Local workspace</small></span></span>}
      </PageHeader>
      <div className="la-content">
        <UpdateBanner state={updateState} />
        {historyMessage && <p className="la-search-message" role="alert">{historyMessage}</p>}
        {page === 'Dashboard' ? <DashboardPage onNavigate={(next) => void showPage(next)} crawlRuns={crawlRuns} exportCount={crawlExports.length} onExport={(id) => void exportCrawl(id)} />
          : page === 'Crawler' ? <CrawlerPage preferences={preferences} />
          : page === 'Email Filtering' ? <EmailFilteringPage />
          : page === 'Email Validation' ? <EmailValidationPage preferences={preferences} />
          : page === 'Email Spam Check' ? <EmailSpamEnginePage />
          : page === 'Email Sending' ? <EmailSendingPage />
          : page === 'Email Tracking' ? <EmailTrackingPage />
          : page === 'Niche Library' ? <NicheLibraryPage useNicheKeywords={preferences.useNicheKeywords} onStartSearch={() => void showPage('New Search')} />
          : page === 'Pipeline' ? <PipelineOverviewPage runs={crawlRuns} onCreate={(draft, start) => { setSearchOrigin('Pipeline'); setPipelineDraft(draft); setPipelineDetails({ name: draft.name, provider: draft.provider }); setRunDetail(null); setSearchCriteria(draft.criteria); setPage(start ? 'Crawl Results' : 'New Pipeline') }} onResume={(id) => void resumeCrawl(id)} onDelete={(id) => void deletePipeline(id)} />
          : page === 'New Pipeline' || page === 'New Search' ? <SearchSetupPage iconActions pipelineMode={page === 'New Pipeline'} pipelineDraft={page === 'New Pipeline' ? pipelineDraft : null} onSearch={(criteria, details) => { setRunDetail(null); setSearchOrigin(page === 'New Pipeline' ? 'Pipeline' : 'New Search'); setPipelineDetails(details ?? null); setSearchCriteria(criteria); setPage('Crawl Results') }} />
          : page === 'Crawl Results' && searchCriteria ? <SearchResultsPage key={runDetail?.id ?? 'new'} criteria={runDetail?.criteria ?? searchCriteria} preferences={runDetail?.preferences ?? preferences} initialRun={runDetail} pipelineMode={searchOrigin === 'Pipeline'} pipelineName={pipelineDetails?.name} provider={pipelineDetails?.provider ?? 'google-maps'} onBack={() => void showPage(searchOrigin === 'Pipeline' ? 'New Pipeline' : 'New Search')} onSaved={() => void refreshCrawlHistory()} onFinished={(item) => { setFinishedExport(item); setPage('Pipeline Export'); void refreshCrawlHistory() }} />
          : page === 'Pipeline Export' && finishedExport ? <><PipelineTimeline current={5}/><PipelineExportPage item={finishedExport} onPipeline={() => void showPage('Pipeline')} onExports={() => void showPage('Exports')} /></>
          : page === 'Runs' || page === 'Exports' ? <ExportsPage runs={crawlRuns} exports={crawlExports} showExportHistory={page === 'Exports'} onRefresh={refreshCrawlHistory} onResume={(id) => void resumeCrawl(id)} />
          : page === 'Profile' || page === 'Preferences' ? <ProfilePage section={page === 'Profile' ? 'account' : 'preferences'} updateState={updateState} preferences={preferences} onPreferencesChange={updatePreferences} onPreferencesImported={(next) => { setPreferences(next); setPreferencesMessage('') }} saveMessage={preferencesMessage} account={account} onAccountChange={setAccount} avatarSeed={avatarSeed} onRegenerateAvatar={regenerateAvatar} />
          : page === 'Leads' ? <section className="la-records">
            <div className="la-records-toolbar">
              <label className="la-records-search"><Icon name="search" size={17}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies, sources, emails..." aria-label={`Search ${page.toLowerCase()}`} /></label>
              <CustomSelect label="Email filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All leads' }, { value: 'email', label: 'With email' }, { value: 'none', label: 'Without email' }]} />
              <span className="la-records-count">{visibleLeads.length} shown</span>
            </div>
            <div className="la-records-table-wrap"><table className="la-table la-records-table"><thead><tr>{['Business', 'Email', 'Phone', 'Source'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>
              {visibleLeads.map((lead) => <tr key={lead.sourceUrl}><td><strong>{lead.name}</strong></td><td>{lead.emails.join(', ') || 'No email'}</td><td>{lead.phones.join(', ') || '—'}</td><td>{lead.sourceUrl}</td></tr>)}
            </tbody></table>{visibleLeads.length === 0 && <EmptyTable title={leads.length === 0 ? 'No saved leads yet' : 'No matching leads'} description={leads.length === 0 ? 'Saved businesses will appear here after a crawl.' : 'Try another email filter or search term.'} />}</div>
          </section>
          : <Card className="la-local-page"><p>This desktop feature is planned. Use the Crawler tab to test public pages from a homepage without saving data.</p></Card>}
      </div>
    </main>
  </div>
}
