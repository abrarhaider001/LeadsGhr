import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in scraper.css
import './scraper.css'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import type { ScraperJob } from '@leadsghr/schemas'
import { connectDataFolder, dataFolderState, DATA_FOLDER_PATH, type DataFolderState } from './data-folder'
import { finishedSearches, PROGRESS_KEY, runJob, type Control, type Counts } from './engine'
import { icons } from './parts'
import { COMMAND_KEY, elapsedClock, readJob, type Command, type StoredProgress } from './state'

/**
 * LeadsGhr Scraper settings (the gear), styled like LeadsGhr Mailer's settings page: the data folder, the search job
 * from the desktop app with its controls, and every selected location with its status and businesses found. The run
 * lives here, because this page stays open while it works; the toolbar popup starts, pauses, and stops it through
 * chrome.storage (state.ts). Opened with ?autostart=1 by the popup's Start button.
 */
function Settings() {
  const [folder, setFolder] = useState<DataFolderState | null>(null)
  const [job, setJob] = useState<ScraperJob | null | undefined>(undefined)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<StoredProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const control = useRef<Control>({ action: 'run' })
  const runningRef = useRef(false)
  const jobRef = useRef<ScraperJob | null>(null)

  async function load() {
    setFolder(await dataFolderState())
    const loaded = await readJob()
    jobRef.current = loaded
    setJob(loaded)
    if (loaded) {
      setDone(await finishedSearches(loaded.id))
      const saved = (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY] as StoredProgress | undefined
      setProgress(saved?.jobId === loaded.id ? saved : null)
    }
    return loaded
  }

  async function start() {
    const current = jobRef.current
    if (!current || runningRef.current) return
    setError('')
    control.current = { action: 'run' }
    runningRef.current = true
    setRunning(true)
    try {
      await runJob(current, control.current, (update) => setProgress({ ...update.progress, counts: { ...update.counts } }))
    } catch (failure) {
      setError(String(failure).replace(/^Error:\s*/, ''))
    } finally {
      runningRef.current = false
      setRunning(false)
      setDone(await finishedSearches(current.id))
      const saved = (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY] as StoredProgress | undefined
      if (saved?.jobId === current.id) setProgress(saved)
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
      if (command.action === 'start') void load().then(() => start())
      else if (runningRef.current) control.current.action = command.action
    }
    chrome.storage.onChanged.addListener(listener)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      chrome.storage.onChanged.removeListener(listener)
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

  const counts: Counts = progress?.counts ?? { businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} }
  const total = job?.searches.length ?? 0
  const finished = !!job && done.size >= total
  const remaining = job?.searches.filter((search) => !done.has(search.index)) ?? []
  const state = progress?.state
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
        desktop app. Start, pause, and stop it from the toolbar popup or here.
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
            <h2>Search job</h2>
            <p>
              {job
                ? `Sent from LeadsGhr on ${new Date(job.createdAt).toLocaleString()}.`
                : 'No job yet. In LeadsGhr, open New Search, choose the niche, state, and locations, then select Send to LeadsGhr Scraper.'}
            </p>
          </div>
          {job && (
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
          )}
        </div>
        {job && (
          <>
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
          </>
        )}
        {error && <p className="sc-error">{error}</p>}
      </section>

      {job && (
        <section className="sc-panel">
          <div className="sc-panel-head">
            <div>
              <h2>Locations</h2>
              <p>
                Every selected location, in the order they run. Each opens in a new tab in this window, is scrolled through
                completely, then closes; finished locations are not searched again when you resume.
              </p>
            </div>
          </div>
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
            Up to 5 pages per location; pauses of several seconds between pages and 45 seconds between locations keep it
            polite. If Google shows its check page the Scraper stops and keeps what it saved. Tip: run it in a Chrome profile
            that is not signed in to Google.
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
