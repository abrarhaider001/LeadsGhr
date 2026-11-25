import { useEffect, useState, type MutableRefObject } from 'react'
import type { ScraperJobSummary } from '@leadsghr/schemas'
import {
  BentoFloat,
  BentoGrid,
  BentoTile,
  BentoToast,
  EmptyState,
  Icon,
  NavIcon,
  ScraperMark,
  Table,
} from '@leadsghr/ui'
import { ExtensionInstallSteps } from './extension-install-steps'

type ScraperBridge = {
  downloadScraperExtension(): Promise<string | null>
  listScraperJobs(): Promise<ScraperJobSummary[]>
  onScraperChanged(callback: (jobIds: string[]) => void): () => void
}

const bridge = () => (window as Window & { leadsGhrDesktop?: Partial<ScraperBridge> }).leadsGhrDesktop

/** How often the job list is refreshed while the page is open (it also refreshes when the Scraper saves a file). */
const REFRESH_MS = 5000

const STATE_LABELS: Record<ScraperJobSummary['state'], string> = {
  'not-started': 'Not started',
  running: 'Running',
  waiting: 'Running',
  paused: 'Paused',
  stopped: 'Stopped',
  blocked: 'Stopped by Google',
  finished: 'Finished',
}
const stateTone = (state: ScraperJobSummary['state']) =>
  state === 'finished'
    ? ' is-done'
    : state === 'blocked' || state === 'paused' || state === 'stopped'
      ? ' is-warning'
      : state === 'not-started'
        ? ' is-idle'
        : ''

/** A small, faithful picture of the Scraper popup while a job runs (job, progress, counts, Pause). */
function ScraperPopupPreview() {
  return (
    <BentoFloat className="la-ext-scraper-popup">
      <div className="la-ext-popup-head">
        <ScraperMark size={16} />
        LeadsGhr Scraper
      </div>
      <div className="la-ext-popup-field">General Contractor · Georgia · 3 locations</div>
      <div className="la-ext-scraper-progress">
        <strong>Search 2 of 3</strong>
        <span>04:12</span>
      </div>
      <div className="la-ext-scraper-bar">
        <i />
      </div>
      <div className="la-ext-scraper-stats">
        <span>
          <b>139</b>
          <small>businesses</small>
        </span>
        <span>
          <b>113</b>
          <small>with website</small>
        </span>
      </div>
      <div className="la-ext-popup-send">Pause</div>
    </BentoFloat>
  )
}

/**
 * LeadsGhr Scraper (under Extensions): the download button sits in the page header, then two bento tiles like the
 * Mailer and Tracker pages (what it does, with the popup as it looks while a job runs, and how to install it), then
 * every job sent to the Scraper with its status, businesses, and websites found (and how many are still being looked
 * up), each with Open results.
 */
export function ScraperExtensionPage({
  downloadRef,
  onOpenJob,
}: {
  downloadRef?: MutableRefObject<(() => void) | null>
  onOpenJob?(job: { jobId: string; runId: string; searches: number }): void
}) {
  const [message, setMessage] = useState('')
  const [jobs, setJobs] = useState<ScraperJobSummary[] | null>(null)

  useEffect(() => {
    let active = true
    let timer = 0
    const refresh = async () => {
      try {
        const list = await bridge()?.listScraperJobs?.()
        if (active) setJobs(list ?? [])
      } catch {
        if (active) setJobs((current) => current ?? [])
      }
      if (active) timer = window.setTimeout(() => void refresh(), REFRESH_MS)
    }
    void refresh()
    const unsubscribe = bridge()?.onScraperChanged?.(() => {
      if (!active) return
      window.clearTimeout(timer)
      void refresh()
    })
    return () => {
      active = false
      window.clearTimeout(timer)
      unsubscribe?.()
    }
  }, [])

  async function downloadExtension() {
    try {
      const api = bridge()
      if (!api?.downloadScraperExtension)
        throw new Error('Restart the desktop app to enable extension download.')
      const path = await api.downloadScraperExtension()
      setMessage(path ? `Saved to ${path}` : 'Download cancelled')
    } catch (error) {
      setMessage(String(error))
    }
  }

  useEffect(() => {
    if (!downloadRef) return
    downloadRef.current = () => {
      void downloadExtension()
    }
    return () => {
      downloadRef.current = null
    }
  })

  return (
    <section className="la-ext-page">
      {message ? (
        <p className="la-mailer-status" role="status">
          {message}
        </p>
      ) : null}
      <BentoGrid>
        <BentoTile
          tone="brand"
          title="Google's business list, from your own Chrome"
          art={
            <>
              <ScraperPopupPreview />
              <BentoToast
                className="la-ext-scraper-toast"
                icon={<NavIcon name="scraper" size={20} />}
                title="Acworth city, Georgia"
                subtitle="98 businesses · 80 websites"
              />
            </>
          }
        >
          Send a job from New Search; the Scraper reads each location one business at a time, finds
          each website, and saves it here as it goes.
        </BentoTile>
        <BentoTile
          className="la-ext-install"
          title="Install in two minutes"
          art={<ExtensionInstallSteps lastStep="Choose its data folder in settings" />}
        >
          Download the ZIP above and load it in a Chrome profile that is not signed in to Google. To
          update, download again and press Reload in chrome://extensions.
        </BentoTile>
      </BentoGrid>
      <section className="la-mailer-block" aria-labelledby="la-scraper-jobs">
        <header>
          <h3 id="la-scraper-jobs">Jobs{jobs ? ` (${jobs.length})` : ''}</h3>
        </header>
        <p className="la-mailer-status">
          Every job sent to LeadsGhr Scraper, newest first. Websites the Scraper could not find are
          looked up here a few at a time, also while this page is closed.
        </p>
        <Table
          data={jobs ?? []}
          loading={jobs === null}
          paginator={false}
          tableClassName="la-scraper-jobs-table"
          rowKey={(job) => job.jobId}
          empty={
            <EmptyState
              title="No jobs yet"
              description="In New Search, choose the niche, state, and locations, then select Send to LeadsGhr Scraper."
            />
          }
          columns={[
            {
              field: 'title',
              header: 'Job',
              cell: (job) => (
                <>
                  <strong className="la-result-ellipsis" title={job.title}>
                    {job.title}
                  </strong>
                  <small className="la-scraper-jobs-date">
                    Sent {new Date(job.createdAt).toLocaleString()}
                  </small>
                </>
              ),
            },
            {
              field: 'state',
              header: 'Status',
              cell: (job) => (
                <span className={`la-scraper-state${stateTone(job.state)}`} title={job.message}>
                  {STATE_LABELS[job.state]}
                </span>
              ),
            },
            {
              field: 'searches',
              header: 'Searches',
              cell: (job) => `${job.searchesDone} of ${job.searches}`,
            },
            {
              field: 'businesses',
              header: 'Businesses',
              cell: (job) => job.businesses.toLocaleString(),
            },
            {
              field: 'websitesFound',
              header: 'Websites',
              cell: (job) => (
                <>
                  {job.websitesFound.toLocaleString()} of {job.websiteLinks.toLocaleString()}
                  {job.websitesPending > 0 && (
                    <small className="la-scraper-jobs-pending">
                      <span className="la-crawler-dot" />
                      {job.websitesPending.toLocaleString()} looking up
                    </small>
                  )}
                </>
              ),
            },
            {
              field: 'actions',
              header: '',
              className: 'la-scraper-jobs-actions',
              cell: (job) => (
                <button
                  type="button"
                  className="la-scraper-action"
                  onClick={() =>
                    onOpenJob?.({ jobId: job.jobId, runId: job.runId, searches: job.searches })
                  }
                >
                  <Icon name="search" size={14} /> Open results
                </button>
              ),
            },
          ]}
        />
      </section>
    </section>
  )
}
