import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in scraper.css
import './scraper.css'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import { scraperJobTitle, type ScraperJob } from '@leadsghr/schemas'
import { dataFolderState, type DataFolderState } from './data-folder'
import { finishedSearches } from './engine'
import { icons, JobSelect } from './parts'
import {
  elapsedClock,
  isLive,
  PROGRESS_KEY,
  readJobProgress,
  readJobs,
  selectedJobId,
  selectJob,
  sendCommand,
  startRun,
  type StoredProgress,
} from './state'

/**
 * The toolbar popup: pick one of the saved jobs (sent from LeadsGhr) and see its summary (progress and counts), with
 * Start, Pause, and Stop, like LeadsGhr Mailer's popup. The full list of jobs and locations and the data folder are on
 * the settings page (the gear). The run itself happens on the settings page, which the popup opens in the background
 * when needed. While a job runs, the picker shows that job and is locked.
 */
function Popup() {
  const [folder, setFolder] = useState<DataFolderState | null>(null)
  const [jobs, setJobs] = useState<ScraperJob[] | undefined>(undefined)
  const [selected, setSelected] = useState('')
  const [live, setLive] = useState<StoredProgress | null>(null)
  const [progress, setProgress] = useState<StoredProgress | null>(null)
  const [done, setDone] = useState(0)
  const [now, setNow] = useState(Date.now())

  async function show(jobId: string) {
    setSelected(jobId)
    setProgress(jobId ? await readJobProgress(jobId) : null)
    setDone(jobId ? (await finishedSearches(jobId)).size : 0)
  }

  useEffect(() => {
    void (async () => {
      setFolder(await dataFolderState())
      const loaded = await readJobs()
      setJobs(loaded)
      const running = (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY] as StoredProgress | undefined
      setLive(running ?? null)
      // A running job is always the one shown.
      await show(isLive(running) && loaded.some((job) => job.id === running!.jobId) ? running!.jobId : await selectedJobId(loaded))
    })()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const next = changes[PROGRESS_KEY]?.newValue as StoredProgress | undefined
      if (!next) return
      setLive(next)
      if (next.jobId === selected) {
        setProgress(next)
        void finishedSearches(next.jobId).then((set) => setDone(set.size))
      } else if (isLive(next)) void show(next.jobId)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [selected])

  const job = jobs?.find((item) => item.id === selected) ?? null
  const running = isLive(live)
  const active = running && live?.jobId === selected
  const state = progress?.state
  const total = job?.searches.length ?? 0
  const finished = !!job && done >= total
  const counts = progress?.counts ?? { businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} }
  const current = Math.min((active ? (progress?.current ?? done) : done) + 1, total)
  const canStart = folder === 'connected' && !!job && !finished && !running

  return (
    <div className="sc-popup">
      <header className="sc-bar-head">
        <img src="/icon.svg" alt="" width={22} height={22} />
        <b>LeadsGhr Scraper</b>
        <button type="button" className="sc-icon-button" title="Settings" aria-label="Settings" onClick={() => void chrome.runtime.openOptionsPage()}>
          {icons.gear}
        </button>
      </header>
      <main className="sc-popup-body">
        {folder && folder !== 'connected' && (
          <div className="sc-notice">
            <span>{folder === 'needs-permission' ? 'Data folder needs permission again.' : 'Data folder not connected.'}</span>
            <button type="button" className="sc-link" onClick={() => void chrome.runtime.openOptionsPage()}>
              Set up
            </button>
          </div>
        )}
        {jobs === undefined ? (
          <p className="sc-muted">Loading...</p>
        ) : !jobs.length ? (
          <div className="sc-empty-line">
            <b>No saved jobs yet</b>
            <span>
              In LeadsGhr, open <b>New Search</b>, choose the niche, state, and locations, then select <b>Send to LeadsGhr Scraper</b>.
              Each job you send is saved here.
            </span>
          </div>
        ) : (
          <>
            <section>
              <h2 className="sc-section-title" id="job-label">
                Job
              </h2>
              <JobSelect
                labelledBy="job-label"
                options={jobs.map((item) => ({ id: item.id, name: scraperJobTitle(item), detail: new Date(item.createdAt).toLocaleString() }))}
                value={selected}
                disabled={running}
                onChange={(id) => {
                  void selectJob(id)
                  void show(id)
                }}
              />
              <p className="sc-job-line">
                {jobs.length} saved {jobs.length === 1 ? 'job' : 'jobs'}
                {job ? ` · sent ${new Date(job.createdAt).toLocaleDateString()}` : ''}
                {running && !active ? ' · another job is running' : ''}
              </p>
            </section>
            {job && (
              <section className="sc-summary">
                <div className="sc-pt">
                  <b>{finished ? `All ${total} searches finished` : `Search ${current} of ${total}`}</b>
                  <span>{progress?.startedAt && (active || finished) ? elapsedClock((finished ? Date.parse(progress.updatedAt) : now) - progress.startedAt) : ''}</span>
                </div>
                <div className="sc-bar">
                  <i style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
                </div>
                <div className="sc-stats">
                  <div>
                    <b>{counts.businesses}</b>
                    <small>businesses</small>
                  </div>
                  <div>
                    <b>{counts.withWebsite}</b>
                    <small>with website</small>
                  </div>
                  <div>
                    <b>{counts.adsSkipped}</b>
                    <small>ads skipped</small>
                  </div>
                </div>
              </section>
            )}
            {progress?.message && (
              <p className={`sc-status${state === 'blocked' ? ' sc-status-warn' : ''}`}>
                {active && <i className="sc-dot" />}
                {active || (state !== 'running' && state !== 'waiting')
                  ? progress.message
                  : 'Interrupted (the Scraper tab was closed). Resume to continue.'}
              </p>
            )}
          </>
        )}
      </main>
      <footer className="sc-footer">
        {active ? (
          <button type="button" className="sc-primary" onClick={() => void sendCommand('pause')}>
            {icons.pause}Pause
          </button>
        ) : (
          <button type="button" className="sc-primary" disabled={!canStart} onClick={() => void startRun(selected)}>
            {icons.play}
            {done && !finished ? 'Resume scraping' : 'Start scraping'}
          </button>
        )}
        <button
          type="button"
          className="sc-square"
          title="Stop"
          aria-label="Stop"
          disabled={!active}
          onClick={() => void sendCommand('stop')}
        >
          {icons.stopFilled}
        </button>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LicenseGate product="scraper" logo="/icon.svg">
      <Popup />
    </LicenseGate>
  </React.StrictMode>,
)
