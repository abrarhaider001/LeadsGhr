import { useEffect, useState } from 'react'
import type { ScraperJobSummary } from '@leadsghr/schemas'
import { EmptyTable, Icon } from '@leadsghr/ui'
import { ExtensionInstallPage } from './extension-install-page'

type ScraperBridge = {
  downloadScraperExtension(): Promise<string | null>
  listScraperJobs(): Promise<ScraperJobSummary[]>
  onScraperChanged(callback: (jobIds: string[]) => void): () => void
}

const bridge = () => (window as Window & { leadsGhrDesktop?: Partial<ScraperBridge> }).leadsGhrDesktop

/** How often the job list is refreshed while the page is open. */
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

/**
 * LeadsGhr Scraper: the extension download page (laid out like Email Sending, the Mailer), then every job sent to the
 * Scraper with its status, businesses, and websites found (and how many are still being looked up), each with
 * Open results.
 */
export function ScraperExtensionPage({
  onOpenJob,
}: {
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

  return (
    <ExtensionInstallPage
      onDownload={() => {
        void downloadExtension()
      }}
      message={message}
      eyebrow="LEADSGHR SCRAPER"
      showSetup={false}
    >
      <div className="la-scraper-jobs">
        <div className="la-extension-steps-heading">
          <div>
            <h3>Jobs</h3>
            <p>
              Every job sent to LeadsGhr Scraper, newest first. Websites are looked up a few at a time
              after the Scraper saves them, also while this page is closed.
            </p>
          </div>
          {jobs && <span>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span>}
        </div>
        <div className="la-table-scroll">
          <table className="la-table la-scraper-jobs-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Searches</th>
                <th>Businesses</th>
                <th>Websites</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).map((job) => (
                <tr key={job.jobId}>
                  <td>
                    <strong className="la-result-ellipsis" title={job.title}>
                      {job.title}
                    </strong>
                    <small className="la-scraper-jobs-date">
                      Sent {new Date(job.createdAt).toLocaleString()}
                    </small>
                  </td>
                  <td>
                    <span className={`la-scraper-state${stateTone(job.state)}`} title={job.message}>
                      {STATE_LABELS[job.state]}
                    </span>
                  </td>
                  <td>
                    {job.searchesDone} of {job.searches}
                  </td>
                  <td>{job.businesses.toLocaleString()}</td>
                  <td>
                    {job.websitesFound.toLocaleString()} of {job.websiteLinks.toLocaleString()}
                    {job.websitesPending > 0 && (
                      <small className="la-scraper-jobs-pending">
                        <span className="la-crawler-dot" />
                        {job.websitesPending.toLocaleString()} looking up
                      </small>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="la-scraper-action"
                      onClick={() => onOpenJob?.({ jobId: job.jobId, runId: job.runId, searches: job.searches })}
                    >
                      <Icon name="search" size={14} /> Open results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs !== null && !jobs.length && (
            <EmptyTable
              title="No jobs yet"
              description="In New Search, choose the niche, state, and locations, then select Send to LeadsGhr Scraper."
            />
          )}
        </div>
      </div>
    </ExtensionInstallPage>
  )
}
