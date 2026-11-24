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
 * page's window: Google Search's business list for the search. The list is read from top to bottom
 * one business at a time (its card brought into view, its Website link looked up, the result saved), loading more
 * (and pressing "More places" when Google shows it) until no new businesses appear, then the next-page arrow is
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
    // Marks the card so the Scraper can scroll to it (scrollToCard) while it reads the list one business at a time.
    card.setAttribute('data-leadsghr-key', name.toLowerCase().replace(/[^a-z0-9]/g, ''))
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

/** Runs inside the Google tab: brings one business card into view, like a person reading the list. */
function scrollToCard(key: string): boolean {
  const card = document.querySelector<HTMLElement>(`[data-leadsghr-key="${CSS.escape(key)}"]`)
  if (!card) return false
  card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}

/** Runs inside the Google tab: requests a Website link the way the page itself would (same site, the profile's own
 *  cookies) without following it, so Google answers with its redirect; the extension reads where it points. */
function requestRedirect(link: string): Promise<boolean> {
  return fetch(link, { redirect: 'manual', credentials: 'include', cache: 'no-store' })
    .then(() => true)
    .catch(() => false)
}

const isGoogle = (hostname: string) => /(^|\.)google\.[a-z.]+$/i.test(hostname)

/** Drops tracking parameters that Google adds to business websites. */
function cleanWebsite(address: string): string {
  try {
    const url = new URL(address)
    for (const key of [...url.searchParams.keys()])
      if (/^(utm_|gclid$|fbclid$|y_source$|rwg_token$)/i.test(key)) url.searchParams.delete(key)
    return url.toString()
  } catch {
    return address
  }
}

/**
 * The business's own address behind a Google Website link, looked up from inside the Google tab (webRequest reads the
 * redirect's Location header; the business's site is never opened). Returns '' when the link leads to no public
 * website, or undefined when Google refused or did not answer (the desktop app then looks it up later).
 */
async function lookUpWebsite(tabId: number, link: string): Promise<string | undefined> {
  let start: URL
  try {
    start = new URL(link)
  } catch {
    return ''
  }
  if (!isGoogle(start.hostname)) return /^https?:$/.test(start.protocol) ? cleanWebsite(link) : ''
  const direct = start.searchParams.get('adurl') || start.searchParams.get('q')
  if (direct && /^https?:\/\//i.test(direct)) return cleanWebsite(direct)
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: string | undefined) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      chrome.webRequest.onHeadersReceived.removeListener(listener)
      resolve(value)
    }
    const listener = (details: chrome.webRequest.WebResponseHeadersDetails) => {
      if (details.url !== start.href && details.url !== link) return
      const location = details.responseHeaders?.find((header) => header.name.toLowerCase() === 'location')?.value
      if (!location) return finish(details.statusCode >= 200 && details.statusCode < 300 ? '' : undefined)
      try {
        const target = new URL(location, start)
        // A redirect back to Google (its check page) means "refused", not "no website".
        if (isGoogle(target.hostname)) return finish(undefined)
        if (!/^https?:$/.test(target.protocol) || target.username || target.password) return finish('')
        finish(cleanWebsite(target.toString()))
      } catch {
        finish('')
      }
    }
    const timer = setTimeout(() => finish(undefined), 8000)
    chrome.webRequest.onHeadersReceived.addListener(listener, { urls: ['https://www.google.com/*'], tabId }, ['responseHeaders'])
    void chrome.scripting
      .executeScript({ target: { tabId }, func: requestRedirect, args: [link] })
      .catch(() => finish(undefined))
  })
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

async function injectWith<T, A extends unknown[]>(tabId: number, func: (...args: A) => T, args: A): Promise<T | undefined> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func, args })
  return injection?.result as T | undefined
}

/** The key a business card is matched by (also set on the card in the page, see readPlacesPage). */
const keyOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

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
  // Website link -> the business's own address (undefined: Google refused, the desktop app looks it up later).
  const websites = new Map<string, string | undefined>()
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
      // The cards not read yet, in page order (ads are counted and skipped).
      const take = (cards: Card[]) => {
        const fresh: { name: string; websiteLink: string; business: ScraperBusiness }[] = []
        for (const card of cards) {
          if (card.sponsored) {
            const adKey = `ad:${card.name}`
            if (!seen.has(adKey)) {
              seen.add(adKey)
              counts.adsSkipped++
            }
            continue
          }
          const key = keyOf(card.name)
          if (!key || seen.has(key) || result.businesses.length + fresh.length >= MAX_BUSINESSES) continue
          seen.add(key)
          fresh.push({
            name: card.name,
            websiteLink: card.websiteLink,
            business: { name: card.name, websiteLink: card.websiteLink, phone: card.phone, address: card.address, page },
          })
        }
        return fresh
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
        // Move down the list one business at a time: bring its card into view, look up its website, save it, pause.
        // At the end of what is loaded, load more (pressing "More places" when Google shows it) and carry on.
        let quiet = 0
        let loads = 0
        while (control.action === 'run' && result.businesses.length < MAX_BUSINESSES) {
          const fresh = take(read.cards)
          for (const card of fresh) {
            if (control.action !== 'run') break
            await injectWith(tabId, scrollToCard, [keyOf(card.name)])
            const started = Date.now()
            if (card.websiteLink) {
              if (!websites.has(card.websiteLink)) websites.set(card.websiteLink, await lookUpWebsite(tabId, card.websiteLink))
              card.business.website = websites.get(card.websiteLink)
            }
            result.businesses.push(card.business)
            counts.businesses++
            if (card.websiteLink) {
              counts.withWebsite++
              counts.websitesPerSearch![search.index] = (counts.websitesPerSearch![search.index] ?? 0) + 1
            }
            counts.perSearch[search.index] = result.businesses.length
            await save()
            await report(
              'running',
              search.index,
              `Reading ${search.place}, page ${page}: ${result.businesses.length} ${result.businesses.length === 1 ? 'business' : 'businesses'} so far...`,
            )
            await pause(Math.max(0, timing.listingPauseSec * 1000 - (Date.now() - started)), control)
          }
          if (control.action !== 'run') break
          if (fresh.length) quiet = 0
          // Everything loaded so far is read: load more.
          if (loads >= timing.scrollRounds || quiet >= 2) break
          loads++
          await report('running', search.index, `Reading ${search.place}, page ${page}: loading more...`)
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
          if (!read.cards.some((card) => !card.sponsored && !seen.has(keyOf(card.name)))) quiet++
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
