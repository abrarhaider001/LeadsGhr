import { z } from 'zod'
import { searchTimingSchema } from './search-timing'

/*
 * Files shared by the LeadsGhr desktop app and the LeadsGhr Scraper Chrome extension, in the Scraper's data folder
 * (C:\LeadsGhr\extensions\leadsghr-scraper\data). They talk only through these files:
 *
 *   jobs.json                   written by the desktop app: the saved jobs, newest first (each from New Search's
 *                               niche, state, and places); every Send to LeadsGhr Scraper adds one
 *   jobs-removed.json           written by the extension: ids of jobs the user removed from the list
 *   progress/<jobId>.json       written by the extension: which search of that job is running, and why it stopped
 *   results/<jobId>/<n>.json    written by the extension after every page: the businesses found for search n
 *
 * Older versions kept a single job in job.json and its status in progress.json; both are still read.
 *
 * The desktop app reads the results, turns Google's Website links into the businesses' own addresses, and saves the
 * rows into a normal search run, so they appear in Crawl Results and export like any other run.
 */

export const SCRAPER_FORMAT_VERSION = 1
/* Pages read per search and the pauses that keep requests polite (AGENTS.md, rule 5) are the job's `pacing`
 * (packages/schemas/src/search-timing.ts), chosen in Preferences → Search → Search timing. */

export const scraperSearchSchema = z.object({
  index: z.number().int().min(0),
  niche: z.string().min(1).max(120),
  term: z.string().min(1).max(120),
  place: z.string().min(1).max(160),
  query: z.string().min(2).max(260),
})
export type ScraperSearch = z.infer<typeof scraperSearchSchema>

export const scraperJobSchema = z.object({
  version: z.literal(SCRAPER_FORMAT_VERSION),
  id: z.string().min(8).max(80),
  /** The desktop app's search run that the results are saved into. */
  runId: z.string().min(8).max(80),
  createdAt: z.string(),
  niches: z.array(z.string().max(120)).max(500),
  states: z.array(z.string().max(80)).max(60),
  searches: z.array(scraperSearchSchema).min(1).max(5000),
  /** The pauses chosen in Preferences → Search → Search timing when the job was sent. Older jobs have none and use the
   *  Normal preset. */
  pacing: searchTimingSchema.optional(),
})
export type ScraperJob = z.infer<typeof scraperJobSchema>

/** Most saved jobs kept in jobs.json; the oldest are dropped when a new job would go past it. */
export const SCRAPER_MAX_JOBS = 50
export const SCRAPER_JOBS_FILE = 'jobs.json'
export const SCRAPER_REMOVED_FILE = 'jobs-removed.json'
/** The single-job files written by earlier versions. */
export const SCRAPER_LEGACY_JOB_FILE = 'job.json'
export const SCRAPER_LEGACY_PROGRESS_FILE = 'progress.json'

export const scraperJobListSchema = z.object({
  version: z.literal(SCRAPER_FORMAT_VERSION),
  jobs: z.array(scraperJobSchema).max(SCRAPER_MAX_JOBS),
})
export type ScraperJobList = z.infer<typeof scraperJobListSchema>

export const scraperRemovedJobsSchema = z.object({
  version: z.literal(SCRAPER_FORMAT_VERSION),
  ids: z.array(z.string().max(80)).max(5000),
})

/**
 * The jobs to show: those in jobs.json plus an older job.json that is not in the list yet, without the removed ones,
 * newest first. Each argument is the raw file content (or null when the file is missing); invalid files count as empty.
 */
export function visibleScraperJobs(list: unknown, legacy: unknown, removed: unknown): ScraperJob[] {
  const parsedList = scraperJobListSchema.safeParse(list)
  const jobs = parsedList.success ? [...parsedList.data.jobs] : []
  const parsedLegacy = scraperJobSchema.safeParse(legacy)
  if (parsedLegacy.success && !jobs.some((job) => job.id === parsedLegacy.data.id)) jobs.push(parsedLegacy.data)
  const parsedRemoved = scraperRemovedJobsSchema.safeParse(removed)
  const hidden = new Set(parsedRemoved.success ? parsedRemoved.data.ids : [])
  return jobs
    .filter((job) => !hidden.has(job.id))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/** A short name for a job, as listed in the Scraper: "General Contractors · Florida · 12 locations". */
export function scraperJobTitle(job: ScraperJob): string {
  const count = job.searches.length
  const niches = job.niches.length > 2 ? `${job.niches.slice(0, 2).join(', ')} +${job.niches.length - 2}` : job.niches.join(', ')
  const states = job.states.length > 2 ? `${job.states.slice(0, 2).join(', ')} +${job.states.length - 2}` : job.states.join(', ')
  return [niches, states, `${count} ${count === 1 ? 'location' : 'locations'}`].filter(Boolean).join(' · ')
}

export const scraperBusinessSchema = z.object({
  name: z.string().min(1).max(500),
  /** The Website button's link as shown by Google (usually a google.com/goto redirect); resolved by the desktop app. */
  websiteLink: z.string().max(3000),
  /** The business's own address, found by the Scraper from websiteLink while it reads the list ('' when the link
   *  leads to no public website). Missing when the Scraper could not look it up; the desktop app then does. */
  website: z.string().max(3000).optional(),
  phone: z.string().max(200),
  address: z.string().max(1000),
  page: z.number().int().min(1).max(50),
})
export type ScraperBusiness = z.infer<typeof scraperBusinessSchema>

export const scraperResultSchema = z.object({
  version: z.literal(SCRAPER_FORMAT_VERSION),
  jobId: z.string(),
  index: z.number().int().min(0),
  place: z.string(),
  query: z.string(),
  /** False while the search is still being read (the file is rewritten after every page). */
  complete: z.boolean(),
  pages: z.number().int().min(0),
  stoppedReason: z.string().max(500).optional(),
  updatedAt: z.string(),
  businesses: z.array(scraperBusinessSchema).max(1000),
})
export type ScraperResult = z.infer<typeof scraperResultSchema>

export const scraperProgressSchema = z.object({
  version: z.literal(SCRAPER_FORMAT_VERSION),
  jobId: z.string(),
  state: z.enum(['running', 'waiting', 'paused', 'stopped', 'blocked', 'finished']),
  /** Index of the search being read or next to read. */
  current: z.number().int().min(0),
  total: z.number().int().min(0),
  message: z.string().max(500),
  updatedAt: z.string(),
})
export type ScraperProgress = z.infer<typeof scraperProgressSchema>

/** One saved job as listed on the desktop app's LeadsGhr Scraper page. */
export type ScraperJobSummary = {
  jobId: string
  runId: string
  title: string
  createdAt: string
  searches: number
  searchesDone: number
  /** The Scraper's last status for the job, or `not-started`. */
  state: ScraperProgress['state'] | 'not-started'
  message: string
  /** Businesses saved in the desktop run. */
  businesses: number
  /** Businesses whose card had a Website button, those whose address is saved, and those still being looked up. */
  websiteLinks: number
  websitesFound: number
  websitesPending: number
}

/** The Google Search business list (what "More businesses" opens) for one search. */
export const scraperPlacesUrl = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=local&hl=en`

/** A job's status file inside the data folder. */
export const scraperProgressFile = (jobId: string) => `progress/${jobId}.json`

/** File name of search n's results inside results/<jobId>/. */
export const scraperResultFile = (index: number) => `${String(index).padStart(4, '0')}.json`
