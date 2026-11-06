import { useEffect, useMemo, useRef, useState } from 'react'
import type { CrawlExport, CrawlRow, CrawlRunDetail, DesktopPreferences, PipelineProvider, SearchCriteria } from '@leadsghr/schemas'
import { getNichePack } from './niche-library-data'
import { crawlRunBridge, type PipelinePage } from './crawl-run-bridge'
import locationData from '../data/us-states-locations.json'
import { CustomSelect } from './custom-select'
import { EmptyTable, Icon } from '@leadsghr/ui'
import { FaPause, FaPlay, FaStop } from 'react-icons/fa'
import { PipelineTimeline } from './pipeline-timeline'

type MapsRow = CrawlRow
type ScanUpdate = { type: 'status'; text: string } | { type: 'row'; row: MapsRow } | { type: 'done'; count: number } | { type: 'error'; text: string }
type ScanMessage = { id: string; update: ScanUpdate }
type MapsBridge = { startMapsScan(input: { query: string; location: string }): Promise<string>; stopMapsScan(id: string): Promise<void>; openWebsite(url: string): Promise<void>; onMapsScanEvent(callback: (message: ScanMessage) => void): () => void }
const mapsBridge = () => (window as Window & { leadsGhrDesktop?: MapsBridge }).leadsGhrDesktop

type PreparedSearch = { niche: string; term: string; place: string; query: string }
type RunPhase = 'running' | 'pausing' | 'paused' | 'stopped' | 'completed' | 'error'

export function SearchResultsPage({ criteria, preferences, initialRun, pipelineMode = false, pipelineName, provider = 'google-maps', onBack, onSaved, onFinished }: { criteria: SearchCriteria; preferences: DesktopPreferences; initialRun?: CrawlRunDetail | null; pipelineMode?: boolean; pipelineName?: string; provider?: PipelineProvider; onBack(): void; onSaved?(): void; onFinished?(item: CrawlExport): void }) {
  const [retry, setRetry] = useState(0)
  const [rows, setRows] = useState<MapsRow[]>([])
  const [status, setStatus] = useState('Preparing searches...')
  const [phase, setPhase] = useState<RunPhase>('running')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [runId, setRunId] = useState<string | null>(null)
  const [crawlRunId, setCrawlRunId] = useState<string | null>(initialRun?.id ?? null)
  const [lastExport, setLastExport] = useState<CrawlExport | null>(null)
  const [sitePages, setSitePages] = useState<PipelinePage[]>([])
  const [queuePage, setQueuePage] = useState(1)
  const [queuePerPage, setQueuePerPage] = useState(50)
  const stopRequested = useRef(false)
  const pauseRequested = useRef(false)
  const resumeWaiter = useRef<(() => void) | null>(null)
  const nextQueryIndex = useRef(initialRun?.nextQueryIndex ?? 0)
  const pendingRows = useRef(new Set<Promise<unknown>>())
  const siteCrawlActive = useRef(false)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  const searches = useMemo<PreparedSearch[]>(() => {
    if (initialRun) return initialRun.searches
    const locationsByState = new Map(criteria.selectedStates.map((state) => [state, [] as string[]]))
    for (const place of criteria.selectedLocations) {
      const state = place.slice(place.lastIndexOf(', ') + 2)
      locationsByState.get(state)?.push(place)
    }
    const seen = new Set<string>()
    return criteria.selectedNiches.flatMap((niche) => (preferences.useNicheKeywords ? getNichePack(niche, criteria).searchTerms : [niche]).flatMap((term) => criteria.selectedStates.flatMap((state) =>
      (locationsByState.get(state) ?? []).flatMap((place) => {
        const key = `${term.toLocaleLowerCase()}|${place.toLocaleLowerCase()}`
        if (seen.has(key)) return []
        seen.add(key)
        return [{ niche, term, place, query: `${term} in ${place}` }]
      }))))
  }, [criteria, preferences.useNicheKeywords, initialRun])
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * perPage
  const visibleRows = rows.slice(pageStart, pageStart + perPage)
  const firstPageButton = Math.max(1, Math.min(currentPage - 2, pageCount - 4))
  const pageButtons = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPageButton + index)
  const queuePageCount = Math.max(1, Math.ceil(sitePages.length / queuePerPage))
  const currentQueuePage = Math.min(queuePage, queuePageCount)
  const queuePageStart = (currentQueuePage - 1) * queuePerPage
  const visibleSitePages = sitePages.slice(queuePageStart, queuePageStart + queuePerPage)
  const firstQueuePageButton = Math.max(1, Math.min(currentQueuePage - 2, queuePageCount - 4))
  const queuePageButtons = Array.from({ length: Math.min(5, queuePageCount) }, (_, index) => firstQueuePageButton + index)
  const isActive = phase === 'running' || phase === 'pausing'
  const hasVisibleFields = preferences.includeCompanyName || preferences.includeWebsite || preferences.includePhone || preferences.includeAddress || preferences.includeLocation

  useEffect(() => {
    const bridge = mapsBridge()
    const runStore = crawlRunBridge()
    if (typeof bridge?.startMapsScan !== 'function' || typeof bridge.onMapsScanEvent !== 'function') {
      setPhase('error')
      setStatus('Desktop scanner bridge is unavailable. Fully restart the app to load the new preload.')
      return
    }
    if (typeof runStore?.createCrawlRun !== 'function') { setPhase('error'); setStatus('Run storage is unavailable. Restart the desktop app.'); return }
    if (!searches.length) { setPhase('error'); setStatus('No locations are selected. Go back and choose locations.'); return }
    let disposed = false
    let currentId: string | null = null
    let activeRunId: string | null = null
    let siteCrawlTask: Promise<'completed' | 'paused'> | null = null
    let finalized = false
    let saveError: unknown = null
    let unsubscribe: (() => void) | undefined
    const unsubscribePages = pipelineMode ? runStore.onPipelinePagesEvent((message) => {
      if (message.id !== activeRunId || disposed) return
      setSitePages(message.pages)
      if (siteCrawlActive.current) setStatus(message.text)
      if (message.text.includes(': crawled ')) void runStore.getCrawlRun(message.id).then((saved) => { if (!disposed && saved) setRows(saved.rows) })
    }) : undefined
    let finishCurrent: ((result: 'done' | 'error' | 'stopped') => void) | undefined
    stopRequested.current = false
    pauseRequested.current = false
    resumeWaiter.current = null
    setRows(retry === 0 ? initialRun?.rows ?? [] : [])
    setPage(1)
    setRunId(null)
    setPhase('running')
    setLastExport(null)
    setSitePages([])
    siteCrawlActive.current = false
    nextQueryIndex.current = retry === 0 ? initialRun?.nextQueryIndex ?? 0 : 0

    const persistProgress = async (status: 'running' | 'stopped' | 'completed' | 'failed', error?: string) => {
      if (!activeRunId) return
      await Promise.allSettled([...pendingRows.current])
      if (saveError) throw new Error(`A result could not be saved: ${String(saveError)}`)
      await runStore.updateCrawlRun({ id: activeRunId, nextQueryIndex: nextQueryIndex.current, status, error })
    }

    const finishRun = async (status: 'stopped' | 'completed' | 'failed', error?: string) => {
      if (finalized) return false
      finalized = true
      try {
        if (siteCrawlTask) await siteCrawlTask.catch(() => undefined)
        await persistProgress(status, error)
        if (activeRunId) {
          if (pipelineMode) {
            if (!disposed) setStatus('Filtering extracted emails before export...')
            const filtered = await runStore.filterCrawlRunEmails(activeRunId)
            const saved = await runStore.getCrawlRun(activeRunId)
            if (!disposed && saved) setRows(saved.rows)
            if (!disposed) setStatus(`Email filtering complete: ${filtered.kept} kept, ${filtered.removed} removed. Exporting CSV...`)
          }
          const item = await runStore.exportCrawlRun(activeRunId)
          if (!disposed && item) { setLastExport(item); if (pipelineMode) onFinishedRef.current?.(item) }
        }
        onSavedRef.current?.()
        return true
      } catch (failure) {
        if (activeRunId) void runStore.updateCrawlRun({ id: activeRunId, nextQueryIndex: nextQueryIndex.current, status: 'failed', error: String(failure) }).then(() => onSavedRef.current?.()).catch(() => undefined)
        if (!disposed) { setPhase('error'); setStatus(`Could not save run or CSV: ${String(failure)}`) }
        return false
      }
    }

    const runQueue = async () => {
      try {
        if (retry === 0 && initialRun) {
          activeRunId = initialRun.id
          await runStore.updateCrawlRun({ id: activeRunId, nextQueryIndex: nextQueryIndex.current, status: 'running' })
          if (pipelineMode) for (const row of initialRun.rows) if (row.website) await runStore.enqueuePipelineWebsite({ id: activeRunId, row })
        } else {
          const stateNumbers = criteria.selectedStates.map((state) => locationData.states.findIndex((item) => item.name === state) + 1).filter((number) => number > 0)
          const created = await runStore.createCrawlRun({ name: pipelineName, provider, kind: pipelineMode ? 'pipeline' : 'search', criteria, preferences, searches, stateStartNumber: Math.min(...stateNumbers), stateEndNumber: Math.max(...stateNumbers) })
          activeRunId = created.id
        }
        if (disposed) { await finishRun('stopped'); return }
        setCrawlRunId(activeRunId)
        if (pipelineMode) setSitePages(await runStore.listPipelinePages(activeRunId))
      } catch (failure) { if (!disposed) { setPhase('error'); setStatus(`Could not create crawl run: ${String(failure)}`) } return }
      let index = nextQueryIndex.current
      let outcome: 'done' | 'error' | 'stopped' = 'done'
      while (index < searches.length && !disposed && !stopRequested.current) {
        if (pauseRequested.current) {
          setPhase('paused')
          setStatus(`Paused before search ${index + 1} of ${searches.length}.`)
          await new Promise<void>((resolve) => { resumeWaiter.current = resolve })
          resumeWaiter.current = null
          if (disposed || stopRequested.current) break
        }
        const search = searches[index]
        setStatus(`Search ${index + 1} of ${searches.length}: opening ${search.place}...`)
        outcome = await new Promise<'done' | 'error' | 'stopped'>((resolve) => {
          let settled = false
          const finish = (result: 'done' | 'error' | 'stopped') => {
            if (settled) return
            settled = true
            unsubscribe?.()
            unsubscribe = undefined
            finishCurrent = undefined
            resolve(result)
          }
          finishCurrent = finish
          unsubscribe = bridge.onMapsScanEvent((message) => {
            if (disposed || message.id !== currentId) return
            const update = message.update
            if (update.type === 'status') {
              setStatus(`Search ${index + 1} of ${searches.length}: ${update.text}`)
              if (update.text === 'Search stopped.') finish('stopped')
            } else if (update.type === 'row') {
              if (finalized || stopRequested.current) return
              if (!preferences.showListingsWithoutWebsite && !update.row.website.trim()) return
              const excluded = preferences.useNicheKeywords && getNichePack(search.niche, criteria).negativeKeywords.some((term) => update.row.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
              if (excluded) return
              const row = {
                ...update.row,
                niche: search.niche,
                id: `${index}:${update.row.id}`,
                name: preferences.includeCompanyName ? update.row.name : '',
                website: preferences.includeWebsite ? update.row.website : '',
                phone: preferences.includePhone ? update.row.phone : '',
                address: preferences.includeAddress ? update.row.address : '',
                location: preferences.includeLocation ? update.row.location : '',
              }
              setRows((current) => {
                const identity = (item: MapsRow) => item.mapsUrl.trim().toLocaleLowerCase() || item.website.trim().toLocaleLowerCase().replace(/\/$/, '') || `${item.name.trim().toLocaleLowerCase()}|${item.address.trim().toLocaleLowerCase()}`
                const existing = current.findIndex((item) => item.id === row.id || (identity(row) !== '|' && identity(item) === identity(row)))
                return existing < 0 ? [...current, row] : current.map((item, itemIndex) => itemIndex === existing ? { ...item, ...row, id: item.id, emails: [...new Set([...item.emails, ...row.emails])] } : item)
              })
              if (activeRunId) {
                const task = runStore.saveCrawlRow({ id: activeRunId, row }).then(() => pipelineMode && update.row.website && activeRunId ? runStore.enqueuePipelineWebsite({ id: activeRunId, row: { ...row, website: update.row.website } }) : undefined).catch((failure) => { saveError = failure; if (!disposed) setStatus(`Could not save a result: ${String(failure)}`) })
                pendingRows.current.add(task)
                void task.finally(() => pendingRows.current.delete(task))
              }
            } else if (update.type === 'done') finish('done')
            else { setStatus(`Search ${index + 1} of ${searches.length}: ${update.text}`); finish('error') }
          })
          void bridge.startMapsScan({ query: search.query, location: search.place }).then((id) => {
            currentId = id
            if (disposed || stopRequested.current || pauseRequested.current) void bridge.stopMapsScan(id)
            else setRunId(id)
          }).catch((error) => { if (!disposed) setStatus(`Could not start ${search.place}: ${String(error)}`); finish('error') })
        })
        currentId = null
        setRunId(null)
        if (disposed || stopRequested.current) break
        if (outcome === 'stopped' && pauseRequested.current) continue
        if (outcome !== 'done') break
        index += 1
        nextQueryIndex.current = index
        try { await persistProgress('running') } catch (failure) { outcome = 'error'; if (!disposed) setStatus(`Could not save crawl position: ${String(failure)}`); break }
        if (index < searches.length) await new Promise((resolve) => window.setTimeout(resolve, 1500))
      }
      if (disposed) return
      let sitePaused = false
      if (!stopRequested.current && outcome !== 'error' && index >= searches.length && pipelineMode && activeRunId) {
        try {
          await Promise.allSettled([...pendingRows.current])
          if (saveError) throw saveError
          siteCrawlActive.current = true
          setStatus('Crawling queued public websites...')
          let result = await (siteCrawlTask = runStore.startPipelinePages(activeRunId))
          while (result === 'paused' && pauseRequested.current && !stopRequested.current && !disposed) {
            setPhase('paused')
            setStatus('Website crawl paused. Resume to continue from the queued page.')
            await new Promise<void>((resolve) => { resumeWaiter.current = resolve })
            resumeWaiter.current = null
            if (!stopRequested.current && !disposed) { setPhase('running'); result = await (siteCrawlTask = runStore.startPipelinePages(activeRunId)) }
          }
          if (result === 'paused') sitePaused = true
        } catch (failure) { sitePaused = true; setStatus(`Website crawl paused: ${String(failure)}`) }
        finally { siteCrawlActive.current = false }
      }
      if (disposed) return
      if (stopRequested.current) { setPhase('stopped'); setStatus('Search stopped. Saving CSV...'); if (await finishRun('stopped') && !disposed) setStatus('Search stopped. Results saved and exported.') }
      else if (sitePaused) { setPhase('stopped'); setStatus('Website crawl paused. Saving partial CSV...'); if (await finishRun('stopped') && !disposed) setStatus('Website crawl paused. Resume this pipeline to continue.') }
      else if (outcome === 'error') { setPhase('error'); await finishRun('failed', 'Search ended with an error.') }
      else if (index >= searches.length) { setPhase('completed'); setStatus('Search complete. Saving CSV...'); if (await finishRun('completed') && !disposed) setStatus(`Completed all ${searches.length} searches. Results exported.`) }
      else { setPhase('stopped'); setStatus('Search stopped. Saving CSV...'); if (await finishRun('stopped') && !disposed) setStatus('Search stopped. Results saved and exported.') }
    }
    void runQueue()
    return () => {
      disposed = true
      stopRequested.current = true
      pauseRequested.current = false
      resumeWaiter.current?.()
      resumeWaiter.current = null
      if (currentId) void bridge.stopMapsScan(currentId)
      if (siteCrawlActive.current && activeRunId) void runStore.pausePipelinePages(activeRunId)
      finishCurrent?.('stopped')
      unsubscribe?.()
      unsubscribePages?.()
      if (activeRunId && !finalized) void finishRun('stopped')
    }
  }, [searches, retry, preferences, criteria, initialRun, pipelineMode, pipelineName, provider])

  function pause() {
    if (phase !== 'running') return
    pauseRequested.current = true
    setPhase('pausing')
    setStatus('Pausing current search...')
    if (runId) void mapsBridge()?.stopMapsScan(runId)
    if (siteCrawlActive.current && crawlRunId) void crawlRunBridge()?.pausePipelinePages(crawlRunId)
  }
  function resume() {
    if (phase !== 'paused') return
    pauseRequested.current = false
    setPhase('running')
    setStatus('Resuming search...')
    resumeWaiter.current?.()
    resumeWaiter.current = null
  }
  function stop() {
    if (!isActive && phase !== 'paused') return
    stopRequested.current = true
    pauseRequested.current = false
    resumeWaiter.current?.()
    resumeWaiter.current = null
    if (runId) void mapsBridge()?.stopMapsScan(runId)
    if (siteCrawlActive.current && crawlRunId) void crawlRunBridge()?.pausePipelinePages(crawlRunId)
    setPhase('stopped')
    setStatus('Search stopped.')
  }

  async function exportAgain() {
    if (!crawlRunId) return
    try {
      const item = await crawlRunBridge()?.exportCrawlRun(crawlRunId, true)
      if (item) { setLastExport(item); setStatus(`CSV exported: ${item.fileName}`) }
    } catch (error) { setStatus(`Could not export CSV: ${String(error)}`) }
  }

  return <div className="la-search-results">
    {pipelineMode && <PipelineTimeline current={4}/>} 
    <div className="la-results-heading"><button type="button" className="la-result-back" aria-label="Back to choices" title="Back to choices" onClick={onBack}><Icon name="back" size={18}/></button></div>
    <section className="la-maps-results">
      <div className="la-maps-results-heading"><h2>Crawled businesses</h2><div className="la-result-controls" role="group" aria-label="Crawl controls">
        <button type="button" className="la-result-control la-result-control--play" aria-label="Play search from the beginning" title="Play from beginning" disabled={isActive || phase === 'paused'} onClick={() => setRetry((value) => value + 1)}><FaPlay size={14}/></button>
        <button type="button" className="la-result-control la-result-control--pause" aria-label="Pause search" title="Pause current search" disabled={phase !== 'running'} onClick={pause}><FaPause size={14}/></button>
        <button type="button" className="la-result-control la-result-control--resume" aria-label="Resume search" title="Resume paused search" disabled={phase !== 'paused'} onClick={resume}><Icon name="resume" size={17}/></button>
        <button type="button" className="la-result-control la-result-control--stop" aria-label="Stop search" title="Stop search" disabled={!isActive && phase !== 'paused'} onClick={stop}><FaStop size={14}/></button>
      </div></div>
      <p className="la-maps-scan-status" aria-live="polite">{isActive && <span className="la-crawler-dot" />}{status}</p>
      {lastExport && <div className="la-crawl-export-note"><span title={lastExport.filePath}>CSV saved: {lastExport.fileName} · {lastExport.entryCount.toLocaleString()} entries</span><button type="button" onClick={() => void exportAgain()}><Icon name="exports" size={15} /> Export again</button></div>}
      {hasVisibleFields ? <>
        <div className="la-result-table-toolbar"><span>{rows.length.toLocaleString()} {rows.length === 1 ? 'result' : 'results'}</span><nav className="la-result-pagination" aria-label="Search result pages"><span>{rows.length ? `${pageStart + 1}-${Math.min(pageStart + perPage, rows.length)} of ${rows.length.toLocaleString()}` : '0 results'}</span><button type="button" className="la-result-page-prev" aria-label="Previous result page" title="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><Icon name="chevron" size={14}/></button>{pageButtons.map((number) => <button type="button" key={number} aria-label={`Result page ${number}`} aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}<button type="button" aria-label="Next result page" title="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={14}/></button><CustomSelect label="Results per page" value={String(perPage)} onChange={(value) => { setPerPage(Number(value)); setPage(1) }} options={[{ value: '25', label: '25 / page' }, { value: '50', label: '50 / page' }, { value: '100', label: '100 / page' }]} /></nav></div>
        <div className="la-table-scroll"><table className="la-table la-maps-table"><thead><tr><th>#</th>{preferences.includeCompanyName && <th>Business</th>}{preferences.includeWebsite && <th>Website URL</th>}{preferences.includePhone && <th>Phone</th>}{preferences.includeLocation && <th>Location</th>}{preferences.includeAddress && <th>Address</th>}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.id}><td>{pageStart + index + 1}</td>{preferences.includeCompanyName && <td><strong className="la-result-ellipsis" title={row.name}>{row.name || 'Not shown'}</strong></td>}{preferences.includeWebsite && <td className="la-maps-url">{row.website ? <a className="la-result-ellipsis" title={row.website} href={row.website} onClick={(event) => { event.preventDefault(); void mapsBridge()?.openWebsite(row.website) }}>{row.website}</a> : 'Not shown'}</td>}{preferences.includePhone && <td>{row.phone || 'Not shown'}</td>}{preferences.includeLocation && <td><span className="la-result-ellipsis" title={row.location}>{row.location || 'Not shown'}</span></td>}{preferences.includeAddress && <td><span className="la-result-ellipsis" title={row.address}>{row.address || 'Not shown'}</span></td>}</tr>)}</tbody></table>{!rows.length && <EmptyTable title={isActive ? 'Searching for businesses' : 'No results found'} description={isActive ? 'Public result cards will appear here as they load.' : 'Try another niche or location to find public business listings.'} />}</div>
      </> : <p className="la-records-empty">All result fields are hidden. Enable at least one field in Profile preferences.</p>}
      {pipelineMode && <section className="la-pipeline-queue"><div className="la-section-heading"><div><h2>Website URL queue</h2><p>Pages are processed by the configured worker pool. Unfinished URLs resume after a pause or restart.</p></div><span>{sitePages.filter((item) => item.status === 'crawled').length}/{sitePages.length} crawled</span></div>
        <div className="la-result-table-toolbar"><span>{sitePages.length.toLocaleString()} queued pages</span><nav className="la-result-pagination" aria-label="Website URL queue pages"><span>{sitePages.length ? `${queuePageStart + 1}-${Math.min(queuePageStart + queuePerPage, sitePages.length)} of ${sitePages.length.toLocaleString()}` : '0 pages'}</span><button type="button" className="la-result-page-prev" aria-label="Previous queue page" title="Previous page" disabled={currentQueuePage === 1} onClick={() => setQueuePage(currentQueuePage - 1)}><Icon name="chevron" size={14}/></button>{queuePageButtons.map((number) => <button type="button" key={number} aria-label={`Queue page ${number}`} aria-current={number === currentQueuePage ? 'page' : undefined} onClick={() => setQueuePage(number)}>{number}</button>)}<button type="button" aria-label="Next queue page" title="Next page" disabled={currentQueuePage === queuePageCount} onClick={() => setQueuePage(currentQueuePage + 1)}><Icon name="chevron" size={14}/></button><CustomSelect label="Queue rows per page" value={String(queuePerPage)} onChange={(value) => { setQueuePerPage(Number(value)); setQueuePage(1) }} options={[{ value: '25', label: '25 / page' }, { value: '50', label: '50 / page' }, { value: '100', label: '100 / page' }]} /></nav></div>
        <div className="la-table-scroll"><table className="la-table"><thead><tr><th>#</th><th>Page URL</th><th>Type</th><th>Status</th><th>Emails</th></tr></thead><tbody>{visibleSitePages.map((item, index) => <tr key={`${item.rowKey}:${item.url}`}><td>{queuePageStart + index + 1}</td><td title={item.url}><span className="la-result-ellipsis">{item.url}</span></td><td>{item.kind}</td><td>{item.status}{item.error ? ` · ${item.error}` : ''}</td><td>{item.emails.join(', ') || '—'}</td></tr>)}</tbody></table>{!sitePages.length && <EmptyTable title="No websites queued" description="Websites from public business results will enter the queue as they appear." />}</div></section>}
    </section>
    <p className="la-results-note">Results are saved locally with their run and exported to Documents/LeadsGhr/exports when the crawl stops or completes. Maps loads up to 200 visible listings per location. Public website email scanning is planned for later.</p>
  </div>
}
