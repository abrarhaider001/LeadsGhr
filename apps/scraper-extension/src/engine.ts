import {
  SCRAPER_FORMAT_VERSION,
  clampSearchTiming,
  pagePauseMs,
  SEARCH_TIMING_PRESETS,
  scraperPlacesUrl,
  scraperProgressFile,
  scraperResultFile,
  type ScraperBusiness,
  type ScraperJob,
  type ScraperProgress,
  type ScraperResult,
} from '@leadsghr/schemas'
import { writeDataFile } from './data-folder'
import { DONE_KEY, JOB_PROGRESS_KEY, PROGRESS_KEY, readJobProgress } from './state'

/*
 * Runs a job's searches one at a time (AGENTS.md, rule 5 exception). Each search opens in a new tab in the settings
 * page's window: Google Search's business list for the search, read card by card. The list is scrolled to the bottom
 * (and "More places" pressed when Google shows it) until no new businesses appear, then the next-page arrow is
 * followed, up to the job's pages per location. When the search is finished its tab closes and the next search gets
 * a new tab. results/<jobId>/<n>.json is saved after every step. Pauses keep requests polite (several seconds between
 * pages, a pause between searches, and a longer break every few searches; all from the job's pacing, chosen in
 * Preferences → Search → Search timing). It does not hide that it is automated: at Google's check
 * page it saves what it has and stops. Finished searches are remembered, so a later run resumes after them.
 */

const CHALLENGE = /captcha|unusual traffic|verify you are human|not a robot|before you continue to google/i
/** The most businesses kept per search. */
const MAX_BUSINESSES = 300

export type Control = { action: 'run' | 'pause' | 'stop' }
export type Counts = {
  businesses: number
  withWebsite: number
  adsSkipped: number
  perSearch: Record<number, number>
  /** Businesses with a website per search, so a search read again after Resume is not counted twice. */
  websitesPerSearch?: Record<number, number>
}
export type EngineUpdate = { progress: ScraperProgress; counts: Counts; page: number; startedAt: number }

type Card = Omit<ScraperBusiness, 'page'> & { sponsored: boolean }
type PageRead = { url: string; text: string; cards: Card[]; next: string }

/**
 * Runs inside the Google tab: reads every business card on the Places page. Google shows two layouts: the compact
 * list (div.VkpGBb cards, name in .OSrXXb) and the larger cards with photos and Directions/Website buttons. The
 * second is read by its headings: each business name is a heading, and its card is the largest box around that
 * heading that holds no other business heading.
 */
function readPlacesPage(): PageRead {
  const text = document.body?.innerText?.slice(0, 9000) ?? ''
  const PHONE = /(?:\+1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4}/
  const ADDRESS = /\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Hwy|Highway)\b/i
  const cards: Card[] = []
  const describe = (card: HTMLElement, name: string) => {
    const body = card.innerText || ''
    const link = Array.from(card.querySelectorAll<HTMLAnchorElement>('a')).find(
      (anchor) =>
        /^website$/i.test((anchor.innerText || '').trim()) ||
        /\bwebsite\b/i.test(anchor.getAttribute('aria-label') || ''),
    )
    cards.push({
      name,
      websiteLink: link?.href ?? '',
      phone: body.match(PHONE)?.[0] ?? '',
      address: body.match(ADDRESS)?.[0] ?? '',
      sponsored: /(^|\n)\s*Sponsored\b/i.test(body),
    })
  }
  const compact = Array.from(document.querySelectorAll<HTMLElement>('div.VkpGBb'))
  if (compact.length) {
    for (const card of compact) {
      const name = card.querySelector<HTMLElement>('.OSrXXb')?.innerText?.trim() ?? ''
      if (name) describe(card, name)
    }
  } else {
    const root = document.querySelector<HTMLElement>('#search') ?? document.querySelector<HTMLElement>('[role="main"]') ?? document.body
    const isBusinessHeading = (element: Element) => {
      const name = (element as HTMLElement).innerText?.trim() ?? ''
      return name.length > 1 && name.length < 120 && !/^["“]|^Provides:|^Sponsored$/i.test(name)
    }
    const headings = Array.from(root.querySelectorAll<HTMLElement>('[role="heading"]')).filter(isBusinessHeading)
    const seen = new Set<HTMLElement>()
    for (const heading of headings) {
      let card: HTMLElement = heading
      while (
        card.parentElement &&
        card.parentElement !== root &&
        Array.from(card.parentElement.querySelectorAll('[role="heading"]')).filter(isBusinessHeading).length === 1
      )
        card = card.parentElement
      if (seen.has(card)) continue
      seen.add(card)
      const body = card.innerText || ''
      // A business card shows a rating, category, opening hours, phone, or Directions/Website buttons.
      if (!/Directions|Website|\d\.\d\s*★|\(\d+\)|Open|Closed|·/.test(body) && !PHONE.test(body)) continue
      describe(card, heading.innerText.trim())
    }
  }
  const next = document.querySelector<HTMLAnchorElement>('a#pnnext')?.href ?? ''
  return { url: location.href, text, cards, next }
}

/** Runs inside the Google tab: scrolls the page (and any scrolling list) to the bottom and presses "More places"
 *  or a similar button when Google shows one. Returns true when it pressed such a button. */
function scrollForMore(): boolean {
  window.scrollTo(0, document.documentElement.scrollHeight)
  for (const element of Array.from(document.querySelectorAll<HTMLElement>('div, section'))) {
    if (element.scrollHeight > element.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(element).overflowY))
      element.scrollTop = element.scrollHeight
  }
  const more = Array.from(document.querySelectorAll<HTMLElement>('a, button, [role="button"]')).find(
    (element) =>
      element.offsetParent !== null &&
      /^(more places|more businesses|more results|show more)$/i.test((element.innerText || '').trim()),
  )
  if (more) {
    more.click()
    return true
  }
  return false
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

async function inject<T>(tabId: number, func: () => T): Promise<T | undefined> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func })
  return injection?.result as T | undefined
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
  // Continue the counts of an earlier run of this job (after Resume), so the totals stay right.
  const earlier = await readJobProgress(job.id)
  const counts: Counts =
    earlier?.counts
      ? { ...earlier.counts, perSearch: { ...earlier.counts.perSearch }, websitesPerSearch: { ...earlier.counts.websitesPerSearch } }
      : { businesses: 0, withWebsite: 0, adsSkipped: 0, perSearch: {} }
  const startedAt = Date.now()
  const scraperTab = await chrome.tabs.getCurrent()
  let tabId: number | undefined
  let lastSearchAt = 0
  // The job's pauses (Preferences → Search → Search timing); jobs sent before that setting existed use Normal.
  const timing = clampSearchTiming(job.pacing ?? SEARCH_TIMING_PRESETS.normal)
  let searchedThisRun = 0
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
    onUpdate({ progress, counts, page, startedAt })
    const stored = { ...progress, counts, startedAt, page }
    await chrome.storage.local.set({ [PROGRESS_KEY]: stored, [JOB_PROGRESS_KEY(job.id)]: stored })
    await writeDataFile(scraperProgressFile(job.id), progress).catch(() => undefined)
  }
  const closeSearchTab = async () => {
    if (tabId !== undefined) await chrome.tabs.remove(tabId).catch(() => undefined)
    tabId = undefined
  }
  let currentIndex = 0
  try {
    for (const search of job.searches) {
      currentIndex = search.index
      if (done.has(search.index)) continue
      if (control.action !== 'run') return await stopped(control, search.index)
      // A longer break every few locations, then the usual pause between locations.
      if (timing.breakEvery && searchedThisRun && searchedThisRun % timing.breakEvery === 0) {
        await report(
          'waiting',
          search.index,
          `Taking a ${timing.breakMinutes}-minute break after ${searchedThisRun} locations, to keep requests polite...`,
        )
        await pause(timing.breakMinutes * 60_000, control)
        if (control.action !== 'run') return await stopped(control, search.index)
      }
      const gap = timing.locationPauseSec * 1000
      const since = Date.now() - lastSearchAt
      if (lastSearchAt && since < gap) {
        await report('waiting', search.index, `Waiting before ${search.place}, to keep requests polite...`)
        await pause(gap - since, control)
        if (control.action !== 'run') return await stopped(control, search.index)
      }
      lastSearchAt = Date.now()
      searchedThisRun++
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
      // A search that was cut short earlier starts again from its first page: drop its earlier count.
      const earlierCount = counts.perSearch[search.index] ?? 0
      counts.businesses = Math.max(0, counts.businesses - earlierCount)
      counts.perSearch[search.index] = 0
      counts.websitesPerSearch ??= {}
      counts.withWebsite = Math.max(0, counts.withWebsite - (counts.websitesPerSearch[search.index] ?? 0))
      counts.websitesPerSearch[search.index] = 0
      const seen = new Set<string>()
      // Saves the whole result so far. A failed save does not stop the search: the next save rewrites the complete
      // file anyway. Only the last save of a location must succeed (otherwise the run stops with the reason).
      const save = async (final = false) => {
        result.updatedAt = new Date().toISOString()
        try {
          await writeDataFile(`results/${job.id}/${scraperResultFile(search.index)}`, result)
        } catch (failure) {
          if (final) throw failure
        }
      }
      // Adds the cards not seen yet; returns how many were new.
      const take = (cards: Card[]) => {
        let added = 0
        for (const card of cards) {
          if (card.sponsored) {
            const adKey = `ad:${card.name}`
            if (!seen.has(adKey)) {
              seen.add(adKey)
              counts.adsSkipped++
            }
            continue
          }
          const key = card.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!key || seen.has(key) || result.businesses.length >= MAX_BUSINESSES) continue
          seen.add(key)
          result.businesses.push({ name: card.name, websiteLink: card.websiteLink, phone: card.phone, address: card.address, page })
          counts.businesses++
          if (card.websiteLink) {
            counts.withWebsite++
            counts.websitesPerSearch![search.index] = (counts.websitesPerSearch![search.index] ?? 0) + 1
          }
          added++
        }
        counts.perSearch[search.index] = result.businesses.length
        return added
      }

      // A new tab in the Scraper's own window for this search.
      await closeSearchTab()
      const created = await chrome.tabs.create({
        url: scraperPlacesUrl(search.query),
        windowId: scraperTab?.windowId,
        active: true,
      })
      tabId = created.id
      if (tabId === undefined) throw new Error('Chrome did not open a tab for the search.')
      for (page = 1; page <= timing.pagesPerLocation; page++) {
        await report('running', search.index, `Reading ${search.place}, page ${page}...`)
        await waitForTab(tabId)
        let read: PageRead | undefined
        // Wait for the cards to appear (or for Google's check page).
        for (let attempt = 0; attempt < 12; attempt++) {
          await sleep(attempt === 0 ? 1500 : 750)
          read = await inject(tabId, readPlacesPage)
          if (!read) continue
          if (/\/sorry\//.test(read.url) || CHALLENGE.test(read.text)) {
            result.stoppedReason = 'Google showed its check page'
            await save()
            await report(
              'blocked',
              search.index,
              `Google showed its check page during ${search.place}. Stopped so Google is not pushed further; resume later.`,
            )
            return 'blocked'
          }
          if (read.cards.length) break
        }
        if (!read || !read.cards.length) break
        take(read.cards)
        await save()
        // Scroll to the bottom until no new businesses load (pressing "More places" when it is shown).
        let quiet = 0
        for (let round = 0; round < timing.scrollRounds && quiet < 2 && control.action === 'run'; round++) {
          await report('running', search.index, `Reading ${search.place}, page ${page}: scrolling for more...`)
          const pressed = await inject(tabId, scrollForMore)
          await pause((pressed ? timing.morePlacesPauseSec : timing.scrollPauseSec) * 1000, control)
          const more = await inject(tabId, readPlacesPage)
          if (!more) break
          if (/\/sorry\//.test(more.url) || CHALLENGE.test(more.text)) {
            result.stoppedReason = 'Google showed its check page'
            await save()
            await report('blocked', search.index, `Google showed its check page during ${search.place}. Stopped; resume later.`)
            return 'blocked'
          }
          read = more
          quiet = take(more.cards) ? 0 : quiet + 1
          await save()
        }
        result.pages = page
        await save()
        if (control.action !== 'run') return await stopped(control, search.index)
        if (!read.next || result.businesses.length >= MAX_BUSINESSES) break
        await pause(pagePauseMs(timing), control)
        if (control.action !== 'run') return await stopped(control, search.index)
        await chrome.tabs.update(tabId, { url: read.next })
      }
      result.complete = true
      await save(true)
      done.add(search.index)
      await chrome.storage.local.set({ [DONE_KEY(job.id)]: [...done] })
      // Finished with this location: close its tab; the next search opens a new one.
      await closeSearchTab()
    }
    await report('finished', job.searches.length, `All ${job.searches.length} searches finished.`)
    return 'finished'
  } catch (failure) {
    // Leave a clear reason instead of a run that looks interrupted; what was saved stays, and Resume continues here.
    const reason = String(failure).replace(/^\w*Error:\s*/, '')
    await report('stopped', currentIndex, `Stopped: could not save to the data folder (${reason}). Resume to continue from this search.`).catch(
      () => undefined,
    )
    throw failure
  } finally {
    await closeSearchTab()
    if (scraperTab?.id !== undefined) await chrome.tabs.update(scraperTab.id, { active: true }).catch(() => undefined)
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
