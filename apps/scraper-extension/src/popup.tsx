import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in scraper.css
import './scraper.css'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import { scraperJobSchema, type ScraperJob } from '@leadsghr/schemas'
import { readDataFile } from './data-folder'
import { finishedSearches, PROGRESS_KEY } from './engine'
import { Header, icons } from './parts'

/** Opens the Scraper page (or brings it to the front): runs happen there, because this popup closes when it loses focus. */
async function openRunner() {
  const url = chrome.runtime.getURL('runner.html')
  const [existing] = await chrome.tabs.query({ url })
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true })
    if (existing.windowId !== undefined) await chrome.windows.update(existing.windowId, { focused: true })
  } else await chrome.tabs.create({ url })
  window.close()
}

function Popup() {
  const [job, setJob] = useState<ScraperJob | null | undefined>(undefined)
  const [done, setDone] = useState(0)
  const [status, setStatus] = useState('')
  useEffect(() => {
    void (async () => {
      const parsed = scraperJobSchema.safeParse(await readDataFile('job.json'))
      setJob(parsed.success ? parsed.data : null)
      if (parsed.success) setDone((await finishedSearches(parsed.data.id)).size)
      const progress = (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY] as { jobId?: string; message?: string } | undefined
      if (parsed.success && progress?.jobId === parsed.data.id) setStatus(progress.message ?? '')
    })()
  }, [])
  return (
    <div className="sc-pop sc-popup">
      <Header />
      <div className="sc-body">
        {job === undefined ? (
          <p className="sc-note">Loading...</p>
        ) : !job ? (
          <div className="sc-empty">
            <span className="sc-big">{icons.desktop}</span>
            <h3>No search job yet</h3>
            <p>
              In LeadsGhr, open <b>New Search</b>, choose the niche, state, and locations, then select <b>Send to LeadsGhr
              Scraper</b>.
            </p>
          </div>
        ) : (
          <div className="sc-card">
            <div className="sc-ct">Search job from LeadsGhr</div>
            <dl>
              <dt>Niche</dt>
              <dd>{job.niches.join(', ')}</dd>
              <dt>State</dt>
              <dd>{job.states.join(', ')}</dd>
              <dt>Searches</dt>
              <dd>
                {done} of {job.searches.length} done
              </dd>
            </dl>
            {status && <p className="sc-note">{status}</p>}
          </div>
        )}
        <button type="button" className="sc-primary" onClick={() => void openRunner()}>
          {icons.play}
          {job && done && done < job.searches.length ? 'Open Scraper to resume' : 'Open Scraper'}
        </button>
        <p className="sc-note">Tip: run the Scraper in a separate Chrome profile that is not signed in to Google.</p>
      </div>
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
