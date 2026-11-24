import { z } from 'zod'

/*
 * Files shared by the LeadsGhr desktop app and the LeadsGhr Scraper Chrome extension, in the Scraper's data folder
 * (C:\LeadsGhr\extensions\leadsghr-scraper\data). They talk only through these files:
 *
 *   job.json                    written by the desktop app: the searches to run (from New Search's niche, state, places)
 *   progress.json               written by the extension: which search is running, and why it stopped
 *   results/<jobId>/<n>.json    written by the extension after every page: the businesses found for search n
 *
 * The desktop app reads the results, turns Google's Website links into the businesses' own addresses, and saves the
 * rows into a normal search run, so they appear in Crawl Results and export like any other run.
 */

export const SCRAPER_FORMAT_VERSION = 1
/** Pages read per search, and the pauses that keep requests polite (AGENTS.md, rule 5). */
export const SCRAPER_PAGES_PER_SEARCH = 5
export const SCRAPER_PAGE_PAUSE_MS = { min: 4000, max: 7000 }
export const SCRAPER_SEARCH_GAP_MS = 45_000

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
})
export type ScraperJob = z.infer<typeof scraperJobSchema>

export const scraperBusinessSchema = z.object({
  name: z.string().min(1).max(500),
  /** The Website button's link as shown by Google (usually a google.com/goto redirect); resolved by the desktop app. */
  websiteLink: z.string().max(3000),
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

/** The Google Search business list (what "More businesses" opens) for one search. */
export const scraperPlacesUrl = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=local&hl=en`

/** File name of search n's results inside results/<jobId>/. */
export const scraperResultFile = (index: number) => `${String(index).padStart(4, '0')}.json`
