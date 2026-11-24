import { BrowserWindow, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
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
  type ScraperProgress,
  visibleScraperJobs,
} from '@leadsghr/schemas'
import type { createCrawlRunStore } from './crawl-runs'
import { resolveWebsite } from './maps-scan'
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

/** removed: the job is no longer in the Scraper's list (removed there), so its run stops updating. */
export type ScraperSync = { progress: ScraperProgress | null; run: CrawlRunDetail | null; removed: boolean }

export function registerScraperIpc(store: ReturnType<typeof createCrawlRunStore>) {
  const owner = (event: Electron.IpcMainInvokeEvent) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
  }
  // result file path -> the updatedAt already imported, so a sync only reads what changed
  const imported = new Map<string, string>()
  const websites = new Map<string, string>()
  const syncing = new Map<string, Promise<ScraperSync>>()

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

  async function sync(jobId: string): Promise<ScraperSync> {
    const found = (await savedJobs()).find((item) => item.id === jobId)
    if (!found) return { progress: null, run: null, removed: true }
    const job = { data: found }
    // The job's own status file; earlier versions wrote a single progress.json.
    let progressFile = scraperProgressSchema.safeParse(await readJson(join(dataFolder(), scraperProgressFile(jobId))))
    if (!progressFile.success)
      progressFile = scraperProgressSchema.safeParse(await readJson(join(dataFolder(), SCRAPER_LEGACY_PROGRESS_FILE)))
    const progress = progressFile.success && progressFile.data.jobId === jobId ? progressFile.data : null
    const folder = join(dataFolder(), 'results', jobId)
    const files = existsSync(folder) ? (await readdir(folder)).filter((name) => name.endsWith('.json')) : []
    const never = new AbortController().signal
    let complete = 0
    for (const name of files.sort()) {
      const path = join(folder, name)
      const result = scraperResultSchema.safeParse(await readJson(path))
      if (!result.success || result.data.jobId !== jobId) continue
      if (result.data.complete) complete++
      if (imported.get(path) === result.data.updatedAt) continue
      const search = job.data.searches.find((item) => item.index === result.data.index)
      for (const business of result.data.businesses) {
        let website = ''
        if (business.websiteLink) {
          if (!websites.has(business.websiteLink))
            websites.set(business.websiteLink, await resolveWebsite(business.websiteLink, never))
          website = websites.get(business.websiteLink) ?? ''
        }
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.name} ${business.address || result.data.place}`)}`
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
    return { progress, run: store.get(job.data.runId), removed: false }
  }

  ipcMain.handle('leadsghr:scraper:sync', async (event, input: unknown) => {
    owner(event)
    const jobId = crawlRunIdSchema.parse(input)
    // One sync per job at a time; a request during a sync waits for that one.
    let task = syncing.get(jobId)
    if (!task) {
      task = sync(jobId).finally(() => syncing.delete(jobId))
      syncing.set(jobId, task)
    }
    return task
  })

  ipcMain.handle('leadsghr:scraper:open-folder', async (event) => {
    owner(event)
    await mkdir(dataFolder(), { recursive: true })
    await shell.openPath(dataFolder())
  })
}
