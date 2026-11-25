import { useEffect, useMemo, useRef, useState } from 'react'
import type { CrawlExport, CrawlRow, DesktopPreferences, ScraperProgress, SearchCriteria } from '@leadsghr/schemas'
import { EmptyState, Icon, NavIcon, Table } from '@leadsghr/ui'
import { crawlRunBridge } from './crawl-run-bridge'
import { prepareSearches, stateRange } from './search-results-page'

type ScraperBridge = {
  sendScraperJob(input: unknown): Promise<{ jobId: string; runId: string }>
  syncScraperJob(jobId: string): Promise<{ progress: ScraperProgress | null; run: { rows: CrawlRow[] } | null; removed: boolean; websitesPending?: number }>
  openScraperFolder(): Promise<void>
  onScraperChanged(callback: (jobIds: string[]) => void): () => void
  openWebsite(url: string): Promise<void>
}
const scraperBridge = () => (window as Window & { leadsGhrDesktop?: Partial<ScraperBridge> }).leadsGhrDesktop

const SYNC_MS = 3000

/**
 * Crawl Results for a LeadsGhr Scraper run. From New Search (`criteria`) it sends the searches to the Chrome extension
 * as a new job; from the job list on the LeadsGhr Scraper page (`existing`) it opens a job sent earlier. Either way it
 * then reads the results the Scraper saves (every few seconds) into the job's search run, shown in the usual table
 * with the search box and the Source column. The extension does the searching; this page only shows what arrived.
 */
export function ScraperResultsPage({
  criteria,
  existing,
  preferences,
  onBack,
  backLabel = 'New Search',
  onSaved,
}: {
  criteria?: SearchCriteria
  existing?: { jobId: string; runId: string; searches: number }
  preferences: DesktopPreferences
  onBack(): void
  backLabel?: string
  onSaved?(): void
}) {
  const [job, setJob] = useState<{ jobId: string; runId: string } | null>(existing ?? null)
  const [progress, setProgress] = useState<ScraperProgress | null>(null)
  const [rows, setRows] = useState<CrawlRow[]>([])
  const [error, setError] = useState('')
  const [removed, setRemoved] = useState(false)
  const [websitesPending, setWebsitesPending] = useState(0)
  const [query, setQuery] = useState('')
  const [exported, setExported] = useState<CrawlExport | null>(null)
  const sent = useRef(false)
  const searches = useMemo(
    () => (criteria ? prepareSearches(criteria, preferences.useNicheKeywords) : []),
    [criteria, preferences.useNicheKeywords],
  )

  // Send the job once (a job opened from the list was sent before).
  useEffect(() => {
    if (sent.current || existing || !criteria) return
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
  }, [criteria, existing, preferences, searches, onSaved])

  // Then read the Scraper's results every few seconds until the job is finished.
  useEffect(() => {
    if (!job) return
    let active = true
    let timer = 0
    const tick = async () => {
      try {
        const sync = await scraperBridge()?.syncScraperJob?.(job.jobId)
        if (!active || !sync) return
        setRemoved(sync.removed)
        setProgress(sync.progress)
        if (sync.run) setRows(sync.run.rows)
        setWebsitesPending(sync.websitesPending ?? 0)
        if (sync.removed) return
        // Keep reading after the Scraper finishes while Website links are still being looked up.
        if (sync.progress?.state === 'finished' && !sync.websitesPending) {
          onSaved?.()
          return
        }
      } catch (failure) {
        if (active) setError(String(failure))
      }
      if (active) timer = window.setTimeout(() => void tick(), SYNC_MS)
    }
    void tick()
    // The desktop app watches the data folder: refresh at once when this job's files change.
    const unsubscribe = scraperBridge()?.onScraperChanged?.((jobIds) => {
      if (!active || !jobIds.includes(job.jobId)) return
      window.clearTimeout(timer)
      void tick()
    })
    return () => {
      active = false
      window.clearTimeout(timer)
      unsubscribe?.()
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

  const total = existing?.searches ?? searches.length
  const state = progress?.state
  const status = error
    ? error
    : removed
      ? "This job was removed from LeadsGhr Scraper's list; this run keeps what was saved but no longer updates."
      : !job
        ? 'Sending the searches to LeadsGhr Scraper...'
        : !progress
          ? `Job added to LeadsGhr Scraper's job list (${total} ${total === 1 ? 'search' : 'searches'}). In Chrome, open LeadsGhr Scraper, pick this job, and select Start scraping; results appear here as they are saved.`
          : progress.message
  const websitesNote = websitesPending
    ? ` Looking up ${websitesPending.toLocaleString()} more ${websitesPending === 1 ? 'website' : 'websites'} (a few at a time, so Google does not refuse them); they appear here as they are found.`
    : ''

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
          <Icon name="chevron" size={14} /> {backLabel}
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
        {!error && (state !== 'finished' || websitesPending > 0) && <span className="la-crawler-dot" />}
        {status}
        {!error && !removed && websitesNote}
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
      <Table
        data={shown.map((row, index) => ({ ...row, rowNumber: index + 1 }))}
        loading={false}
        rows={50}
        tableClassName="la-maps-table"
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            title={rows.length ? 'No matching results' : 'Waiting for results'}
            description={
              rows.length
                ? 'No result matches this search. Clear the search box to see every result.'
                : 'Start the job in LeadsGhr Scraper in Chrome. Businesses appear here as they are saved.'
            }
          />
        }
        columns={[
          { field: 'rowNumber', header: '#' },
          {
            field: 'name',
            header: 'Business',
            cell: (row) => (
              <strong className="la-result-ellipsis" title={row.name}>
                {row.name}
              </strong>
            ),
          },
          {
            field: 'website',
            header: 'Website URL',
            className: 'la-maps-url',
            cell: (row) =>
              row.website ? (
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
              ),
          },
          { field: 'phone', header: 'Phone', cell: (row) => row.phone || 'Not shown' },
          {
            field: 'location',
            header: 'Location',
            cell: (row) => (
              <span className="la-result-ellipsis" title={row.location}>
                {row.location}
              </span>
            ),
          },
          {
            field: 'source',
            header: 'Source',
            cell: (row) => <span className="la-result-source">{row.source}</span>,
          },
        ]}
      />
    </section>
  )
}
