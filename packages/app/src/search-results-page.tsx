import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CrawlExport,
  CrawlRow,
  CrawlRunDetail,
  DesktopPreferences,
  PipelineProvider,
  SearchCriteria,
} from '@leadsghr/schemas'
import { getNichePack } from './niche-library-data'
import { crawlRunBridge, type PipelinePage } from './crawl-run-bridge'
import locationData from '../data/us-states-locations.json'
import { CustomSelect } from './custom-select'
import { EmptyState, Icon, Table } from '@leadsghr/ui'
import { FaPause, FaPlay, FaStop } from 'react-icons/fa'
import { MdOutlineVisibility } from 'react-icons/md'
import { PipelineTimeline } from './pipeline-timeline'
import { CRAWL_QUEUE_VISIBLE_ROWS, crawlQueueWindow } from './crawl-queue-window'

type MapsRow = CrawlRow
type ScanUpdate =
  | { type: 'status'; text: string }
  | { type: 'row'; row: MapsRow }
  | { type: 'done'; count: number }
  | { type: 'error'; text: string }
type ScanMessage = { id: string; update: ScanUpdate }
type MapsBridge = {
  startMapsScan(input: { query: string; location: string }): Promise<string>
  stopMapsScan(id: string): Promise<void>
  openWebsite(url: string): Promise<void>
  onMapsScanEvent(callback: (message: ScanMessage) => void): () => void
}
const mapsBridge = () => (window as Window & { leadsGhrDesktop?: MapsBridge }).leadsGhrDesktop

export type PreparedSearch = { niche: string; term: string; place: string; query: string }

/** One search per niche term and place: `<term> in <place>` (niche names, or every Niche Library term when on). */
export function prepareSearches(criteria: SearchCriteria, useNicheKeywords: boolean): PreparedSearch[] {
  const locationsByState = new Map(
    criteria.selectedStates.map((state) => [state, [] as string[]]),
  )
  for (const place of criteria.selectedLocations) {
    const state = place.slice(place.lastIndexOf(', ') + 2)
    locationsByState.get(state)?.push(place)
  }
  const seen = new Set<string>()
  return criteria.selectedNiches.flatMap((niche) =>
    (useNicheKeywords ? getNichePack(niche, criteria).searchTerms : [niche]).flatMap(
      (term) =>
        criteria.selectedStates.flatMap((state) =>
          (locationsByState.get(state) ?? []).flatMap((place) => {
            const key = `${term.toLocaleLowerCase()}|${place.toLocaleLowerCase()}`
            if (seen.has(key)) return []
            seen.add(key)
            return [{ niche, term, place, query: `${term} in ${place}` }]
          }),
        ),
    ),
  )
}

/** The first and last selected state's position in the location list (stored with every run). */
export function stateRange(criteria: SearchCriteria): { stateStartNumber: number; stateEndNumber: number } {
  const numbers = criteria.selectedStates
    .map((state) => locationData.states.findIndex((item) => item.name === state) + 1)
    .filter((number) => number > 0)
  return { stateStartNumber: Math.min(...numbers), stateEndNumber: Math.max(...numbers) }
}
type RunPhase = 'running' | 'pausing' | 'paused' | 'stopped' | 'completed' | 'error'

/** Maps errors that affect every search, so the run stops (with its reason) instead of skipping the location. */
const STOPPING_SEARCH_ERROR = /challenge|robots|not installed|Enable Maps/i
/** Maps errors that mean Google cannot be reached (usually the internet connection): wait and try the same search again. */
const OFFLINE_SEARCH_ERROR =
  /ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|ConnectTimeout|socket hang up|fetch failed|network/i

export function SearchResultsPage({
  criteria,
  preferences,
  initialRun,
  pipelineMode = false,
  pipelineName,
  provider = 'google-maps',
  onSaved,
  onFinished,
  exportRef,
  onExportChange,
}: {
  criteria: SearchCriteria
  preferences: DesktopPreferences
  initialRun?: CrawlRunDetail | null
  pipelineMode?: boolean
  pipelineName?: string
  provider?: PipelineProvider
  onSaved?(): void
  onFinished?(item: CrawlExport): void
  exportRef?: { current: (() => void) | null }
  onExportChange?(
    item: { fileName: string; filePath: string; entryCount: number } | null,
  ): void
}) {
  const [retry, setRetry] = useState(0)
  const [rows, setRows] = useState<MapsRow[]>([])
  const [status, setStatus] = useState('Preparing searches...')
  const [phase, setPhase] = useState<RunPhase>('running')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [resultQuery, setResultQuery] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [crawlRunId, setCrawlRunId] = useState<string | null>(initialRun?.id ?? null)
  const [lastExport, setLastExport] = useState<CrawlExport | null>(null)
  const [sitePages, setSitePages] = useState<PipelinePage[]>([])
  const [websiteCrawlFinished, setWebsiteCrawlFinished] = useState(false)
  const [selectedSitePageKey, setSelectedSitePageKey] = useState<string | null>(null)
  const [siteCrawlStartedAt, setSiteCrawlStartedAt] = useState<number | null>(null)
  const [siteCrawlElapsedMs, setSiteCrawlElapsedMs] = useState(0)
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null)
  const detailCloseRef = useRef<HTMLButtonElement | null>(null)
  const stopRequested = useRef(false)
  const pauseRequested = useRef(false)
  const sitePauseRequested = useRef(false)
  const resumeWaiter = useRef<(() => void) | null>(null)
  const siteResumeWaiter = useRef<(() => void) | null>(null)
  const nextQueryIndex = useRef(initialRun?.nextQueryIndex ?? 0)
  const pendingRows = useRef(new Set<Promise<unknown>>())
  const siteCrawlActive = useRef(false)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  const searches = useMemo<PreparedSearch[]>(
    () => initialRun?.searches ?? prepareSearches(criteria, preferences.useNicheKeywords),
    [criteria, preferences.useNicheKeywords, initialRun],
  )
  // The search box above the table filters the results by any shown detail (name, website, phone, place,
  // address, source, or email); paging and counts follow the filtered list.
  const filteredRows = useMemo(() => {
    const words = resultQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return rows
    return rows.filter((row) => {
      const text = [row.name, row.website, row.phone, row.location, row.address, row.source, row.niche ?? '', ...row.emails]
        .join(' ')
        .toLocaleLowerCase()
      return words.every((word) => text.includes(word))
    })
  }, [rows, resultQuery])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / perPage))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * perPage
  const visibleRows = filteredRows.slice(pageStart, pageStart + perPage)
  const firstPageButton = Math.max(1, Math.min(currentPage - 2, pageCount - 4))
  const pageButtons = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => firstPageButton + index,
  )
  const sitePageKey = (item: PipelinePage) => `${item.rowKey}|${item.url}`
  const visibleSitePages = crawlQueueWindow(sitePages, (item) => item.status)
  const processedSitePages = sitePages.filter(
    (item) => item.status === 'crawled' || item.status === 'skipped',
  ).length
  const queuedSitePages = sitePages.filter((item) => item.status === 'queued').length
  const uniqueSiteEmails = new Set(
    sitePages.flatMap((item) => item.emails.map((email) => email.toLowerCase())),
  ).size
  const selectedSitePage = sitePages.find((item) => sitePageKey(item) === selectedSitePageKey)
  const homepageEmails = new Set(
    sitePages
      .filter((item) => item.rowKey === selectedSitePage?.rowKey && item.kind === 'Homepage')
      .flatMap((item) => item.emails.map((email) => email.toLowerCase())),
  )
  const isActive = phase === 'running' || phase === 'pausing'
  const hasVisibleFields =
    preferences.includeCompanyName ||
    preferences.includeWebsite ||
    preferences.includePhone ||
    preferences.includeAddress ||
    preferences.includeLocation

  useEffect(() => {
    if (
      siteCrawlStartedAt === null ||
      websiteCrawlFinished ||
      phase === 'stopped' ||
      phase === 'error'
    )
      return
    const timer = window.setInterval(
      () => setSiteCrawlElapsedMs(Date.now() - siteCrawlStartedAt),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [siteCrawlStartedAt, websiteCrawlFinished, phase])
  useEffect(() => {
    if (!selectedSitePageKey) return
    detailCloseRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedSitePageKey(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedSitePageKey])
  const closeSiteDetails = () => {
    setSelectedSitePageKey(null)
    detailTriggerRef.current?.focus()
  }
  const siteElapsedSeconds = Math.floor(siteCrawlElapsedMs / 1000)
  const siteElapsed = `${Math.floor(siteElapsedSeconds / 3600)}:${String(Math.floor(siteElapsedSeconds / 60) % 60).padStart(2, '0')}:${String(siteElapsedSeconds % 60).padStart(2, '0')}`

  useEffect(() => {
    const bridge = mapsBridge()
    const runStore = crawlRunBridge()
    if (
      typeof bridge?.startMapsScan !== 'function' ||
      typeof bridge.onMapsScanEvent !== 'function'
    ) {
      setPhase('error')
      setStatus(
        'Desktop scanner bridge is unavailable. Fully restart the app to load the new preload.',
      )
      return
    }
    if (typeof runStore?.createCrawlRun !== 'function') {
      setPhase('error')
      setStatus('Run storage is unavailable. Restart the desktop app.')
      return
    }
    if (!searches.length) {
      setPhase('error')
      setStatus('No locations are selected. Go back and choose locations.')
      return
    }
    let disposed = false
    let currentId: string | null = null
    let activeRunId: string | null = null
    let siteCrawlTask: Promise<void> | null = null
    let sitePaused = false
    let sitePauseReason: string | undefined
    // Set when the searches end, so the website crawl pause it triggers is not mistaken for a crawler problem.
    let searchesEnded = false
    // A reason that stops every remaining search (Google challenge, robots.txt, setup problem).
    let searchError: string | null = null
    let lastErrorText = ''
    const skipped: string[] = []
    let finalized = false
    let saveError: unknown = null
    let unsubscribe: (() => void) | undefined
    const unsubscribePages = pipelineMode
      ? runStore.onPipelinePagesEvent((message) => {
          if (message.id !== activeRunId || disposed) return
          setSitePages(message.pages)
          if (siteCrawlActive.current && nextQueryIndex.current >= searches.length)
            setStatus(message.text)
          if (message.text.includes(': crawled '))
            void runStore.getCrawlRun(message.id).then((saved) => {
              if (!disposed && saved) setRows(saved.rows)
            })
        })
      : undefined
    let finishCurrent: ((result: 'done' | 'error' | 'stopped') => void) | undefined
    stopRequested.current = false
    pauseRequested.current = false
    sitePauseRequested.current = false
    resumeWaiter.current = null
    siteResumeWaiter.current = null
    setRows(retry === 0 ? (initialRun?.rows ?? []) : [])
    setPage(1)
    setRunId(null)
    setPhase('running')
    setLastExport(null)
    setSitePages([])
    setWebsiteCrawlFinished(false)
    setSelectedSitePageKey(null)
    setSiteCrawlStartedAt(null)
    setSiteCrawlElapsedMs(0)
    siteCrawlActive.current = false
    nextQueryIndex.current = retry === 0 ? (initialRun?.nextQueryIndex ?? 0) : 0

    const persistProgress = async (
      status: 'running' | 'stopped' | 'completed' | 'failed',
      error?: string,
    ) => {
      if (!activeRunId) return
      await Promise.allSettled([...pendingRows.current])
      if (saveError) throw new Error(`A result could not be saved: ${String(saveError)}`)
      await runStore.updateCrawlRun({
        id: activeRunId,
        nextQueryIndex: nextQueryIndex.current,
        status,
        error,
      })
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
            if (!disposed)
              setStatus(
                `Email filtering complete: ${filtered.kept} kept, ${filtered.removed} removed. Exporting CSV...`,
              )
          }
          const item = await runStore.exportCrawlRun(activeRunId)
          if (!disposed && item) {
            setLastExport(item)
            if (pipelineMode) onFinishedRef.current?.(item)
          }
        }
        onSavedRef.current?.()
        return true
      } catch (failure) {
        if (activeRunId)
          void runStore
            .updateCrawlRun({
              id: activeRunId,
              nextQueryIndex: nextQueryIndex.current,
              status: 'failed',
              error: String(failure),
            })
            .then(() => onSavedRef.current?.())
            .catch(() => undefined)
        if (!disposed) {
          setPhase('error')
          setStatus(`Could not save run or CSV: ${String(failure)}`)
        }
        return false
      }
    }

    const crawlWebsites = async (id: string, startedAt: number) => {
      while (!disposed && !stopRequested.current) {
        if (pauseRequested.current) {
          setPhase('paused')
          await new Promise<void>((resolve) => {
            siteResumeWaiter.current = resolve
          })
          siteResumeWaiter.current = null
          if (disposed || stopRequested.current) return
        }
        siteCrawlActive.current = true
        let result: 'completed' | 'paused'
        try {
          result = await runStore.startPipelinePages(id)
        } catch (failure) {
          sitePaused = true
          sitePauseReason = `Website crawl paused: ${String(failure)}`
          stopRequested.current = true
          setStatus(sitePauseReason)
          if (currentId) void bridge.stopMapsScan(currentId)
          return
        } finally {
          siteCrawlActive.current = false
        }
        if (result === 'completed') {
          if (!disposed) {
            setWebsiteCrawlFinished(true)
            setSiteCrawlElapsedMs(Date.now() - startedAt)
          }
          return
        }
        if (searchesEnded) return
        if (!sitePauseRequested.current || stopRequested.current || disposed) {
          if (!stopRequested.current && !disposed) {
            sitePaused = true
            stopRequested.current = true
            setStatus('Website crawl paused. Resume this pipeline to continue.')
            if (currentId) void bridge.stopMapsScan(currentId)
          }
          return
        }
        sitePauseRequested.current = false
        if (pauseRequested.current) {
          setPhase('paused')
          setStatus('Pipeline paused. Resume to continue searching and crawling.')
          await new Promise<void>((resolve) => {
            siteResumeWaiter.current = resolve
          })
          siteResumeWaiter.current = null
        }
      }
    }

    const runQueue = async () => {
      try {
        if (retry === 0 && initialRun) {
          activeRunId = initialRun.id
          await runStore.updateCrawlRun({
            id: activeRunId,
            nextQueryIndex: nextQueryIndex.current,
            status: 'running',
          })
          if (pipelineMode)
            for (const row of initialRun.rows)
              if (row.website) await runStore.enqueuePipelineWebsite({ id: activeRunId, row })
        } else {
          const stateNumbers = criteria.selectedStates
            .map((state) => locationData.states.findIndex((item) => item.name === state) + 1)
            .filter((number) => number > 0)
          const created = await runStore.createCrawlRun({
            name: pipelineName,
            provider,
            kind: pipelineMode ? 'pipeline' : 'search',
            criteria,
            preferences,
            searches,
            stateStartNumber: Math.min(...stateNumbers),
            stateEndNumber: Math.max(...stateNumbers),
          })
          activeRunId = created.id
        }
        if (disposed) {
          await finishRun('stopped')
          return
        }
        setCrawlRunId(activeRunId)
        if (pipelineMode) {
          setSitePages(await runStore.listPipelinePages(activeRunId))
          const startedAt = Date.now()
          setSiteCrawlStartedAt(startedAt)
          siteCrawlTask = crawlWebsites(activeRunId, startedAt)
        }
      } catch (failure) {
        if (!disposed) {
          setPhase('error')
          setStatus(`Could not create crawl run: ${String(failure)}`)
        }
        return
      }
      let index = nextQueryIndex.current
      let outcome: 'done' | 'error' | 'stopped' = 'done'
      let attempt = 0
      let failuresInARow = 0
      let offlineSince = 0
      let offlineWaits = 0
      while (index < searches.length && !disposed && !stopRequested.current) {
        if (pauseRequested.current) {
          setPhase('paused')
          setStatus(`Paused before search ${index + 1} of ${searches.length}.`)
          await new Promise<void>((resolve) => {
            resumeWaiter.current = resolve
          })
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
              const excluded =
                preferences.useNicheKeywords &&
                getNichePack(search.niche, criteria).negativeKeywords.some((term) =>
                  update.row.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
                )
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
                const identity = (item: MapsRow) =>
                  item.mapsUrl.trim().toLocaleLowerCase() ||
                  item.website.trim().toLocaleLowerCase().replace(/\/$/, '') ||
                  `${item.name.trim().toLocaleLowerCase()}|${item.address.trim().toLocaleLowerCase()}`
                const existing = current.findIndex(
                  (item) =>
                    item.id === row.id ||
                    (identity(row) !== '|' && identity(item) === identity(row)),
                )
                return existing < 0
                  ? [...current, row]
                  : current.map((item, itemIndex) =>
                      itemIndex === existing
                        ? {
                            ...item,
                            ...row,
                            id: item.id,
                            emails: [...new Set([...item.emails, ...row.emails])],
                          }
                        : item,
                    )
              })
              if (activeRunId) {
                const task = runStore
                  .saveCrawlRow({ id: activeRunId, row })
                  .then(() =>
                    pipelineMode && update.row.website && activeRunId
                      ? runStore.enqueuePipelineWebsite({
                          id: activeRunId,
                          row: { ...row, website: update.row.website },
                        })
                      : undefined,
                  )
                  .catch((failure) => {
                    saveError = failure
                    if (!disposed) setStatus(`Could not save a result: ${String(failure)}`)
                  })
                pendingRows.current.add(task)
                void task.finally(() => pendingRows.current.delete(task))
              }
            } else if (update.type === 'done') finish('done')
            else {
              lastErrorText = update.text.replace(/^Error:\s*/, '')
              setStatus(`Search ${index + 1} of ${searches.length}: ${lastErrorText}`)
              finish('error')
            }
          })
          void bridge
            .startMapsScan({ query: search.query, location: search.place })
            .then((id) => {
              currentId = id
              if (disposed || stopRequested.current || pauseRequested.current)
                void bridge.stopMapsScan(id)
              else setRunId(id)
            })
            .catch((error) => {
              lastErrorText = `Could not start the search: ${String(error).replace(/^Error:\s*/, '')}`
              if (!disposed) setStatus(`Could not start ${search.place}: ${String(error)}`)
              finish('error')
            })
        })
        currentId = null
        setRunId(null)
        if (disposed || stopRequested.current) break
        if (outcome === 'stopped' && pauseRequested.current) continue
        if (outcome === 'error' && OFFLINE_SEARCH_ERROR.test(lastErrorText)) {
          // Google cannot be reached (usually the internet connection): pause here, without using up this
          // location's retry, and resume automatically with the same location once Google answers again.
          // There is no time limit; Pause and Stop still work while waiting.
          offlineSince ||= Date.now()
          const seconds = Math.min(60, 15 * 2 ** Math.min(offlineWaits, 2))
          offlineWaits += 1
          const offlineMinutes = Math.floor((Date.now() - offlineSince) / 60000)
          for (
            let left = seconds;
            left > 0 && !disposed && !stopRequested.current && !pauseRequested.current;
            left--
          ) {
            setStatus(
              `Paused: no internet connection${offlineMinutes ? ` for ${offlineMinutes} min` : ''}. Resumes automatically at search ${index + 1} of ${searches.length} (${search.place}); checking again in ${left} s.`,
            )
            await new Promise((resolve) => window.setTimeout(resolve, 1000))
          }
          if (disposed || stopRequested.current) break
          continue
        }
        offlineSince = 0
        offlineWaits = 0
        if (outcome === 'error') {
          // Google challenges, robots.txt rules, and setup problems affect every search: stop and keep the reason.
          if (STOPPING_SEARCH_ERROR.test(lastErrorText)) {
            searchError = lastErrorText
            break
          }
          // Anything else concerns only this location (Google often answers the same search differently a
          // moment later): try it once more, then skip it and continue with the next location.
          if (attempt === 0) {
            attempt = 1
            setStatus(
              `Search ${index + 1} of ${searches.length}: retrying ${search.place} (${lastErrorText})`,
            )
            await new Promise((resolve) => window.setTimeout(resolve, 5000))
            if (disposed || stopRequested.current) break
            continue
          }
          skipped.push(`${search.place}: ${lastErrorText}`)
          failuresInARow += 1
          if (failuresInARow >= 3) {
            searchError = `${failuresInARow} searches in a row failed (last: ${lastErrorText})`
            break
          }
          setStatus(
            `Search ${index + 1} of ${searches.length}: skipped ${search.place} (${lastErrorText})`,
          )
        } else if (outcome !== 'done') break
        else failuresInARow = 0
        attempt = 0
        index += 1
        nextQueryIndex.current = index
        try {
          await persistProgress('running')
        } catch (failure) {
          outcome = 'error'
          if (!disposed) setStatus(`Could not save crawl position: ${String(failure)}`)
          break
        }
        if (index < searches.length)
          await new Promise((resolve) => window.setTimeout(resolve, 1500))
      }
      if (disposed) return
      if (siteCrawlTask) {
        if (stopRequested.current || searchError || index < searches.length || sitePaused) {
          searchesEnded = !sitePaused
          if (activeRunId && siteCrawlActive.current) await runStore.pausePipelinePages(activeRunId)
          siteResumeWaiter.current?.()
        }
        await siteCrawlTask
      }
      if (disposed) return
      const skippedNote = skipped.length
        ? `${skipped.length} search${skipped.length === 1 ? '' : 'es'} skipped: ${skipped.slice(0, 20).join('; ')}${skipped.length > 20 ? '; ...' : ''}`
        : undefined
      const again = pipelineMode
        ? 'Resume this pipeline to continue.'
        : 'Results saved and exported.'
      if (sitePaused) {
        setPhase('stopped')
        setStatus('Website crawl paused. Saving partial CSV...')
        if ((await finishRun('stopped', sitePauseReason)) && !disposed)
          setStatus(
            `${sitePauseReason ?? 'Website crawl paused.'} Resume this pipeline to continue.`,
          )
      } else if (searchError) {
        setPhase('stopped')
        setStatus(
          `Stopped at search ${index + 1} of ${searches.length}: ${searchError}. Saving results...`,
        )
        if (
          (await finishRun(
            'stopped',
            `Stopped at search ${index + 1} of ${searches.length}: ${searchError}`,
          )) &&
          !disposed
        )
          setStatus(
            `Stopped at search ${index + 1} of ${searches.length}: ${searchError}. ${again}`,
          )
      } else if (stopRequested.current) {
        setPhase('stopped')
        setStatus('Search stopped. Saving CSV...')
        if ((await finishRun('stopped')) && !disposed)
          setStatus('Search stopped. Results saved and exported.')
      } else if (index >= searches.length) {
        setPhase('completed')
        setStatus('Search complete. Saving CSV...')
        if ((await finishRun('completed', skippedNote)) && !disposed)
          setStatus(
            `Completed all ${searches.length} searches${skipped.length ? ` (${skipped.length} skipped)` : ''}. Results exported.`,
          )
      } else {
        setPhase('stopped')
        setStatus('Search stopped. Saving CSV...')
        if ((await finishRun('stopped')) && !disposed)
          setStatus('Search stopped. Results saved and exported.')
      }
    }
    // StrictMode replays mount effects in development. Defer the database write
    // until after that replay, so its first cleanup cancels the duplicate start.
    const startTimer = window.setTimeout(() => {
      void runQueue()
    }, 0)
    return () => {
      window.clearTimeout(startTimer)
      disposed = true
      stopRequested.current = true
      pauseRequested.current = false
      resumeWaiter.current?.()
      resumeWaiter.current = null
      siteResumeWaiter.current?.()
      siteResumeWaiter.current = null
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
    sitePauseRequested.current = true
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
    siteResumeWaiter.current?.()
    siteResumeWaiter.current = null
  }
  function stop() {
    if (!isActive && phase !== 'paused') return
    stopRequested.current = true
    pauseRequested.current = false
    resumeWaiter.current?.()
    resumeWaiter.current = null
    siteResumeWaiter.current?.()
    siteResumeWaiter.current = null
    if (runId) void mapsBridge()?.stopMapsScan(runId)
    if (siteCrawlActive.current && crawlRunId) void crawlRunBridge()?.pausePipelinePages(crawlRunId)
    setPhase('stopped')
    setStatus('Search stopped.')
  }

  async function exportAgain() {
    if (!crawlRunId) return
    try {
      const item = await crawlRunBridge()?.exportCrawlRun(crawlRunId, true)
      if (item) {
        setLastExport(item)
        setStatus(`CSV exported: ${item.fileName}`)
      }
    } catch (error) {
      setStatus(`Could not export CSV: ${String(error)}`)
    }
  }

  useEffect(() => {
    if (!exportRef) return
    exportRef.current = () => {
      void exportAgain()
    }
    return () => {
      exportRef.current = null
    }
  })
  useEffect(() => {
    onExportChange?.(
      lastExport
        ? {
            fileName: lastExport.fileName,
            filePath: lastExport.filePath,
            entryCount: lastExport.entryCount,
          }
        : null,
    )
    return () => onExportChange?.(null)
  }, [lastExport, onExportChange])

  return (
    <div className="la-search-results">
      {pipelineMode && <PipelineTimeline current={4} />}
      <section className="la-maps-results">
        <div className="la-maps-results-heading">
          {lastExport ? (
            <p className="la-maps-saved-path" title={lastExport.filePath}>
              {lastExport.filePath}
            </p>
          ) : (
            <span />
          )}
          <div className="la-result-controls" role="group" aria-label="Crawl controls">
            <button
              type="button"
              className="la-result-control la-result-control--play"
              aria-label="Play search from the beginning"
              title="Play from beginning"
              disabled={isActive || phase === 'paused'}
              onClick={() => setRetry((value) => value + 1)}
            >
              <FaPlay size={14} />
            </button>
            <button
              type="button"
              className="la-result-control la-result-control--pause"
              aria-label="Pause search"
              title="Pause current search"
              disabled={phase !== 'running'}
              onClick={pause}
            >
              <FaPause size={14} />
            </button>
            <button
              type="button"
              className="la-result-control la-result-control--resume"
              aria-label="Resume search"
              title="Resume paused search"
              disabled={phase !== 'paused'}
              onClick={resume}
            >
              <Icon name="resume" size={17} />
            </button>
            <button
              type="button"
              className="la-result-control la-result-control--stop"
              aria-label="Stop search"
              title="Stop search"
              disabled={!isActive && phase !== 'paused'}
              onClick={stop}
            >
              <FaStop size={14} />
            </button>
          </div>
        </div>
        <p className="la-maps-scan-status" aria-live="polite">
          {isActive && <span className="la-crawler-dot" />}
          {status}
        </p>
        {!pipelineMode &&
          (hasVisibleFields ? (
            <>
              <div className="la-result-table-toolbar">
                <span>
                  {resultQuery.trim()
                    ? `${filteredRows.length.toLocaleString()} of ${rows.length.toLocaleString()} results match`
                    : `${rows.length.toLocaleString()} ${rows.length === 1 ? 'result' : 'results'}`}
                </span>
                <label className="la-records-search la-result-search">
                  <Icon name="search" size={16} />
                  <input
                    type="search"
                    value={resultQuery}
                    onChange={(event) => {
                      setResultQuery(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Search results: name, website, phone, address..."
                    aria-label="Search the results table"
                  />
                </label>
                <nav className="la-result-pagination" aria-label="Search result pages">
                  <span>
                    {filteredRows.length
                      ? `${pageStart + 1}-${Math.min(pageStart + perPage, filteredRows.length)} of ${filteredRows.length.toLocaleString()}`
                      : '0 results'}
                  </span>
                  <button
                    type="button"
                    className="la-result-page-prev"
                    aria-label="Previous result page"
                    title="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <Icon name="chevron" size={14} />
                  </button>
                  {pageButtons.map((number) => (
                    <button
                      type="button"
                      key={number}
                      aria-label={`Result page ${number}`}
                      aria-current={number === currentPage ? 'page' : undefined}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Next result page"
                    title="Next page"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <Icon name="chevron" size={14} />
                  </button>
                  <CustomSelect
                    label="Results per page"
                    value={String(perPage)}
                    onChange={(value) => {
                      setPerPage(Number(value))
                      setPage(1)
                    }}
                    options={[
                      { value: '25', label: '25 / page' },
                      { value: '50', label: '50 / page' },
                      { value: '100', label: '100 / page' },
                    ]}
                  />
                </nav>
              </div>
              <div className="la-table-scroll">
                <Table
                  data={visibleRows.map((row, index) => ({
                    ...row,
                    rowNumber: pageStart + index + 1,
                  }))}
                  loading={isActive && !rows.length}
                  paginator={false}
                  tableClassName="la-maps-table"
                  rowKey={(row) => row.id}
                  columns={[
                    { field: 'rowNumber', header: '#' },
                    ...(preferences.includeCompanyName
                      ? [
                          {
                            field: 'name',
                            header: 'Business',
                            cell: (row: (typeof visibleRows)[number] & { rowNumber: number }) => (
                              <strong className="la-result-ellipsis" title={row.name}>
                                {row.name || 'Not shown'}
                              </strong>
                            ),
                          },
                        ]
                      : []),
                    ...(preferences.includeWebsite
                      ? [
                          {
                            field: 'website',
                            header: 'Website URL',
                            className: 'la-maps-url',
                            cell: (row: (typeof visibleRows)[number]) =>
                              row.website ? (
                                <a
                                  className="la-result-ellipsis"
                                  title={row.website}
                                  href={row.website}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    void mapsBridge()?.openWebsite(row.website)
                                  }}
                                >
                                  {row.website}
                                </a>
                              ) : (
                                'Not shown'
                              ),
                          },
                        ]
                      : []),
                    ...(preferences.includePhone
                      ? [
                          {
                            field: 'phone',
                            header: 'Phone',
                            cell: (row: (typeof visibleRows)[number]) => row.phone || 'Not shown',
                          },
                        ]
                      : []),
                    ...(preferences.includeLocation
                      ? [
                          {
                            field: 'location',
                            header: 'Location',
                            cell: (row: (typeof visibleRows)[number]) => (
                              <span className="la-result-ellipsis" title={row.location}>
                                {row.location || 'Not shown'}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    ...(preferences.includeAddress
                      ? [
                          {
                            field: 'address',
                            header: 'Address',
                            cell: (row: (typeof visibleRows)[number]) => (
                              <span className="la-result-ellipsis" title={row.address}>
                                {row.address || 'Not shown'}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    {
                      field: 'source',
                      header: 'Source',
                      cell: (row: (typeof visibleRows)[number]) => (
                        <span className="la-result-source">{row.source}</span>
                      ),
                    },
                  ]}
                  empty={
                    rows.length > 0 ? (
                      <EmptyState
                        title="No matching results"
                        description="No result matches this search. Clear the search box to see every result."
                      />
                    ) : (
                      <EmptyState
                        title={isActive ? 'Searching for businesses' : 'No results found'}
                        description={
                          isActive
                            ? 'Public result cards will appear here as they load.'
                            : 'Try another niche or location to find public business listings.'
                        }
                      />
                    )
                  }
                />
              </div>
            </>
          ) : (
            <p className="la-records-empty">
              All result fields are hidden. Enable at least one field in Profile preferences.
            </p>
          ))}
        {pipelineMode && (
          <section className="la-pipeline-queue">
            <div className="la-section-heading la-crawl-table-heading">
              <div>
                <h2>Website URL queue</h2>
                <p>
                  Business websites and links found on crawled pages enter the same saved queue.
                  Workers extract emails as URLs arrive.
                </p>
              </div>
              <span>
                Showing {visibleSitePages.length} of {sitePages.length} pages ·{' '}
                {CRAWL_QUEUE_VISIBLE_ROWS} row limit
              </span>
            </div>
            <div className="la-crawler-status-row">
              <div className="la-crawler-queue-activity" role="status" aria-live="polite">
                <span className="la-crawler-dot" />
                <span>
                  {phase === 'paused'
                    ? 'Pipeline paused'
                    : websiteCrawlFinished
                      ? 'Website crawl complete'
                      : siteCrawlActive.current
                        ? 'Searching and crawling websites...'
                        : 'Waiting for website crawl'}
                </span>
              </div>
              <div className="la-crawler-progress-summary" aria-label="Website crawl progress">
                <span>{sitePages.length} pages</span>
                <span>{uniqueSiteEmails} unique emails</span>
                <span>Processing time {siteElapsed}</span>
                <span>Results found {uniqueSiteEmails}</span>
                <span>Processed {processedSitePages}</span>
                <span>In queue {queuedSitePages}</span>
              </div>
            </div>
            <div
              className={`la-table-scroll la-pipeline-queue-table${visibleSitePages.length ? '' : ' la-pipeline-queue-table--empty'}`}
            >
              <Table
                data={visibleSitePages}
                loading={false}
                paginator={false}
                tableClassName="la-crawler-table"
                rowKey={(row) => sitePageKey(row.item)}
                isRowActive={(row) => ['fetching', 'ready', 'crawling'].includes(row.item.status)}
                columns={[
                  { field: 'index', header: '#', cell: (row) => row.index + 1 },
                  {
                    field: 'url',
                    header: 'Page URL',
                    cell: (row) => (
                      <span className="la-result-ellipsis" title={row.item.url}>
                        {row.item.url}
                      </span>
                    ),
                  },
                  { field: 'kind', header: 'Type', cell: (row) => row.item.kind },
                  {
                    field: 'status',
                    header: 'Status',
                    cell: (row) => (
                      <span
                        className={`la-crawler-queue-status la-crawler-queue-status--${row.item.status}`}
                        title={row.item.error ?? undefined}
                      >
                        {row.item.status}
                      </span>
                    ),
                  },
                  {
                    field: 'emails',
                    header: 'Emails found',
                    cell: (row) => (
                      <span
                        className="la-crawler-email-chip"
                        aria-label={`${row.item.emails.length} emails found`}
                      >
                        {row.item.emails.length}
                      </span>
                    ),
                  },
                  {
                    field: 'actions',
                    header: 'Actions',
                    cell: (row) => (
                      <button
                        type="button"
                        className="la-crawler-view-button"
                        title="View page emails"
                        aria-label={`View emails and details for ${row.item.url}`}
                        onClick={(event) => {
                          detailTriggerRef.current = event.currentTarget
                          setSelectedSitePageKey(sitePageKey(row.item))
                        }}
                      >
                        <MdOutlineVisibility aria-hidden="true" />
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          </section>
        )}
      </section>
      {selectedSitePage && (
        <div
          className="la-niche-panel-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSiteDetails()
          }}
        >
          <aside
            className="la-niche-panel la-crawler-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pipeline-page-detail-title"
          >
            <div className="la-niche-panel-heading">
              <div>
                <h2 id="pipeline-page-detail-title">Page emails</h2>
                <p>Addresses found while crawling this business website.</p>
              </div>
              <button
                ref={detailCloseRef}
                type="button"
                className="la-niche-panel-close"
                aria-label="Close page details"
                onClick={closeSiteDetails}
              >
                &times;
              </button>
            </div>
            <dl className="la-crawler-detail-meta">
              <div>
                <dt>Page URL</dt>
                <dd>
                  <a href={selectedSitePage.url} target="_blank" rel="noreferrer">
                    {selectedSitePage.url}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Page type</dt>
                <dd>{selectedSitePage.kind}</dd>
              </div>
              <div>
                <dt>Crawl status</dt>
                <dd>{selectedSitePage.status}</dd>
              </div>
              <div>
                <dt>Email source</dt>
                <dd>
                  {(initialRun?.preferences.crawlerEmailSource ??
                    preferences.crawlerEmailSource) === 'email-hunter'
                    ? 'Email Hunter-style HTML scan'
                    : 'LeadsGhr extraction'}
                </dd>
              </div>
              {selectedSitePage.error && (
                <div>
                  <dt>Detail</dt>
                  <dd>{selectedSitePage.error}</dd>
                </div>
              )}
            </dl>
            <div className="la-crawler-detail-emails-heading">
              <h3>Emails found</h3>
              <span className="la-crawler-email-chip">{selectedSitePage.emails.length}</span>
            </div>
            {selectedSitePage.emails.length ? (
              <ol className="la-crawler-detail-emails">
                {selectedSitePage.emails.map((email) => (
                  <li key={email}>
                    <span>{email}</span>
                    {selectedSitePage.kind === 'Contact page' &&
                      homepageEmails.has(email.toLowerCase()) && (
                        <span className="la-crawler-duplicate-chip">Also found on homepage</span>
                      )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="la-crawler-detail-empty">
                {selectedSitePage.status === 'crawled'
                  ? 'No emails found on this page.'
                  : 'No emails found yet.'}
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
