import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in scraper.css
import './scraper.css'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import type { ScraperJob } from '@leadsghr/schemas'
import { dataFolderState, type DataFolderState } from './data-folder'
import { finishedSearches, PROGRESS_KEY } from './engine'
import { icons } from './parts'
import { elapsedClock, isLive, readJob, sendCommand, startRun, type StoredProgress } from './state'

/**
 * The toolbar popup: a summary only (job, progress, counts) with Start, Pause, and Stop, like LeadsGhr Mailer's popup.
 * The full list of locations and the data folder are on the settings page (the gear). The run itself happens on the
 * settings page, which the popup opens in the background when needed.
 */
function Popup() {
  const [folder, setFolder] = useState<DataFolderState | null>(null)
  const [job, setJob] = useState<ScraperJob | null | undefined>(undefined)
  const [done, setDone] = useState(0)
  const [progress, setProgress] = useState<StoredProgress | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    void (async () => {
      setFolder(await dataFolderState())
      const loaded = await readJob()
      setJob(loaded)
      if (loaded) setDone((await finishedSearches(loaded.id)).size)
      const saved = (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY] as StoredProgress | undefined
      if (loaded && saved?.jobId === loaded.id) setProgress(saved)
    })()
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const next = changes[PROGRESS_KEY]?.newValue as StoredProgress | undefined
      if (next) setProgress(next)
      if (next?.jobId) void finishedSearches(next.jobId).then((set) => setDone(set.size))
    }
    chrome.storage.onChanged.addListener(listener)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      chrome.storage.onChanged.removeListener(listener)
      clearInterval(timer)
    }
  }, [])

  const state = progress?.state
  const active = isLive(progress)
  const total = job?.searches.length ?? 0
  const finished = !!job && done >= total
  const counts = progress?.counts ?? { businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} }
  const current = Math.min((active ? (progress?.current ?? done) : done) + 1, total)
  const canStart = folder === 'connected' && !!job && !finished && !active

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
        {job === undefined ? (
          <p className="sc-muted">Loading...</p>
        ) : !job ? (
          <div className="sc-empty-line">
            <b>No search job yet</b>
            <span>
              In LeadsGhr, open <b>New Search</b>, choose the niche, state, and locations, then select <b>Send to LeadsGhr Scraper</b>.
            </span>
          </div>
        ) : (
          <>
            <section>
              <h2 className="sc-section-title">Search job</h2>
              <p className="sc-job-line">
                {job.niches.join(', ')} · {job.states.join(', ')} · {total} {total === 1 ? 'location' : 'locations'}
              </p>
            </section>
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
          <button type="button" className="sc-primary" disabled={!canStart} onClick={() => void startRun()}>
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
