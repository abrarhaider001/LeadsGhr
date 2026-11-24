import { BrowserWindow, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  createCrawlRunSchema,
  crawlRunIdSchema,
  SCRAPER_FORMAT_VERSION,
  scraperJobSchema,
  scraperProgressSchema,
  scraperResultSchema,
  type CrawlRow,
  type CrawlRunDetail,
  type ScraperJob,
  type ScraperProgress,
} from '@leadsghr/schemas'
import type { createCrawlRunStore } from './crawl-runs'
import { resolveWebsite } from './maps-scan'
import { leadsGhrExtensionsDirectory } from './paths'

/*
 * The desktop side of LeadsGhr Scraper (packages/schemas/src/scraper.ts describes the files). Send: New Search's
 * searches become a search run (provider "google") and job.json in the Scraper's data folder. Sync: the Crawl Results
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

export type ScraperSync = { progress: ScraperProgress | null; run: CrawlRunDetail | null; replaced: boolean }

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
    // Write then rename, so the extension never reads a half-written job.
    const temporary = join(dataFolder(), 'job.json.tmp')
    await writeFile(temporary, JSON.stringify(job, null, 2), 'utf8')
    await rename(temporary, join(dataFolder(), 'job.json'))
    return { jobId: job.id, runId: created.id }
  })

  async function sync(jobId: string): Promise<ScraperSync> {
    const job = scraperJobSchema.safeParse(await readJson(join(dataFolder(), 'job.json')))
    if (!job.success || job.data.id !== jobId) return { progress: null, run: null, replaced: true }
    const progressFile = scraperProgressSchema.safeParse(await readJson(join(dataFolder(), 'progress.json')))
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
    return { progress, run: store.get(job.data.runId), replaced: false }
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
