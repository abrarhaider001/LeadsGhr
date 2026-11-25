import { useCallback, useEffect, useRef, useState } from 'react'
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
import { ScraperResultsPage } from './scraper-results-page'
import { SearchResultsPage } from './search-results-page'
import { ProfilePage } from './profile-page'
import {
  defaultDesktopPreferences,
  type CrawlExport,
  type CrawlRunDetail,
  type CrawlRunSummary,
  type DesktopPreferences,
  type PipelineProvider,
  type SearchCriteria,
} from '@leadsghr/schemas'
import { applyFontSize, applyTheme, followSystemTheme } from './theme'
import { crawlRunBridge } from './crawl-run-bridge'
import { ExportsPage } from './exports-page'
import { PipelineExportPage } from './pipeline-export-page'
import { PipelineOverviewPage } from './pipeline-overview-page'
import { PipelineTimeline } from './pipeline-timeline'
import type { PipelineDraft } from './pipeline-draft'
import { CustomSelect } from './custom-select'
import {
  Button,
  Card,
  Icon,
  BrandLogo,
  BrandMark,
  NavIcon,
  Table,
  type NavIconName,
} from '@leadsghr/ui'
import Avatar, { genConfig } from 'react-nice-avatar'
import {
  loadAvatarSeed,
  loadLocalAccount,
  saveAvatarSeed,
  syncProfileFromDisk,
} from './account-data'
import { EmailSendingPage } from './email-sending-page'
import { ScraperExtensionPage } from './scraper-extension-page'
import { EmailTemplatesPage } from './email-templates-page'
import { UpdateBanner, useAppVersion, useUpdateState } from './updates'
import { LicenseScreen, LicenseSettingsPage, loadLicense } from './license-page'
import type { LicenseView } from '@leadsghr/license'

/** Sidebar tabs. Each icon is a NavIcon in the duotone line style (packages/ui/src/nav-icons.tsx; AGENTS.md, "Sidebar icons"). */
const navigation: { label: string; icon: NavIconName; text?: string }[] = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Pipeline', icon: 'pipeline' },
  { label: 'Crawler', icon: 'crawler' },
  { label: 'New Search', icon: 'newSearch' },
  { label: 'Niche Library', icon: 'nicheLibrary' },
  { label: 'Email', icon: 'email' },
  { label: 'Email Sending', icon: 'emailSending', text: 'LeadsGhr Mailer' },
  { label: 'Email Tracking', icon: 'emailTracking', text: 'LeadsGhr Tracker' },
  { label: 'LeadsGhr Scraper', icon: 'scraper' },
  { label: 'Leads', icon: 'leads' },
  { label: 'Runs', icon: 'runs' },
  { label: 'Profiles', icon: 'profiles' },
  { label: 'Exports', icon: 'exports' },
  { label: 'Compliance', icon: 'compliance' },
  { label: 'Settings', icon: 'settings' },
]
/** The Chrome extension pages are named after their extensions in the sidebar and the page header. */
const pageTitles: Record<string, string> = {
  'Email Sending': 'LeadsGhr Mailer',
  'Email Tracking': 'LeadsGhr Tracker',
}
const descriptions: Record<string, string> = {
  Dashboard: 'Real businesses. Public data. More opportunities.',
  Pipeline: 'Create, monitor, and resume your local business crawls.',
  'New Pipeline': 'Choose niches, states, and locations for a new pipeline.',
  'Pipeline Export': 'Your pipeline results have been saved as a CSV file.',
  Crawler: 'Discover public pages and emails from a homepage without saving results.',
  'New Search': 'Find and target leads across niches and locations.',
  'Niche Library': 'Browse and edit local business keyword packs for your searches.',
  'Email Filtering':
    'Import Excel or CSV files, remove noisy addresses, and review a clean email list.',
  'Email Validation': 'Check mailbox acceptance with a local SMTP RCPT TO probe.',
  'Email Spam Check': 'Review email content for signals that may affect delivery.',
  'Email Sending': 'Send your saved templates to a CSV or Excel list from your own Gmail.',
  'Email Templates': 'Write plain or HTML messages, preview them, and use them in LeadsGhr Mailer.',
  'Email Tracking': 'See when your emails are opened, right in Gmail.',
  'Crawl Results': 'Review businesses found across the selected niche and locations.',
  'LeadsGhr Scraper': 'Download the Chrome extension that searches Google Search business listings for you.',
  'Scraper Results': 'Businesses found by LeadsGhr Scraper on Google Search, saved as they arrive.',
  Leads: 'Review businesses and contacts saved on this computer.',
  Runs: 'Review crawl progress, saved results, and selected state ranges.',
  Profiles: 'Organize reusable search settings and extraction rules.',
  Exports: 'Review and re-export CSV files from saved crawl runs.',
  Compliance: 'Review public data collection and source safeguards.',
  Profile: 'Account details and local workspace profile.',
  Preferences: 'Configure crawler and search behavior.',
  License: 'Your LeadsGhr license on this computer.',
}
type LocalLead = { name: string; emails: string[]; phones: string[]; sourceUrl: string }
type LocalRun = {
  id: string
  url: string
  status: string
  startedAt?: string
  finishedAt?: string
  error?: string
}
type DesktopBridge = {
  leads(): Promise<LocalLead[]>
  runs(): Promise<LocalRun[]>
  loadPreferences(): Promise<DesktopPreferences>
  savePreferences(input: DesktopPreferences): Promise<DesktopPreferences>
  onDisplaySizeChanged?(callback: (size: number) => void): () => void
}
const bridge = () => (window as Window & { leadsGhrDesktop?: DesktopBridge }).leadsGhrDesktop

export function LeadsGhrApp() {
  const [page, setPage] = useState('Dashboard')
  const openPipelineCreateRef = useRef<(() => void) | null>(null)
  const openAddNicheRef = useRef<(() => void) | null>(null)
  const openLibraryAddRef = useRef<(() => void) | null>(null)
  const searchBackRef = useRef<(() => void) | null>(null)
  const exportAgainRef = useRef<(() => void) | null>(null)
  const downloadMailerRef = useRef<(() => void) | null>(null)
  const downloadTrackerRef = useRef<(() => void) | null>(null)
  const downloadScraperRef = useRef<(() => void) | null>(null)
  const [crawlExport, setCrawlExport] = useState<{
    fileName: string
    filePath: string
    entryCount: number
  } | null>(null)
  const reportCrawlExport = useCallback(
    (item: { fileName: string; filePath: string; entryCount: number } | null) =>
      setCrawlExport(item),
    [],
  )
  const [searchStep, setSearchStep] = useState<'details' | 'niches' | 'states' | 'locations'>(
    'niches',
  )
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [splashComplete, setSplashComplete] = useState(false)
  const [leads, setLeads] = useState<LocalLead[]>([])
  const [runs, setRuns] = useState<LocalRun[]>([])
  const [query, setQuery] = useState('')
  const [navQuery, setNavQuery] = useState('')
  const navSearchRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState('all')
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null)
  // A Scraper job opened from the job list on the LeadsGhr Scraper page (Scraper Results then shows it without sending).
  const [openScraperJob, setOpenScraperJob] = useState<{ jobId: string; runId: string; searches: number } | null>(null)
  const [pipelineDetails, setPipelineDetails] = useState<{
    name: string
    provider: PipelineProvider
  } | null>(null)
  const [pipelineDraft, setPipelineDraft] = useState<PipelineDraft | null>(null)
  const [runDetail, setRunDetail] = useState<CrawlRunDetail | null>(null)
  const [crawlRuns, setCrawlRuns] = useState<CrawlRunSummary[]>([])
  const [crawlExports, setCrawlExports] = useState<CrawlExport[]>([])
  const [finishedExport, setFinishedExport] = useState<CrawlExport | null>(null)
  const [historyMessage, setHistoryMessage] = useState('')
  const [searchOrigin, setSearchOrigin] = useState<'Pipeline' | 'New Search'>('Pipeline')
  const [preferences, setPreferences] = useState<DesktopPreferences>(defaultDesktopPreferences)
  const [preferencesMessage, setPreferencesMessage] = useState('')
  useEffect(() => {
    applyTheme(preferences.theme)
    return followSystemTheme(preferences.theme)
  }, [preferences.theme])
  useEffect(() => {
    applyFontSize(preferences.fontSize)
  }, [preferences.fontSize])
  // Ctrl + / Ctrl - / Ctrl 0 change the zoom in the main process, which saves it; mirror it here so Appearance shows it.
  useEffect(
    () =>
      bridge()?.onDisplaySizeChanged?.((displaySize) =>
        setPreferences((current) => ({ ...current, displaySize })),
      ),
    [],
  )
  const [account, setAccount] = useState(loadLocalAccount)
  const appVersion = useAppVersion()
  const updateState = useUpdateState()
  const [avatarSeed, setAvatarSeed] = useState(loadAvatarSeed)
  // The profile file in the data folder wins over the start-up copy (for example after a reinstall).
  // License check starts during the splash screen; the app opens only with an active key.
  const [license, setLicense] = useState<LicenseView | null>(null)
  useEffect(() => {
    let active = true
    void loadLicense().then((view) => {
      if (active) setLicense(view)
    })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    let active = true
    void syncProfileFromDisk().then((stored) => {
      if (active && stored) {
        setAccount(stored.account)
        setAvatarSeed(stored.avatarSeed)
      }
    })
    return () => {
      active = false
    }
  }, [])
  function regenerateAvatar() {
    const next = crypto.randomUUID()
    saveAvatarSeed(next)
    setAvatarSeed(next)
  }

  useEffect(() => {
    let active = true
    const desktop = bridge()
    if (typeof desktop?.loadPreferences === 'function')
      void desktop
        .loadPreferences()
        .then((saved) => {
          if (active) setPreferences(saved)
        })
        .catch(() => {
          if (active) setPreferencesMessage('Could not load saved preferences.')
        })
    else setPreferencesMessage('Restart the desktop app to enable saved preferences.')
    return () => {
      active = false
    }
  }, [])

  // Stable, so the Scraper results page does not resend its job or restart its sync when the app re-renders.
  // refreshCrawlHistory only uses state setters, so the first version stays correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refreshScraperHistory = useCallback(() => void refreshCrawlHistory(), [])

  async function refreshCrawlHistory() {
    const desktop = crawlRunBridge()
    if (!desktop?.listCrawlRuns) return
    try {
      const [savedRuns, savedExports] = await Promise.all([
        desktop.listCrawlRuns(),
        desktop.listCrawlExports(),
      ])
      setCrawlRuns(savedRuns)
      setCrawlExports(savedExports)
      setHistoryMessage('')
    } catch (error) {
      setHistoryMessage(`Could not load crawl history: ${String(error)}`)
    }
  }

  useEffect(() => {
    void refreshCrawlHistory()
  }, [])

  async function resumeCrawl(id: string) {
    try {
      const saved = await crawlRunBridge()?.getCrawlRun(id)
      if (!saved) throw new Error('Saved run was not found')
      setRunDetail(saved)
      setPipelineDetails({ name: saved.name, provider: saved.provider })
      setSearchCriteria(saved.criteria)
      setSearchOrigin(saved.kind === 'pipeline' ? 'Pipeline' : 'New Search')
      setPage('Crawl Results')
    } catch (error) {
      setHistoryMessage(`Could not resume crawl: ${String(error)}`)
    }
  }

  async function exportCrawl(id: string) {
    try {
      await crawlRunBridge()?.exportCrawlRun(id, true)
      await refreshCrawlHistory()
    } catch (error) {
      setHistoryMessage(`Could not export CSV: ${String(error)}`)
    }
  }

  async function deletePipeline(id: string) {
    const run = crawlRuns.find((item) => item.id === id && item.kind === 'pipeline')
    if (!run) return
    try {
      await crawlRunBridge()?.deleteCrawlRun(id)
      await refreshCrawlHistory()
    } catch (error) {
      const detail = String(error)
      setHistoryMessage(
        detail.includes("No handler registered for 'leadsghr:crawl-runs:delete'")
          ? 'Restart the desktop app to enable pipeline deletion, then try again. The current window is connected to an older Electron main process.'
          : `Could not delete pipeline: ${detail}`,
      )
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
    if (typeof desktop?.savePreferences === 'function')
      void desktop
        .savePreferences(next)
        .then(() => setPreferencesMessage('Preferences saved on this computer.'))
        .catch(() => setPreferencesMessage('Could not save preferences.'))
    else setPreferencesMessage('Restart the desktop app to save preferences.')
  }

  async function showPage(next: string) {
    setPage(next)
    setQuery('')
    setFilter('all')
    if (next === 'Leads') setLeads((await bridge()?.leads()) ?? [])
    if (next === 'Runs') setRuns((await bridge()?.runs()) ?? [])
    if (next === 'Dashboard' || next === 'Runs' || next === 'Exports' || next === 'Pipeline')
      await refreshCrawlHistory()
  }

  const visibleLeads = leads.filter(
    (lead) =>
      (filter === 'all' ||
        (filter === 'email' ? lead.emails.length > 0 : lead.emails.length === 0)) &&
      [lead.name, lead.sourceUrl, ...lead.emails].some((part) =>
        part.toLowerCase().includes(query.toLowerCase()),
      ),
  )
  const visibleRuns = runs.filter(
    (run) =>
      (filter === 'all' || run.status === filter) &&
      [run.url, run.status, run.error ?? ''].some((part) =>
        part.toLowerCase().includes(query.toLowerCase()),
      ),
  )

  if (!splashComplete) return <SplashScreen onComplete={() => setSplashComplete(true)} />
  if (!license)
    return (
      <div className="la-license-checking" role="status">
        Checking your license...
      </div>
    )
  if (license.state !== 'active') return <LicenseScreen view={license} onActivated={setLicense} />
  return (
    <div className="la-shell">
      <aside className="la-sidebar">
        <div className="la-brand">
          <BrandLogo className="la-brand-wordmark" />
          <BrandMark className="la-brand-symbol" size={32} />
        </div>
        <label className="la-sidebar-search">
          <Icon name="search" size={15} />
          <input
            ref={navSearchRef}
            type="search"
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
            placeholder="Search..."
            aria-label="Find a page"
          />
          <kbd>Ctrl K</kbd>
        </label>
        <nav className="la-nav" aria-label="Main navigation">
          {navigation
            .filter(({ label, text }) => {
              const query = navQuery.trim().toLowerCase()
              if (!query) return true
              if (label.toLowerCase().includes(query) || text?.toLowerCase().includes(query)) return true
              if (label === 'Settings' && 'preferences'.includes(query)) return true
              const children =
                label === 'Email'
                  ? ['email filtering', 'email validation', 'email spam check', 'email templates']
                  : []
              return children.some((name) => name.includes(query))
            })
            .map(({ label, icon, text }) => (
              <div key={label} className="la-nav-item">
                {!navQuery &&
                  (label === 'Dashboard' ||
                    label === 'Crawler' ||
                    label === 'Email Sending' ||
                    label === 'Leads') && (
                    <span className="la-nav-group">
                      {label === 'Dashboard'
                        ? 'MAIN'
                        : label === 'Crawler'
                          ? 'DISCOVERY TOOLS'
                          : label === 'Email Sending'
                            ? 'EXTENSIONS'
                            : 'WORKSPACE'}
                    </span>
                  )}
                <button
                  type="button"
                  aria-current={
                    label !== 'Settings' &&
                    label !== 'Email' &&
                    (page === label ||
                      ((page === 'Crawl Results' ||
                        page === 'New Pipeline' ||
                        page === 'Pipeline Export') &&
                        label === searchOrigin) ||
                      (page === 'Scraper Results' &&
                        label === (openScraperJob ? 'LeadsGhr Scraper' : 'New Search')))
                      ? 'page'
                      : undefined
                  }
                  aria-expanded={
                    label === 'Settings'
                      ? settingsExpanded
                      : label === 'Email'
                        ? emailExpanded
                        : undefined
                  }
                  aria-controls={
                    label === 'Settings'
                      ? 'la-settings-submenu'
                      : label === 'Email'
                        ? 'la-email-submenu'
                        : undefined
                  }
                  onClick={() =>
                    label === 'Settings'
                      ? setSettingsExpanded((current) => !current)
                      : label === 'Email'
                        ? setEmailExpanded((current) => !current)
                        : void showPage(label)
                  }
                  title={text ?? label}
                >
                  <NavIcon name={icon} size={18} />
                  <span>{text ?? label}</span>
                  {(label === 'Settings' || label === 'Email') && (
                    <svg
                      className="la-nav-caret"
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
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  )}
                </button>
                {label === 'Settings' && (
                  <div
                    className="la-sidebar-settings-collapse"
                    data-open={Boolean(settingsExpanded || navQuery.trim())}
                    inert={!(settingsExpanded || navQuery.trim())}
                  >
                    <div className="la-sidebar-settings-clip">
                      <div className="la-sidebar-settings-children" id="la-settings-submenu">
                        <button
                          type="button"
                          aria-current={page === 'Preferences' ? 'page' : undefined}
                          onClick={() => void showPage('Preferences')}
                        >
                          Preferences
                        </button>
                        {/* Local mode (LEADSGHR_MODE=local) has no license, so there is no License page. */}
                        {!(license.state === 'active' && license.local) && (
                          <button
                            type="button"
                            aria-current={page === 'License' ? 'page' : undefined}
                            onClick={() => void showPage('License')}
                          >
                            License
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {label === 'Email' && (
                  <div
                    className="la-sidebar-settings-collapse"
                    data-open={Boolean(emailExpanded || navQuery.trim())}
                    inert={!(emailExpanded || navQuery.trim())}
                  >
                    <div className="la-sidebar-settings-clip">
                      <div className="la-sidebar-settings-children" id="la-email-submenu">
                        {(
                          [
                            ['Email Filtering', 'emailFiltering'],
                            ['Email Validation', 'emailValidation'],
                            ['Email Spam Check', 'emailSpamCheck'],
                            ['Email Templates', 'emailTemplates'],
                          ] as const
                        ).map(([child, childIcon]) => (
                          <button
                            key={child}
                            type="button"
                            aria-current={page === child ? 'page' : undefined}
                            onClick={() => void showPage(child)}
                          >
                            <NavIcon name={childIcon} size={16} />
                            {child}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </nav>
        <div className="la-sidebar-bottom">
          <button
            className="la-sidebar-footer"
            type="button"
            aria-label="Open profile"
            aria-current={page === 'Profile' ? 'page' : undefined}
            onClick={() => void showPage('Profile')}
          >
            <div className="la-sidebar-avatar">
              <Avatar style={{ width: 28, height: 28 }} {...genConfig(avatarSeed)} />
            </div>
            <span>
              <strong>Hi, {account.firstName}</strong>
              <small>Local workspace{appVersion ? ` · v${appVersion}` : ''}</small>
            </span>
          </button>
        </div>
      </aside>
      <main className="la-main">
        <PageHeader
          title={page === 'New Search' && searchStep === 'locations' ? 'Location' : (pageTitles[page] ?? page)}
          subtitle={
            page === 'New Search' && searchStep === 'locations'
              ? 'Choose locations from the selected states.'
              : descriptions[page]
          }
          onBack={
            page === 'New Search' && searchStep === 'locations'
              ? () => searchBackRef.current?.()
              : page === 'Crawl Results'
                ? () => void showPage(searchOrigin === 'Pipeline' ? 'New Pipeline' : 'New Search')
                : undefined
          }
          action={
            page === 'Pipeline' ? (
              <Button type="button" onClick={() => openPipelineCreateRef.current?.()}>
                <Icon name="add" size={16} /> Create pipeline
              </Button>
            ) : page === 'New Search' && searchStep !== 'locations' ? (
              <Button type="button" onClick={() => openAddNicheRef.current?.()}>
                <Icon name="add" size={16} /> Add custom niche
              </Button>
            ) : page === 'Niche Library' ? (
              <Button type="button" onClick={() => openLibraryAddRef.current?.()}>
                <Icon name="add" size={16} /> Add niche
              </Button>
            ) : page === 'Crawl Results' && crawlExport ? (
              <Button type="button" onClick={() => exportAgainRef.current?.()}>
                <Icon name="exports" size={16} /> Export again
              </Button>
            ) : page === 'Email Sending' ? (
              <Button type="button" onClick={() => downloadMailerRef.current?.()}>
                <Icon name="download" size={16} /> Download extension ZIP
              </Button>
            ) : page === 'Email Tracking' ? (
              <Button type="button" onClick={() => downloadTrackerRef.current?.()}>
                <Icon name="download" size={16} /> Download extension ZIP
              </Button>
            ) : page === 'LeadsGhr Scraper' ? (
              <Button type="button" onClick={() => downloadScraperRef.current?.()}>
                <Icon name="download" size={16} /> Download extension ZIP
              </Button>
            ) : undefined
          }
        >
          {page === 'Dashboard' && (
            <span className="la-topbar-account">
              <span className="la-topbar-account-mark">
                <BrandMark size={22} />
              </span>
              <span>
                <strong>LeadsGhr</strong>
                <small>Local workspace</small>
              </span>
            </span>
          )}
        </PageHeader>
        <div className="la-content">
          <UpdateBanner state={updateState} />
          {historyMessage && (
            <p className="la-search-message" role="alert">
              {historyMessage}
            </p>
          )}
          {page === 'Dashboard' ? (
            <DashboardPage
              onNavigate={(next) => void showPage(next)}
              crawlRuns={crawlRuns}
              exportCount={crawlExports.length}
              onExport={(id) => void exportCrawl(id)}
            />
          ) : page === 'Crawler' ? (
            <CrawlerPage preferences={preferences} />
          ) : page === 'Email Filtering' ? (
            <EmailFilteringPage />
          ) : page === 'Email Validation' ? (
            <EmailValidationPage preferences={preferences} />
          ) : page === 'Email Spam Check' ? (
            <EmailSpamEnginePage />
          ) : page === 'Email Sending' ? (
            <EmailSendingPage downloadRef={downloadMailerRef} />
          ) : page === 'LeadsGhr Scraper' ? (
            <ScraperExtensionPage
              downloadRef={downloadScraperRef}
              onOpenJob={(job) => {
                setOpenScraperJob(job)
                setPage('Scraper Results')
              }}
            />
          ) : page === 'Email Templates' ? (
            <EmailTemplatesPage />
          ) : page === 'Email Tracking' ? (
            <EmailTrackingPage downloadRef={downloadTrackerRef} />
          ) : page === 'Niche Library' ? (
            <NicheLibraryPage
              useNicheKeywords={preferences.useNicheKeywords}
              addRef={openLibraryAddRef}
              onStartSearch={() => void showPage('New Search')}
            />
          ) : page === 'Pipeline' ? (
            <PipelineOverviewPage
              runs={crawlRuns}
              createRef={openPipelineCreateRef}
              onCreate={(draft, start) => {
                setSearchOrigin('Pipeline')
                setPipelineDraft(draft)
                setPipelineDetails({ name: draft.name, provider: draft.provider })
                setRunDetail(null)
                setSearchCriteria(draft.criteria)
                setPage(start ? 'Crawl Results' : 'New Pipeline')
              }}
              onResume={(id) => void resumeCrawl(id)}
              onDelete={(id) => void deletePipeline(id)}
            />
          ) : page === 'New Pipeline' || page === 'New Search' ? (
            <SearchSetupPage
              iconActions
              pipelineMode={page === 'New Pipeline'}
              pipelineDraft={page === 'New Pipeline' ? pipelineDraft : null}
              addNicheRef={page === 'New Search' ? openAddNicheRef : undefined}
              backRef={page === 'New Search' ? searchBackRef : undefined}
              onStepChange={page === 'New Search' ? setSearchStep : undefined}
              onSearch={(criteria, details) => {
                setRunDetail(null)
                setSearchOrigin(page === 'New Pipeline' ? 'Pipeline' : 'New Search')
                setPipelineDetails(details ?? null)
                setSearchCriteria(criteria)
                setPage('Crawl Results')
              }}
              onSendToScraper={
                page === 'New Search'
                  ? (criteria) => {
                      setOpenScraperJob(null)
                      setSearchCriteria(criteria)
                      setPage('Scraper Results')
                    }
                  : undefined
              }
            />
          ) : page === 'Scraper Results' && openScraperJob ? (
            <ScraperResultsPage
              key={openScraperJob.jobId}
              existing={openScraperJob}
              preferences={preferences}
              backLabel="LeadsGhr Scraper"
              onBack={() => void showPage('LeadsGhr Scraper')}
              onSaved={refreshScraperHistory}
            />
          ) : page === 'Scraper Results' && searchCriteria ? (
            <ScraperResultsPage
              criteria={searchCriteria}
              preferences={preferences}
              onBack={() => void showPage('New Search')}
              onSaved={refreshScraperHistory}
            />
          ) : page === 'Crawl Results' && searchCriteria ? (
            <SearchResultsPage
              key={runDetail?.id ?? 'new'}
              criteria={runDetail?.criteria ?? searchCriteria}
              preferences={runDetail?.preferences ?? preferences}
              initialRun={runDetail}
              pipelineMode={searchOrigin === 'Pipeline'}
              pipelineName={pipelineDetails?.name}
              provider={pipelineDetails?.provider ?? 'google-maps'}
              exportRef={exportAgainRef}
              onExportChange={reportCrawlExport}
              onSaved={() => void refreshCrawlHistory()}
              onFinished={(item) => {
                setFinishedExport(item)
                setPage('Pipeline Export')
                void refreshCrawlHistory()
              }}
            />
          ) : page === 'Pipeline Export' && finishedExport ? (
            <>
              <PipelineTimeline current={5} />
              <PipelineExportPage
                item={finishedExport}
                onPipeline={() => void showPage('Pipeline')}
                onExports={() => void showPage('Exports')}
              />
            </>
          ) : page === 'Runs' || page === 'Exports' ? (
            <ExportsPage
              runs={crawlRuns}
              exports={crawlExports}
              showExportHistory={page === 'Exports'}
              onRefresh={refreshCrawlHistory}
              onResume={(id) => void resumeCrawl(id)}
            />
          ) : page === 'License' ? (
            <LicenseSettingsPage view={license} onChange={setLicense} />
          ) : page === 'Profile' || page === 'Preferences' ? (
            <ProfilePage
              section={page === 'Profile' ? 'account' : 'preferences'}
              updateState={updateState}
              preferences={preferences}
              onPreferencesChange={updatePreferences}
              onPreferencesImported={(next) => {
                setPreferences(next)
                setPreferencesMessage('')
              }}
              saveMessage={preferencesMessage}
              account={account}
              onAccountChange={setAccount}
              avatarSeed={avatarSeed}
              onRegenerateAvatar={regenerateAvatar}
            />
          ) : page === 'Leads' ? (
            <section className="la-records">
              <div className="la-records-toolbar">
                <label className="la-records-search">
                  <Icon name="search" size={17} />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search companies, sources, emails..."
                    aria-label={`Search ${page.toLowerCase()}`}
                  />
                </label>
                <CustomSelect
                  label="Email filter"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'All leads' },
                    { value: 'email', label: 'With email' },
                    { value: 'none', label: 'Without email' },
                  ]}
                />
                <span className="la-records-count">{visibleLeads.length} shown</span>
              </div>
              <div className="la-records-table-wrap">
                <Table
                  data={visibleLeads}
                  loading={false}
                  paginator={false}
                  tableClassName="la-records-table"
                  rowKey={(lead) => lead.sourceUrl}
                  columns={[
                    {
                      field: 'name',
                      header: 'Business',
                      cell: (lead) => <strong>{lead.name}</strong>,
                    },
                    {
                      field: 'emails',
                      header: 'Email',
                      cell: (lead) => lead.emails.join(', ') || 'No email',
                    },
                    {
                      field: 'phones',
                      header: 'Phone',
                      cell: (lead) => lead.phones.join(', ') || '—',
                    },
                    { field: 'sourceUrl', header: 'Source' },
                  ]}
                />
              </div>
            </section>
          ) : (
            <Card className="la-local-page">
              <p>
                This desktop feature is planned. Use the Crawler tab to test public pages from a
                homepage without saving data.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
