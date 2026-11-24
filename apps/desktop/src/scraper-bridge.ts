import { BrowserWindow, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, watch, type FSWatcher } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  createCrawlRunSchema,
  crawlRunIdSchema,
  SCRAPER_FORMAT_VERSION,
  SCRAPER_JOBS_FILE,
  SCRAPER_LEGACY_JOB_FILE,
  SCRAPER_LEGACY_PROGRESS_FILE,
  SCRAPER_MAX_JOBS,
  SCRAPER_REMOVED_FILE,
  scraperJobSchema,
  scraperProgressFile,
  scraperProgressSchema,
  scraperResultSchema,
  type CrawlRow,
  type CrawlRunDetail,
  type ScraperJob,
  type ScraperJobList,
  type ScraperJobSummary,
  type ScraperProgress,
  scraperJobTitle,
  searchTimingFrom,
  visibleScraperJobs,
} from '@leadsghr/schemas'
import type { createCrawlRunStore } from './crawl-runs'
import { lookUpWebsite } from './maps-scan'
import { leadsGhrExtensionsDirectory } from './paths'

/*
 * The desktop side of LeadsGhr Scraper (packages/schemas/src/scraper.ts describes the files). Send: New Search's
 * searches become a search run (provider "google") and a new job added to jobs.json in the Scraper's data folder
 * (the extension lists the saved jobs and the user picks which one to run). Sync: the Crawl Results
 * page asks every few seconds; new or updated results/<jobId>/<n>.json files are read, each Website link is resolved
 * to the business's own address (one request per link, cached), and the businesses are saved as rows of that run.
 */

const scraperFolder = () => join(leadsGhrExtensionsDirectory(), 'leadsghr-scraper')
const dataFolder = () => join(scraperFolder(), 'data')

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return null
  }
}

/** The row id of a business found by the Scraper (a Google Maps search link for its name and address or place). */
const businessMapsUrl = (name: string, address: string, place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address || place}`)}`

/** Write then rename, so the extension never reads a half-written file. */
async function writeJson(name: string, value: unknown) {
  const temporary = join(dataFolder(), `${name}.tmp`)
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8')
  await rename(temporary, join(dataFolder(), name))
}

/** The jobs the extension lists (jobs.json, an older job.json, minus the ones removed in the extension). */
async function savedJobs(): Promise<ScraperJob[]> {
  return visibleScraperJobs(
    await readJson(join(dataFolder(), SCRAPER_JOBS_FILE)),
    await readJson(join(dataFolder(), SCRAPER_LEGACY_JOB_FILE)),
    await readJson(join(dataFolder(), SCRAPER_REMOVED_FILE)),
  )
}

/** removed: the job is no longer in the Scraper's list (removed there), so its run stops updating.
 *  websitesPending: Website links not looked up yet (they are looked up a few at a time, see WEBSITE_LOOKUPS). */
export type ScraperSync = {
  progress: ScraperProgress | null
  run: CrawlRunDetail | null
  removed: boolean
  websitesPending: number
}

/*
 * Website links. Each Website button on Google's list is a google.com/goto redirect; the desktop app follows it to
 * find the business's own address. Asking Google for many in a row gets refused (it answers with its check page), so
 * lookups are paced: at most WEBSITE_LOOKUPS per sync, WEBSITE_GAP_MS apart, a pause of WEBSITE_BACKOFF_MS when
 * Google refuses, and a refused link is tried again later instead of being saved as "no website".
 */
const WEBSITE_LOOKUPS = 12
const WEBSITE_GAP_MS = 1200
const WEBSITE_BACKOFF_MS = 90_000
const WEBSITE_RETRY_MS = 30_000
/** How often saved jobs are synced in the background, so results and websites arrive without the page open. */
const BACKGROUND_SYNC_MS = 20_000
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function registerScraperIpc(store: ReturnType<typeof createCrawlRunStore>) {
  const owner = (event: Electron.IpcMainInvokeEvent) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
  }
  // result file path -> the updatedAt already imported, so a sync only reads what changed
  const imported = new Map<string, string>()
  // Website link -> the business's own address ('' when it has none); links Google refused are not in here yet.
  const websites = new Map<string, string>()
  const retryAt = new Map<string, number>()
  let lookupsPausedUntil = 0
  const syncing = new Map<string, Promise<ScraperSync>>()

  /** Looks up one Website link if the pacing allows; returns true when its address is now known. */
  async function lookUp(link: string, budget: { left: number }): Promise<boolean> {
    if (websites.has(link)) return true
    const now = Date.now()
    if (budget.left <= 0 || now < lookupsPausedUntil || (retryAt.get(link) ?? 0) > now) return false
    budget.left--
    const found = await lookUpWebsite(link, new AbortController().signal)
    await sleep(WEBSITE_GAP_MS)
    if ('website' in found) {
      websites.set(link, found.website)
      retryAt.delete(link)
      return true
    }
    retryAt.set(link, Date.now() + WEBSITE_RETRY_MS)
    if (found.blocked) {
      lookupsPausedUntil = Date.now() + WEBSITE_BACKOFF_MS
      budget.left = 0
    }
    return false
  }

  ipcMain.handle('leadsghr:scraper:send-job', async (event, input: unknown) => {
    owner(event)
    if (!existsSync(scraperFolder()))
      throw new Error(
        'LeadsGhr Scraper is not installed yet. Build it with "pnpm build:scraper-extension", then in Chrome choose Load unpacked and select C:\\LeadsGhr\\extensions\\leadsghr-scraper.',
      )
    const run = createCrawlRunSchema.parse(input)
    const created = store.create({ ...run, provider: 'google', kind: 'search' })
    if (!created) throw new Error('Could not create the search run.')
    const job: ScraperJob = scraperJobSchema.parse({
      version: SCRAPER_FORMAT_VERSION,
      id: randomUUID(),
      runId: created.id,
      createdAt: new Date().toISOString(),
      niches: run.criteria.selectedNiches,
      states: run.criteria.selectedStates,
      searches: run.searches.map((search, index) => ({ index, ...search })),
      // The pauses chosen in Preferences → Search → Search timing, kept with the job.
      pacing: searchTimingFrom(run.preferences),
    })
    await mkdir(dataFolder(), { recursive: true })
    // Add the job to the saved list (newest first). An older single job.json moves into the list.
    const list: ScraperJobList = {
      version: SCRAPER_FORMAT_VERSION,
      jobs: [job, ...(await savedJobs())].slice(0, SCRAPER_MAX_JOBS),
    }
    await writeJson(SCRAPER_JOBS_FILE, list)
    await rm(join(dataFolder(), SCRAPER_LEGACY_JOB_FILE), { force: true })
    return { jobId: job.id, runId: created.id }
  })

  async function readProgress(jobId: string): Promise<ScraperProgress | null> {
    // The job's own status file; earlier versions wrote a single progress.json.
    let file = scraperProgressSchema.safeParse(await readJson(join(dataFolder(), scraperProgressFile(jobId))))
    if (!file.success) file = scraperProgressSchema.safeParse(await readJson(join(dataFolder(), SCRAPER_LEGACY_PROGRESS_FILE)))
    return file.success && file.data.jobId === jobId ? file.data : null
  }

  async function resultFiles(jobId: string): Promise<string[]> {
    const folder = join(dataFolder(), 'results', jobId)
    return existsSync(folder) ? (await readdir(folder)).filter((name) => name.endsWith('.json')) : []
  }

  /** A saved job's numbers for the LeadsGhr Scraper page (reads files and the run; never looks anything up). */
  async function summarize(job: ScraperJob): Promise<ScraperJobSummary | null> {
    const run = store.get(job.runId)
    if (!run) return null
    const progress = await readProgress(job.id)
    const rows = new Map(run.rows.map((row) => [row.id, row]))
    let searchesDone = 0
    const links = new Set<string>()
    let websitesPending = 0
    let websitesFound = 0
    for (const name of await resultFiles(job.id)) {
      const result = scraperResultSchema.safeParse(await readJson(join(dataFolder(), 'results', job.id, name)))
      if (!result.success || result.data.jobId !== job.id) continue
      if (result.data.complete) searchesDone++
      for (const business of result.data.businesses) {
        if (!business.websiteLink || links.has(business.websiteLink)) continue
        links.add(business.websiteLink)
        const saved =
          rows.get(businessMapsUrl(business.name, business.address, result.data.place))?.website ||
          business.website ||
          websites.get(business.websiteLink)
        // Counted per Website link, so a business saved twice (a location read again after Resume) counts once.
        if (saved) websitesFound++
        else if (!websites.has(business.websiteLink)) websitesPending++
      }
    }
    return {
      jobId: job.id,
      runId: job.runId,
      title: scraperJobTitle(job),
      createdAt: job.createdAt,
      searches: job.searches.length,
      searchesDone,
      state: progress?.state ?? 'not-started',
      message: progress?.message ?? '',
      businesses: run.rows.length,
      websiteLinks: links.size,
      websitesFound,
      websitesPending,
    }
  }

  ipcMain.handle('leadsghr:scraper:list-jobs', async (event) => {
    owner(event)
    const summaries = await Promise.all((await savedJobs()).map((job) => summarize(job)))
    return summaries.filter((item): item is ScraperJobSummary => item !== null)
  })

  /** withRun: return the run's rows (the page needs them; the background sync does not). */
  async function sync(jobId: string, withRun = true): Promise<ScraperSync> {
    const found = (await savedJobs()).find((item) => item.id === jobId)
    const saved = found ? store.get(found.runId) : null
    if (!found || !saved) return { progress: null, run: null, removed: true, websitesPending: 0 }
    const job = { data: found }
    // Websites already saved (for example before a restart) are not looked up again.
    const savedRows = new Map(saved.rows.map((row) => [row.id, row]))
    const progress = await readProgress(jobId)
    const files = await resultFiles(jobId)
    const folder = join(dataFolder(), 'results', jobId)
    let complete = 0
    let websitesPending = 0
    const budget = { left: WEBSITE_LOOKUPS }
    for (const name of files.sort()) {
      const path = join(folder, name)
      const result = scraperResultSchema.safeParse(await readJson(path))
      if (!result.success || result.data.jobId !== jobId) continue
      if (result.data.complete) complete++
      // A file already imported is read again only for its Website links still being looked up.
      const changed = imported.get(path) !== result.data.updatedAt
      const search = job.data.searches.find((item) => item.index === result.data.index)
      for (const business of result.data.businesses) {
        const link = business.websiteLink
        const mapsUrl = businessMapsUrl(business.name, business.address, result.data.place)
        const savedWebsite = savedRows.get(mapsUrl)?.website
        // The Scraper looks websites up itself while it reads the list; use the address when it found one (an empty
        // answer from it is looked up here, since a Website button always points somewhere).
        if (link && business.website && !websites.has(link)) websites.set(link, business.website)
        if (link && savedWebsite && !websites.has(link)) websites.set(link, savedWebsite)
        const known = !link || websites.has(link)
        if (!changed && known) continue
        const resolvedNow = !known && (await lookUp(link, budget))
        if (link && !websites.has(link)) websitesPending++
        if (!changed && !resolvedNow) continue
        const website = link ? (websites.get(link) ?? '') : ''
        const row: CrawlRow = {
          id: mapsUrl,
          niche: search?.niche,
          name: business.name,
          website,
          phone: business.phone,
          address: business.address,
          location: result.data.place,
          mapsUrl,
          source: 'Google Search',
          emails: [],
          emailsScanned: false,
        }
        store.saveRow({ id: job.data.runId, row })
      }
      imported.set(path, result.data.updatedAt)
    }
    const finished = progress?.state === 'finished'
    store.progress({
      id: job.data.runId,
      nextQueryIndex: Math.min(complete, job.data.searches.length),
      status: finished ? 'completed' : progress?.state === 'blocked' || progress?.state === 'stopped' ? 'stopped' : 'running',
      error: progress?.state === 'blocked' ? progress.message : undefined,
    })
    return { progress, run: withRun ? store.get(job.data.runId) : null, removed: false, websitesPending }
  }

  // One sync per job at a time; a request during a sync waits for that one.
  const syncOnce = (jobId: string, withRun = true) => {
    let task = syncing.get(jobId)
    if (!task) {
      task = sync(jobId, withRun).finally(() => syncing.delete(jobId))
      syncing.set(jobId, task)
    }
    return task
  }

  ipcMain.handle('leadsghr:scraper:sync', async (event, input: unknown) => {
    owner(event)
    return syncOnce(crawlRunIdSchema.parse(input))
  })

  // Instant import: the data folder is watched, so a result the Scraper saves is imported within a moment and the
  // open pages are told to refresh (leadsghr:scraper:changed). The timer below stays as a fallback.
  let watcher: FSWatcher | undefined
  const changedJobs = new Set<string>()
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  const flush = async () => {
    const ids = [...changedJobs]
    changedJobs.clear()
    const jobs = await savedJobs()
    const targets = ids.includes('*') ? jobs.map((job) => job.id) : ids.filter((id) => jobs.some((job) => job.id === id))
    for (const id of targets) await syncOnce(id, false).catch(() => undefined)
    for (const window of BrowserWindow.getAllWindows())
      if (!window.isDestroyed()) window.webContents.send('leadsghr:scraper:changed', targets)
  }
  const startWatching = () => {
    if (watcher || !existsSync(dataFolder())) return
    try {
      watcher = watch(dataFolder(), { recursive: true }, (_event, file) => {
        const name = String(file ?? '').replace(/\\/g, '/')
        const job = /^(?:results|progress)\/([0-9a-f-]{8,80})/i.exec(name)?.[1]
        if (job) changedJobs.add(job)
        else if (/^jobs/i.test(name)) changedJobs.add('*')
        else return
        clearTimeout(flushTimer)
        flushTimer = setTimeout(() => void flush(), 300)
      })
      watcher.on('error', () => {
        watcher?.close()
        watcher = undefined
      })
    } catch {
      watcher = undefined
    }
  }
  startWatching()

  // Background sync of every saved job, so new results and the remaining Website lookups are saved even when
  // Scraper Results is not open (for example jobs sent earlier, or after a restart). Jobs run one after another.
  let background = false
  setInterval(() => {
    startWatching()
    if (background || !existsSync(dataFolder())) return
    background = true
    void (async () => {
      for (const job of await savedJobs()) await syncOnce(job.id, false).catch(() => undefined)
    })().finally(() => {
      background = false
    })
  }, BACKGROUND_SYNC_MS)

  ipcMain.handle('leadsghr:scraper:open-folder', async (event) => {
    owner(event)
    await mkdir(dataFolder(), { recursive: true })
    await shell.openPath(dataFolder())
  })
}
