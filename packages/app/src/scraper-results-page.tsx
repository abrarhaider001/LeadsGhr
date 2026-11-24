import { useEffect, useMemo, useRef, useState } from 'react'
import type { CrawlExport, CrawlRow, DesktopPreferences, ScraperProgress, SearchCriteria } from '@leadsghr/schemas'
import { EmptyTable, Icon, NavIcon } from '@leadsghr/ui'
import { crawlRunBridge } from './crawl-run-bridge'
import { prepareSearches, stateRange } from './search-results-page'

type ScraperBridge = {
  sendScraperJob(input: unknown): Promise<{ jobId: string; runId: string }>
  syncScraperJob(jobId: string): Promise<{ progress: ScraperProgress | null; run: { rows: CrawlRow[] } | null; replaced: boolean }>
  openScraperFolder(): Promise<void>
  openWebsite(url: string): Promise<void>
}
const scraperBridge = () => (window as Window & { leadsGhrDesktop?: Partial<ScraperBridge> }).leadsGhrDesktop

const SYNC_MS = 3000

/**
 * Crawl Results for a LeadsGhr Scraper run: sends New Search's searches to the Chrome extension as a job, then reads
 * the results it saves (every few seconds) into a search run, shown in the usual table with the search box and the
 * Source column. The extension does the searching; this page only sends the job and shows what has arrived.
 */
export function ScraperResultsPage({
  criteria,
  preferences,
  onBack,
  onSaved,
}: {
  criteria: SearchCriteria
  preferences: DesktopPreferences
  onBack(): void
  onSaved?(): void
}) {
  const [job, setJob] = useState<{ jobId: string; runId: string } | null>(null)
  const [progress, setProgress] = useState<ScraperProgress | null>(null)
  const [rows, setRows] = useState<CrawlRow[]>([])
  const [error, setError] = useState('')
  const [replaced, setReplaced] = useState(false)
  const [query, setQuery] = useState('')
  const [exported, setExported] = useState<CrawlExport | null>(null)
  const sent = useRef(false)
  const searches = useMemo(() => prepareSearches(criteria, preferences.useNicheKeywords), [criteria, preferences.useNicheKeywords])

  // Send the job once.
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const bridge = scraperBridge()
    if (typeof bridge?.sendScraperJob !== 'function') {
      setError('Restart the desktop app to load LeadsGhr Scraper support.')
      return
    }
    bridge
      .sendScraperJob({ criteria, preferences, searches, provider: 'google', kind: 'search', ...stateRange(criteria) })
      .then((created) => {
        setJob(created)
        onSaved?.()
      })
      .catch((failure) => setError(String(failure).replace(/^Error:\s*(Error invoking remote method '[^']+': )?(Error: )?/, '')))
  }, [criteria, preferences, searches, onSaved])

  // Then read the Scraper's results every few seconds until the job is finished.
  useEffect(() => {
    if (!job) return
    let active = true
    let timer = 0
    const tick = async () => {
      try {
        const sync = await scraperBridge()?.syncScraperJob?.(job.jobId)
        if (!active || !sync) return
        setReplaced(sync.replaced)
        setProgress(sync.progress)
        if (sync.run) setRows(sync.run.rows)
        if (sync.progress?.state === 'finished') {
          onSaved?.()
          return
        }
      } catch (failure) {
        if (active) setError(String(failure))
      }
      if (active) timer = window.setTimeout(() => void tick(), SYNC_MS)
    }
    void tick()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [job, onSaved])

  const shown = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    return rows
      .filter((row) => preferences.showListingsWithoutWebsite || row.website.trim())
      .filter((row) => {
        if (!words.length) return true
        const text = [row.name, row.website, row.phone, row.location, row.address, row.source, ...row.emails].join(' ').toLocaleLowerCase()
        return words.every((word) => text.includes(word))
      })
  }, [rows, query, preferences.showListingsWithoutWebsite])

  const total = searches.length
  const state = progress?.state
  const status = error
    ? error
    : replaced
      ? 'A newer job was sent to LeadsGhr Scraper; this run no longer updates.'
      : !job
        ? 'Sending the searches to LeadsGhr Scraper...'
        : !progress
          ? `Job sent (${total} ${total === 1 ? 'search' : 'searches'}). In Chrome, open LeadsGhr Scraper and select Start scraping; results appear here as they are saved.`
          : progress.message

  async function exportCsv() {
    if (!job) return
    const item = await crawlRunBridge()?.exportCrawlRun(job.runId)
    if (item) {
      setExported(item)
      onSaved?.()
    }
  }

  return (
    <section className="la-maps-results la-scraper-results">
      <div className="la-scraper-head">
        <button type="button" className="la-scraper-back" onClick={onBack}>
          <Icon name="chevron" size={14} /> New Search
        </button>
        <span className={`la-scraper-state${state === 'blocked' ? ' is-warning' : state === 'finished' ? ' is-done' : ''}`}>
          <NavIcon name="scraper" size={16} />
          {state === 'finished'
            ? 'Scraper finished'
            : state === 'blocked'
              ? 'Stopped by Google check page'
              : state === 'paused' || state === 'stopped'
                ? 'Scraper paused'
                : progress
                  ? `Scraper running · search ${Math.min(progress.current + 1, total)} of ${total}`
                  : 'Waiting for LeadsGhr Scraper'}
        </span>
      </div>
      <p className={`la-maps-scan-status${error ? ' la-scraper-error' : ''}`} aria-live="polite">
        {!error && state !== 'finished' && <span className="la-crawler-dot" />}
        {status}
      </p>
      {exported && (
        <div className="la-crawl-export-note">
          <span title={exported.filePath}>
            CSV saved: {exported.fileName} · {exported.entryCount.toLocaleString()} entries
          </span>
        </div>
      )}
      <div className="la-result-table-toolbar">
        <span>
          {query.trim() ? `${shown.length.toLocaleString()} of ${rows.length.toLocaleString()} results match` : `${shown.length.toLocaleString()} results`}
        </span>
        <label className="la-records-search la-result-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search results: name, website, phone, address..."
            aria-label="Search the results table"
          />
        </label>
        <button type="button" className="la-scraper-action" onClick={() => void scraperBridge()?.openScraperFolder?.()}>
          Open data folder
        </button>
        <button type="button" className="la-scraper-action" disabled={!rows.length} onClick={() => void exportCsv()}>
          <Icon name="exports" size={15} /> Export CSV
        </button>
      </div>
      <div className="la-table-scroll">
        <table className="la-table la-maps-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Business</th>
              <th>Website URL</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>
                  <strong className="la-result-ellipsis" title={row.name}>
                    {row.name}
                  </strong>
                </td>
                <td className="la-maps-url">
                  {row.website ? (
                    <a
                      className="la-result-ellipsis"
                      title={row.website}
                      href={row.website}
                      onClick={(event) => {
                        event.preventDefault()
                        void scraperBridge()?.openWebsite?.(row.website)
                      }}
                    >
                      {row.website}
                    </a>
                  ) : (
                    'Not shown'
                  )}
                </td>
                <td>{row.phone || 'Not shown'}</td>
                <td>
                  <span className="la-result-ellipsis" title={row.location}>
                    {row.location}
                  </span>
                </td>
                <td>
                  <span className="la-result-source">{row.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <EmptyTable
            title={rows.length ? 'No matching results' : 'Waiting for results'}
            description={
              rows.length
                ? 'No result matches this search. Clear the search box to see every result.'
                : 'Start the job in LeadsGhr Scraper in Chrome. Businesses appear here as each page is saved.'
            }
          />
        )}
      </div>
    </section>
  )
}
