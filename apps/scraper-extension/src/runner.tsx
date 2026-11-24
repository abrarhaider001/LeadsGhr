import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in scraper.css
import './scraper.css'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import { scraperJobSchema, type ScraperJob, type ScraperProgress } from '@leadsghr/schemas'
import { connectDataFolder, dataFolderState, readDataFile, DATA_FOLDER_PATH, type DataFolderState } from './data-folder'
import { finishedSearches, runJob, type Control, type Counts } from './engine'
import { Header, LocationList, icons } from './parts'

/**
 * The LeadsGhr Scraper page (opened in its own tab from the popup): it holds the run while it works, because a popup
 * closes as soon as it loses focus. Shows the job saved by the desktop app, the data folder, and the live progress.
 */
function Runner() {
  const [folder, setFolder] = useState<DataFolderState | null>(null)
  const [job, setJob] = useState<ScraperJob | null | undefined>(undefined)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<ScraperProgress | null>(null)
  const [counts, setCounts] = useState<Counts>({ businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} })
  const [page, setPage] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const control = useRef<Control>({ action: 'run' })

  async function load() {
    setFolder(await dataFolderState())
    const parsed = scraperJobSchema.safeParse(await readDataFile('job.json'))
    setJob(parsed.success ? parsed.data : null)
    if (parsed.success) setDone(await finishedSearches(parsed.data.id))
  }
  useEffect(() => {
    void load()
  }, [])
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  async function connect() {
    setError('')
    try {
      await connectDataFolder()
      await load()
    } catch (failure) {
      setError(String(failure).replace(/^Error:\s*/, ''))
    }
  }

  async function start() {
    if (!job) return
    setError('')
    control.current = { action: 'run' }
    setRunning(true)
    setStartedAt(Date.now())
    try {
      const state = await runJob(job, control.current, (update) => {
        setProgress(update.progress)
        setCounts({ ...update.counts })
        setPage(update.page)
      })
      if (state === 'finished' || state === 'blocked') setDone(await finishedSearches(job.id))
    } catch (failure) {
      setError(String(failure).replace(/^Error:\s*/, ''))
    } finally {
      setRunning(false)
      setDone(await finishedSearches(job.id))
    }
  }

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const remaining = job ? job.searches.filter((search) => !done.has(search.index)) : []
  const nextPlace = remaining[0]?.place

  return (
    <div className="sc-page">
      <div className="sc-pop">
        <Header />
        <div className="sc-body">
          {folder === null || job === undefined ? (
            <p className="sc-note">Loading...</p>
          ) : folder !== 'connected' ? (
            <>
              <div className="sc-empty">
                <span className="sc-big">{icons.folder}</span>
                <h3>{folder === 'needs-permission' ? 'Allow the data folder again' : 'Connect the data folder'}</h3>
                <p>LeadsGhr Scraper reads search jobs from LeadsGhr and saves results to its data folder. Choose it once:</p>
                <code>{DATA_FOLDER_PATH}</code>
              </div>
              <button type="button" className="sc-primary" onClick={() => void connect()}>
                {icons.folder}
                {folder === 'needs-permission' ? 'Allow data folder' : 'Choose data folder'}
              </button>
            </>
          ) : !job ? (
            <div className="sc-empty">
              <span className="sc-big">{icons.desktop}</span>
              <h3>No search job yet</h3>
              <p>
                In the LeadsGhr desktop app, open <b>New Search</b>, choose the niche, state, and locations, then select{' '}
                <b>Send to LeadsGhr Scraper</b>. The job appears here.
              </p>
              <button type="button" className="sc-secondary" onClick={() => void load()}>
                Check again
              </button>
            </div>
          ) : (
            <>
              {!running && progress?.state !== 'blocked' && (
                <div className="sc-ok-line">
                  {icons.check}Data folder connected
                </div>
              )}
              {running || progress ? (
                <div className="sc-prog">
                  <div className="sc-pt">
                    <b>
                      Search {Math.min((progress?.current ?? 0) + 1, job.searches.length)} of {job.searches.length}
                    </b>
                    <span>{clock}</span>
                  </div>
                  <div className="sc-bar">
                    <i style={{ width: `${Math.round((done.size / job.searches.length) * 100)}%` }} />
                  </div>
                </div>
              ) : null}
              {progress?.state === 'blocked' && (
                <div className="sc-alert">
                  {icons.warn}
                  <div>
                    <b>Google showed its check page</b>
                    <p>
                      Scraping stopped so Google is not pushed further. Results so far are saved
                      {nextPlace ? (
                        <>
                          ; the next search starts at <b>{nextPlace}</b>
                        </>
                      ) : null}
                      . Try again later.
                    </p>
                  </div>
                </div>
              )}
              {(running || counts.businesses > 0) && (
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
              )}
              {!running && !progress && (
                <div className="sc-card">
                  <div className="sc-ct">
                    Search job from LeadsGhr <span>{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                  <dl>
                    <dt>Niche</dt>
                    <dd>{job.niches.join(', ')}</dd>
                    <dt>State</dt>
                    <dd>{job.states.join(', ')}</dd>
                    <dt>Searches</dt>
                    <dd>{job.searches.length}</dd>
                  </dl>
                </div>
              )}
              <LocationList
                searches={job.searches}
                done={done}
                current={running ? (progress?.current ?? -1) : -1}
                page={page}
                blockedAt={progress?.state === 'blocked' ? progress.current : -1}
                counts={counts.perSearch}
              />
              {running && progress && (
                <p className="sc-live">
                  <i className="sc-dot" />
                  {progress.message}
                </p>
              )}
              {running ? (
                <div className="sc-row2">
                  <button type="button" className="sc-secondary" onClick={() => (control.current.action = 'pause')}>
                    {icons.pause}Pause
                  </button>
                  <button
                    type="button"
                    className="sc-secondary sc-danger"
                    onClick={() => (control.current.action = 'stop')}
                  >
                    {icons.stop}Stop
                  </button>
                </div>
              ) : remaining.length ? (
                <button type="button" className="sc-primary" onClick={() => void start()}>
                  {icons.play}
                  {done.size ? `Resume from ${nextPlace}` : 'Start scraping'}
                </button>
              ) : (
                <div className="sc-done">
                  <span className="sc-big sc-okc">{icons.check}</span>
                  <h3>All {job.searches.length} searches finished</h3>
                  <p>Results are saved; they appear in LeadsGhr under Crawl Results.</p>
                </div>
              )}
              <p className="sc-note">
                Opens each search in a new tab in this window, scrolls through all its results, closes the tab,
                then moves to the next search. Pauses of several seconds between pages and 45 seconds between searches
                keep it polite. Keep this Scraper tab open while it runs.
              </p>
            </>
          )}
          {error && <p className="sc-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LicenseGate product="scraper" logo="/icon.svg">
      <Runner />
    </LicenseGate>
  </React.StrictMode>,
)
