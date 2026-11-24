import {
  SCRAPER_FORMAT_VERSION,
  SCRAPER_PAGES_PER_SEARCH,
  SCRAPER_PAGE_PAUSE_MS,
  SCRAPER_SEARCH_GAP_MS,
  scraperPlacesUrl,
  scraperResultFile,
  type ScraperBusiness,
  type ScraperJob,
  type ScraperProgress,
  type ScraperResult,
} from '@leadsghr/schemas'
import { writeDataFile } from './data-folder'

/*
 * Runs a job's searches one at a time in a visible Chrome window (AGENTS.md, rule 5 exception): opens Google Search's business
 * list for the search, reads every business card, follows the next-page link (at most SCRAPER_PAGES_PER_SEARCH
 * pages), and saves results/<jobId>/<n>.json after every page. It pauses several seconds between pages and at least
 * SCRAPER_SEARCH_GAP_MS between searches. It does not hide that it is automated: when Google shows its check page,
 * it saves what it has and stops. Searches already finished are remembered, so a later run resumes after them.
 */

const CHALLENGE = /captcha|unusual traffic|verify you are human|not a robot|before you continue to google/i
const DONE_KEY = (jobId: string) => `scraper.done.${jobId}`
export const PROGRESS_KEY = 'scraper.progress'

export type Control = { action: 'run' | 'pause' | 'stop' }
export type Counts = { businesses: number; withWebsite: number; adsSkipped: number; perSearch: Record<number, number> }
export type EngineUpdate = { progress: ScraperProgress; counts: Counts; page: number }

type PageRead = {
  url: string
  text: string
  cards: (Omit<ScraperBusiness, 'page'> & { sponsored: boolean })[]
  first: string
  next: string
}

/** Runs inside the Google tab (chrome.scripting.executeScript): reads the business cards on the Places page. */
function readPlacesPage(): PageRead {
  const text = document.body?.innerText?.slice(0, 9000) ?? ''
  const cards: PageRead['cards'] = []
  for (const card of Array.from(document.querySelectorAll<HTMLElement>('div.VkpGBb'))) {
    const name = card.querySelector<HTMLElement>('.OSrXXb')?.innerText?.trim() ?? ''
    if (!name) continue
    const body = card.innerText || ''
    const link = Array.from(card.querySelectorAll<HTMLAnchorElement>('a')).find((anchor) =>
      /^website$/i.test((anchor.innerText || '').trim()),
    )
    const phone =
      body.match(/(?:\+1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4}/)?.[0] ?? ''
    const address =
      body.match(
        /\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)\b/i,
      )?.[0] ?? ''
    cards.push({ name, websiteLink: link?.href ?? '', phone, address, sponsored: /^\s*Sponsored/i.test(body) })
  }
  const next = document.querySelector<HTMLAnchorElement>('a#pnnext')?.href ?? ''
  return { url: location.href, text, cards, first: cards.map((card) => card.name).join('|'), next }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Waits up to `ms`, ending early when the user pauses or stops. */
async function pause(ms: number, control: Control) {
  const end = Date.now() + ms
  while (Date.now() < end && control.action === 'run') await sleep(Math.min(500, end - Date.now()))
}

function waitForTab(tabId: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, timeoutMs)
    function done() {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }
    function listener(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') done()
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

export async function finishedSearches(jobId: string): Promise<Set<number>> {
  const saved = (await chrome.storage.local.get(DONE_KEY(jobId)))[DONE_KEY(jobId)]
  return new Set(Array.isArray(saved) ? (saved as number[]) : [])
}

export async function runJob(
  job: ScraperJob,
  control: Control,
  onUpdate: (update: EngineUpdate) => void,
): Promise<ScraperProgress['state']> {
  const done = await finishedSearches(job.id)
  const counts: Counts = { businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} }
  let tabId: number | undefined
  let lastSearchAt = 0
  let page = 0
  const report = async (state: ScraperProgress['state'], current: number, message: string) => {
    const progress: ScraperProgress = {
      version: SCRAPER_FORMAT_VERSION,
      jobId: job.id,
      state,
      current,
      total: job.searches.length,
      message,
      updatedAt: new Date().toISOString(),
    }
    onUpdate({ progress, counts, page })
    await chrome.storage.local.set({ [PROGRESS_KEY]: { ...progress, counts } })
    await writeDataFile('progress.json', progress).catch(() => undefined)
  }
  try {
    for (const search of job.searches) {
      if (done.has(search.index)) continue
      if (control.action !== 'run')
        return await stopped(control, search.index)
      const since = Date.now() - lastSearchAt
      if (lastSearchAt && since < SCRAPER_SEARCH_GAP_MS) {
        await report('waiting', search.index, `Waiting before ${search.place}, to keep requests polite...`)
        await pause(SCRAPER_SEARCH_GAP_MS - since, control)
        if (control.action !== 'run') return await stopped(control, search.index)
      }
      lastSearchAt = Date.now()
      const result: ScraperResult = {
        version: SCRAPER_FORMAT_VERSION,
        jobId: job.id,
        index: search.index,
        place: search.place,
        query: search.query,
        complete: false,
        pages: 0,
        updatedAt: new Date().toISOString(),
        businesses: [],
      }
      const seen = new Set<string>()
      let url = scraperPlacesUrl(search.query)
      let previousFirst = ''
      for (page = 1; page <= SCRAPER_PAGES_PER_SEARCH; page++) {
        await report('running', search.index, `Reading ${search.place}, page ${page}...`)
        // The searches run in their own visible Chrome window (not a hidden tab), so you can watch what the
        // Scraper does; the Scraper page keeps running in its own window.
        if (tabId === undefined) {
          const window = await chrome.windows.create({ url, focused: false, type: 'normal', width: 1100, height: 900 })
          tabId = window?.tabs?.[0]?.id
        } else await chrome.tabs.update(tabId, { url })
        if (tabId === undefined) throw new Error('Chrome did not open a tab for the search.')
        await waitForTab(tabId)
        let read: PageRead | undefined
        for (let attempt = 0; attempt < 12; attempt++) {
          await sleep(attempt === 0 ? 1500 : 750)
          const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: readPlacesPage })
          read = injection?.result as PageRead | undefined
          if (!read) continue
          if (/\/sorry\//.test(read.url) || CHALLENGE.test(read.text)) {
            result.stoppedReason = 'Google showed its check page'
            result.updatedAt = new Date().toISOString()
            await writeDataFile(`results/${job.id}/${scraperResultFile(search.index)}`, result)
            await report(
              'blocked',
              search.index,
              `Google showed its check page during ${search.place}. Stopped so Google is not pushed further; resume later.`,
            )
            return 'blocked'
          }
          if (read.cards.length && read.first !== previousFirst) break
        }
        if (!read || !read.cards.length || read.first === previousFirst) break
        previousFirst = read.first
        for (const card of read.cards) {
          if (card.sponsored) {
            counts.adsSkipped++
            continue
          }
          const key = card.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!key || seen.has(key)) continue
          seen.add(key)
          result.businesses.push({ name: card.name, websiteLink: card.websiteLink, phone: card.phone, address: card.address, page })
          counts.businesses++
          if (card.websiteLink) counts.withWebsite++
        }
        counts.perSearch[search.index] = result.businesses.length
        result.pages = page
        result.updatedAt = new Date().toISOString()
        await writeDataFile(`results/${job.id}/${scraperResultFile(search.index)}`, result)
        if (!read.next) break
        url = read.next
        const { min, max } = SCRAPER_PAGE_PAUSE_MS
        await pause(min + Math.round(Math.random() * (max - min)), control)
        if (control.action !== 'run') return await stopped(control, search.index)
      }
      result.complete = true
      result.updatedAt = new Date().toISOString()
      await writeDataFile(`results/${job.id}/${scraperResultFile(search.index)}`, result)
      done.add(search.index)
      await chrome.storage.local.set({ [DONE_KEY(job.id)]: [...done] })
    }
    await report('finished', job.searches.length, `All ${job.searches.length} searches finished.`)
    return 'finished'
  } finally {
    if (tabId !== undefined) await chrome.tabs.remove(tabId).catch(() => undefined) // closes its window too
  }

  async function stopped(state: Control, current: number): Promise<ScraperProgress['state']> {
    const paused = state.action === 'pause'
    await report(
      paused ? 'paused' : 'stopped',
      current,
      paused ? 'Paused. Resume to continue from this search.' : 'Stopped. Start again to continue from this search.',
    )
    return paused ? 'paused' : 'stopped'
  }
}
