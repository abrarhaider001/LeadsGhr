import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in scraper.css
import './scraper.css'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import { clampSearchTiming, SEARCH_TIMING_PRESETS, scraperJobTitle, type ScraperJob } from '@leadsghr/schemas'
import { connectDataFolder, dataFolderState, DATA_FOLDER_PATH, type DataFolderState } from './data-folder'
import { finishedSearches, runJob, type Control, type Counts } from './engine'
import { icons } from './parts'
import {
  COMMAND_KEY,
  elapsedClock,
  readJobProgress,
  readJobs,
  removeJob,
  selectedJobId,
  selectJob,
  type Command,
  type StoredProgress,
} from './state'

type JobSummary = { progress: StoredProgress | null; done: Set<number> }

const noCounts: Counts = { businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} }

/**
 * LeadsGhr Scraper settings (the gear), styled like LeadsGhr Mailer's settings page: the data folder, the saved jobs
 * sent from the desktop app (pick one to run, or remove it), the picked job with its controls and counts, and every
 * location of that job with its status and businesses found. The run lives here, because this page stays open while
 * it works; the toolbar popup starts, pauses, and stops it through chrome.storage (state.ts). Opened with
 * ?autostart=1 by the popup's Start button. One job runs at a time; while it runs, the list is locked to it.
 */
function Settings() {
  const [folder, setFolder] = useState<DataFolderState | null>(null)
  const [jobs, setJobs] = useState<ScraperJob[] | undefined>(undefined)
  const [selected, setSelected] = useState('')
  const [summaries, setSummaries] = useState<Record<string, JobSummary>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const control = useRef<Control>({ action: 'run' })
  const runningRef = useRef(false)
  const jobsRef = useRef<ScraperJob[]>([])
  const selectedRef = useRef('')

  async function summarize(jobId: string): Promise<JobSummary> {
    return { progress: await readJobProgress(jobId), done: await finishedSearches(jobId) }
  }

  async function load() {
    setFolder(await dataFolderState())
    const loaded = await readJobs()
    jobsRef.current = loaded
    setJobs(loaded)
    const entries = await Promise.all(loaded.map(async (job) => [job.id, await summarize(job.id)] as const))
    setSummaries(Object.fromEntries(entries))
    if (!runningRef.current) pick(await selectedJobId(loaded))
    return loaded
  }

  function pick(jobId: string) {
    selectedRef.current = jobId
    setSelected(jobId)
    if (jobId) void selectJob(jobId)
  }

  async function start(jobId = selectedRef.current) {
    const current = jobsRef.current.find((job) => job.id === jobId)
    if (!current || runningRef.current) return
    pick(current.id)
    setError('')
    control.current = { action: 'run' }
    runningRef.current = true
    setRunning(true)
    try {
      await runJob(current, control.current, (update) => {
        const progress = { ...update.progress, counts: { ...update.counts }, page: update.page, startedAt: update.startedAt }
        setSummaries((all) => ({ ...all, [current.id]: { progress, done: all[current.id]?.done ?? new Set() } }))
        // Finished locations are recorded by the engine; read them back so the Done marks and counts follow.
        void finishedSearches(current.id).then((done) =>
          setSummaries((all) => ({ ...all, [current.id]: { progress: all[current.id]?.progress ?? progress, done } })),
        )
      })
    } catch (failure) {
      setError(String(failure).replace(/^Error:\s*/, ''))
    } finally {
      runningRef.current = false
      setRunning(false)
      const summary = await summarize(current.id)
      setSummaries((all) => ({ ...all, [current.id]: summary }))
    }
  }

  useEffect(() => {
    void load().then(async () => {
      if (new URLSearchParams(location.search).get('autostart') === '1' && (await dataFolderState()) === 'connected')
        void start()
    })
    // Commands from the toolbar popup.
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const command = changes[COMMAND_KEY]?.newValue as Command | undefined
      if (!command || Date.now() - command.at > 10_000) return
      if (command.action === 'start') void load().then(() => start(command.jobId ?? selectedRef.current))
      else if (runningRef.current) control.current.action = command.action
    }
    chrome.storage.onChanged.addListener(listener)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    // Refresh the list when the window is focused again (a job may have been sent from LeadsGhr meanwhile).
    const refresh = () => {
      if (!runningRef.current) void load()
    }
    window.addEventListener('focus', refresh)
    return () => {
      chrome.storage.onChanged.removeListener(listener)
      window.removeEventListener('focus', refresh)
      clearInterval(timer)
    }
  }, [])

  async function connect() {
    setError('')
    try {
      await connectDataFolder()
      await load()
    } catch (failure) {
      setError(String(failure).replace(/^Error:\s*/, ''))
    }
  }

  async function remove(job: ScraperJob) {
    if (!confirm(`Remove "${scraperJobTitle(job)}" from the list? LeadsGhr keeps the businesses already saved for it.`)) return
    setError('')
    try {
      await removeJob(job.id)
      if (selectedRef.current === job.id) pick('')
      await load()
    } catch (failure) {
      setError(String(failure).replace(/^Error:\s*/, ''))
    }
  }

  const job = jobs?.find((item) => item.id === selected) ?? null
  const summary = job ? summaries[job.id] : undefined
  const progress = summary?.progress ?? null
  const done = summary?.done ?? new Set<number>()
  const counts: Counts = progress?.counts ?? noCounts
  const total = job?.searches.length ?? 0
  const finished = !!job && done.size >= total
  const remaining = job?.searches.filter((search) => !done.has(search.index)) ?? []
  const state = progress?.state

  const jobStatus = (item: ScraperJob) => {
    const info = summaries[item.id]
    const count = info?.done.size ?? 0
    if (running && item.id === selected) return { label: 'Running', tone: 'run' }
    if (count >= item.searches.length) return { label: 'Finished', tone: 'ok' }
    if (info?.progress?.state === 'blocked') return { label: 'Stopped by Google', tone: 'warn' }
    if (count || info?.progress) return { label: 'Paused', tone: 'warn' }
    return { label: 'Not started', tone: '' }
  }
  const statusOf = (index: number) =>
    done.has(index)
      ? { label: 'Done', tone: 'ok' }
      : state === 'blocked' && progress?.current === index
        ? { label: 'Stopped by Google', tone: 'warn' }
        : running && progress?.current === index
          ? state === 'waiting'
            ? { label: 'Waiting to start', tone: 'run' }
            : { label: `Reading page ${Math.max(progress?.page ?? 1, 1)}`, tone: 'run' }
          : !running && progress?.current === index && state !== 'finished'
            ? { label: 'Paused here', tone: 'warn' }
            : { label: 'Waiting', tone: '' }

  return (
    <div className="sc-settings">
      <header className="sc-settings-head">
        <img src="/icon.svg" alt="" width={44} height={44} />
        <h1>LeadsGhr Scraper</h1>
      </header>
      <p className="sc-settings-lead">
        Runs the searches sent from LeadsGhr on Google Search's business list and saves the businesses for the LeadsGhr
        desktop app. Every job you send is saved in the list below; pick one, then start, pause, and stop it from the
        toolbar popup or here.
      </p>

      <section className="sc-panel">
        <div className="sc-panel-head">
          <div>
            <h2>Data folder</h2>
            <p>
              Search jobs, progress, and the businesses found are stored as files in <code>{DATA_FOLDER_PATH}</code>, so the desktop
              app can read them and rebuilding the extension does not remove them.
            </p>
          </div>
          <button type="button" className="sc-primary sc-fit" onClick={() => void connect()}>
            {folder === 'connected' ? 'Change folder' : folder === 'needs-permission' ? 'Allow folder' : 'Choose folder'}
          </button>
        </div>
        {folder === 'connected' ? (
          <p className="sc-state-ok">{icons.check}Connected. Results are saved there as each page is read.</p>
        ) : folder ? (
          <p className="sc-state-bad">
            {folder === 'needs-permission'
              ? 'Chrome needs permission again. Select Allow folder, then Allow on every visit.'
              : 'Not chosen yet. Choose the folder once so the Scraper can read jobs and save results there.'}
          </p>
        ) : null}
      </section>

      <section className="sc-panel">
        <div className="sc-panel-head">
          <div>
            <h2>Jobs</h2>
            <p>
              {jobs?.length
                ? 'Saved jobs from LeadsGhr, newest first. Select one to see its locations and run it. One job runs at a time.'
                : 'No saved jobs yet. In LeadsGhr, open New Search, choose the niche, state, and locations, then select Send to LeadsGhr Scraper. Each job you send is added here.'}
            </p>
          </div>
        </div>
        {!!jobs?.length && (
          <div className="sc-table-wrap">
            <table className="sc-table sc-jobs">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Sent</th>
                  <th>Searches</th>
                  <th>Status</th>
                  <th>Businesses</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((item) => {
                  const status = jobStatus(item)
                  const info = summaries[item.id]
                  const isSelected = item.id === selected
                  const locked = running && !isSelected
                  return (
                    <tr
                      key={item.id}
                      className={`${isSelected ? 'sc-row-selected' : ''}${locked ? ' sc-row-locked' : ''}`}
                      aria-selected={isSelected}
                      onClick={() => !running && pick(item.id)}
                    >
                      <td>
                        <label className="sc-job-pick">
                          <input
                            type="radio"
                            name="job"
                            checked={isSelected}
                            disabled={running}
                            onChange={() => pick(item.id)}
                          />
                          <span>{scraperJobTitle(item)}</span>
                        </label>
                      </td>
                      <td className="sc-muted">{new Date(item.createdAt).toLocaleString()}</td>
                      <td>
                        {info?.done.size ?? 0} of {item.searches.length}
                      </td>
                      <td>
                        <span className={`sc-pill${status.tone ? ` sc-${status.tone}` : ''}`}>
                          {status.tone === 'run' && <i className="sc-spin" />}
                          {status.tone === 'ok' && icons.check}
                          {status.label}
                        </span>
                      </td>
                      <td>{info?.progress?.counts?.businesses ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          className="sc-icon-button"
                          title="Remove from the list"
                          aria-label={`Remove ${scraperJobTitle(item)}`}
                          disabled={running || folder !== 'connected'}
                          onClick={(event) => {
                            event.stopPropagation()
                            void remove(item)
                          }}
                        >
                          {icons.trash}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && !job && <p className="sc-error">{error}</p>}
      </section>

      {job && (
        <section className="sc-panel">
          <div className="sc-panel-head">
            <div>
              <h2>{scraperJobTitle(job)}</h2>
              <p>Sent from LeadsGhr on {new Date(job.createdAt).toLocaleString()}.</p>
            </div>
            <div className="sc-controls">
              {running ? (
                <>
                  <button type="button" className="sc-secondary sc-fit" onClick={() => (control.current.action = 'pause')}>
                    {icons.pause}Pause
                  </button>
                  <button type="button" className="sc-secondary sc-fit sc-danger" onClick={() => (control.current.action = 'stop')}>
                    {icons.stop}Stop
                  </button>
                </>
              ) : (
                <button type="button" className="sc-primary sc-fit" disabled={folder !== 'connected' || finished} onClick={() => void start()}>
                  {icons.play}
                  {finished ? 'Finished' : done.size ? `Resume from ${remaining[0]?.place}` : 'Start scraping'}
                </button>
              )}
            </div>
          </div>
          <dl className="sc-facts">
            <div>
              <dt>Niche</dt>
              <dd>{job.niches.join(', ')}</dd>
            </div>
            <div>
              <dt>State</dt>
              <dd>{job.states.join(', ')}</dd>
            </div>
            <div>
              <dt>Searches</dt>
              <dd>
                {done.size} of {total} done
              </dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{progress?.startedAt ? elapsedClock((running ? now : Date.parse(progress.updatedAt)) - progress.startedAt) : '—'}</dd>
            </div>
          </dl>
          <div className="sc-bar">
            <i style={{ width: `${total ? Math.round((done.size / total) * 100) : 0}%` }} />
          </div>
          <div className="sc-stats sc-stats-wide">
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
          {progress?.message && (
            <p className={`sc-status${state === 'blocked' ? ' sc-status-warn' : ''}`}>
              {running && <i className="sc-dot" />}
              {running || (state !== 'running' && state !== 'waiting')
                ? progress.message
                : 'Interrupted (the Scraper tab was closed). Resume to continue.'}
            </p>
          )}
          {error && <p className="sc-error">{error}</p>}

          <h3 className="sc-subhead">Locations</h3>
          <p className="sc-muted sc-small">
            In the order they run. Each opens in a new tab in this window, is scrolled through completely, then closes;
            finished locations are not searched again when you resume.
          </p>
          <div className="sc-table-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Location</th>
                  <th>Search</th>
                  <th>Status</th>
                  <th>Businesses</th>
                </tr>
              </thead>
              <tbody>
                {job.searches.map((search) => {
                  const status = statusOf(search.index)
                  return (
                    <tr key={search.index}>
                      <td>{search.index + 1}</td>
                      <td>
                        <span className="sc-loc">
                          {icons.pin}
                          {search.place}
                        </span>
                      </td>
                      <td className="sc-muted">{search.term}</td>
                      <td>
                        <span className={`sc-pill${status.tone ? ` sc-${status.tone}` : ''}`}>
                          {status.tone === 'run' && <i className="sc-spin" />}
                          {status.tone === 'ok' && icons.check}
                          {status.label}
                        </span>
                      </td>
                      <td>{counts.perSearch[search.index] ?? (done.has(search.index) ? '—' : '')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="sc-muted sc-small">
            {(() => {
              const t = clampSearchTiming(job.pacing ?? SEARCH_TIMING_PRESETS.normal)
              return `Up to ${t.pagesPerLocation} ${t.pagesPerLocation === 1 ? 'page' : 'pages'} per location; ${t.pagePauseMinSec} to ${t.pagePauseMaxSec} seconds between pages and ${t.locationPauseSec} seconds between locations${t.breakEvery ? `, with a ${t.breakMinutes}-minute break every ${t.breakEvery} locations` : ''} (from LeadsGhr's Search timing when this job was sent). If Google shows its check page the Scraper stops and keeps what it saved. Tip: run it in a Chrome profile that is not signed in to Google.`
            })()}
          </p>
        </section>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LicenseGate product="scraper" logo="/icon.svg">
      <Settings />
    </LicenseGate>
  </React.StrictMode>,
)
