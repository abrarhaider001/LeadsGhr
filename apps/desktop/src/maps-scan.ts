import { app } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import robotsParser from 'robots-parser'
import { desktopHttp } from './adapters'
import { discoverPage, extractContacts } from '@leadsghr/extract'
import {
  clampSearchTiming,
  combineSources,
  pagePauseMs,
  SEARCH_TIMING_PRESETS,
  withWebsiteSource,
  type CrawlRowSource,
  type SearchTiming,
} from '@leadsghr/schemas'

const AGENT = 'LeadsGhr/0.1 (public-data crawler)'
const CHALLENGE =
  /captcha|unusual traffic|verify you are human|sign in to continue|before you continue to google/i
export type MapsRow = {
  id: string
  name: string
  website: string
  phone: string
  location: string
  address: string
  mapsUrl: string
  source: CrawlRowSource
  emails: string[]
  emailsScanned: boolean
}
export type MapsScanEvent =
  | { type: 'status'; text: string }
  | { type: 'row'; row: MapsRow }
  | { type: 'done'; count: number }
  | { type: 'error'; text: string }

function chromePath(): string {
  const roots = [
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
    process.env.LOCALAPPDATA,
  ].filter((value): value is string => Boolean(value))
  const installed = roots
    .map((root) => join(root, 'Google/Chrome/Application/chrome.exe'))
    .find(existsSync)
  if (!installed) throw new Error('Google Chrome is not installed in a standard location')
  return installed
}
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error('Search stopped'))
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Search stopped'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })

async function checkRobots(url: string) {
  const robotsUrl = 'https://www.google.com/robots.txt'
  const response = await desktopHttp.get(robotsUrl, { maxBytes: 250_000, timeoutMs: 15000 })
  if (response.status !== 200) throw new Error('Google robots policy unavailable; search paused')
  if (!robotsParser(robotsUrl, response.body).isAllowed(url, AGENT))
    throw new Error('Google robots.txt disallows this search')
}

class Cdp {
  private nextId = 0
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void }>()
  constructor(private socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data))
        const task = this.pending.get(message.id)
        if (!task) return
        this.pending.delete(message.id)
        if (message.error) task.reject(new Error(message.error.message ?? 'Chrome command failed'))
        else task.resolve(message.result)
      } catch {
        /* Ignore unrelated Chrome events. */
      }
    })
    socket.addEventListener('close', () => {
      for (const task of this.pending.values()) task.reject(new Error('Chrome connection closed'))
      this.pending.clear()
    })
  }
  call(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate<T>(expression: string): Promise<T> {
    const reply = await this.call('Runtime.evaluate', { expression, returnByValue: true })
    if (reply.exceptionDetails) throw new Error('Could not inspect the public Maps page')
    return reply.result.value as T
  }
  close() {
    this.socket.close()
  }
}

async function connect(port: number, signal: AbortSignal): Promise<Cdp> {
  for (let attempt = 0; attempt < 25; attempt++) {
    if (signal.aborted) throw new Error('Search stopped')
    try {
      const pages = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
        response.json(),
      )) as { type: string; url: string; webSocketDebuggerUrl: string }[]
      const page = pages.find(
        (item) =>
          item.type === 'page' &&
          /^https:\/\/www\.google\.com\/(?:maps\/|search\?|sorry\/)/.test(item.url),
      )
      if (!page) throw new Error('Chrome page not ready')
      const socket = new WebSocket(page.webSocketDebuggerUrl)
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener('open', () => resolve(), { once: true })
        socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), {
          once: true,
        })
      })
      return new Cdp(socket)
    } catch {
      await wait(400, signal)
    }
  }
  throw new Error('Chrome did not open a controllable page')
}

async function readPublicEmails(
  url: string,
  signal: AbortSignal,
): Promise<{ emails: string[]; scanned: boolean }> {
  const start = new URL(url)
  if (!['http:', 'https:'].includes(start.protocol) || start.username || start.password)
    return { emails: [], scanned: false }
  const robotsUrl = new URL('/robots.txt', start).toString()
  const robots = await desktopHttp.get(robotsUrl, { maxBytes: 250_000, timeoutMs: 12000 })
  if (
    ![200, 404].includes(robots.status) ||
    !robotsParser(robotsUrl, robots.status === 200 ? robots.body : '').isAllowed(url, AGENT)
  )
    return { emails: [], scanned: false }
  const page = await desktopHttp.get(url, { maxBytes: 2_000_000, timeoutMs: 15000 })
  if (
    signal.aborted ||
    page.status !== 200 ||
    !page.contentType.includes('text/html') ||
    CHALLENGE.test(page.body.slice(0, 10000))
  )
    return { emails: [], scanned: false }
  if (new URL(page.url).origin !== start.origin) return { emails: [], scanned: false }
  const emails = new Set(extractContacts(page.body).emails)
  const contact = discoverPage(page.body, page.url).links.find((link) =>
    /\/(?:contact|about)(?:[/?#-]|$)/i.test(new URL(link).pathname),
  )
  if (contact && !signal.aborted) {
    await wait(1000, signal)
    if (
      robotsParser(robotsUrl, robots.status === 200 ? robots.body : '').isAllowed(contact, AGENT)
    ) {
      try {
        const next = await desktopHttp.get(contact, { maxBytes: 2_000_000, timeoutMs: 15000 })
        if (
          next.status === 200 &&
          next.contentType.includes('text/html') &&
          new URL(next.url).origin === start.origin &&
          !CHALLENGE.test(next.body.slice(0, 10000))
        ) {
          for (const email of extractContacts(next.body).emails) emails.add(email)
        }
      } catch {
        /* Keep emails already found on the homepage. */
      }
    }
  }
  return { emails: [...emails], scanned: true }
}

const snapshot = `(() => {
  const text = document.body?.innerText?.slice(0, 9000) ?? '';
  const cards = [...document.querySelectorAll('a.hfpxzc[href*="/maps/place/"]')].map(anchor => {
    const card = anchor.closest('.Nv2PK') || anchor.closest('[role="article"]');
    if (!card) return null;
    const name = anchor.getAttribute('aria-label')?.trim() || '';
    const mapsUrl = anchor.href;
    const website = card.querySelector('a[data-value="Website"]')?.href || '';
    const body = card.innerText || '';
    const phone = body.match(/(?:\\+1[\\s.-]*)?(?:\\(\\d{3}\\)|\\d{3})[\\s.-]*\\d{3}[\\s.-]*\\d{4}/)?.[0] || '';
    const address = body.match(/\\b\\d{1,6}\\s+[A-Za-z0-9 .'-]+\\s(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)\\b/i)?.[0] || '';
    const emails = [...new Set((body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi) || []).map(value => value.toLowerCase()))];
    return { name, mapsUrl, website, phone, address, emails };
  }).filter(Boolean);
  const feed = document.querySelector('[role="feed"]');
  const end = /reached the end of the list/i.test(feed?.innerText || '');
  return { url: location.href, text, cards, feed: Boolean(feed), end, scrollTop: feed?.scrollTop || 0, scrollHeight: feed?.scrollHeight || 0, clientHeight: feed?.clientHeight || 0 };
})()`

/** Where to aim mouse-wheel scrolling: inside the Maps result list. */
const feedPoint = `(() => {
  const feed = document.querySelector('[role="feed"]');
  if (!feed) return null;
  const box = feed.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height * 0.7 };
})()`

/**
 * Google Search's business list (the Places page behind "More businesses"). Each business is a card (div.VkpGBb)
 * whose first heading is its name. Its Website button points to an encoded Google redirect, resolved afterwards.
 */
const placesSnapshot = `(() => {
  const text = document.body?.innerText?.slice(0, 9000) ?? '';
  const cards = [...document.querySelectorAll('div.VkpGBb')].map(card => {
    const name = card.querySelector('.OSrXXb')?.innerText?.trim() || '';
    if (!name) return null;
    const body = card.innerText || '';
    const link = [...card.querySelectorAll('a')].find(a => /^website$/i.test((a.innerText || '').trim()));
    const phone = body.match(/(?:\\+1[\\s.-]*)?(?:\\(\\d{3}\\)|\\d{3})[\\s.-]*\\d{3}[\\s.-]*\\d{4}/)?.[0] || '';
    const address = body.match(/\\b\\d{1,6}\\s+[A-Za-z0-9 .'-]+\\s(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)\\b/i)?.[0] || '';
    return { name, websiteLink: link?.href || '', phone, address, sponsored: /^\\s*Sponsored/i.test(body) };
  }).filter(Boolean);
  return { url: location.href, text, cards, first: cards.map(card => card.name).join('|'), hasNext: Boolean(document.querySelector('a#pnnext')) };
})()`

/** The visible next-page arrow. The a#pnnext link itself has no height, so the click must aim at the arrow inside it. */
const nextArrowPoint = `(() => {
  const link = document.querySelector('a#pnnext');
  if (!link) return null;
  link.scrollIntoView({ block: 'center' });
  const visible = [link, ...link.querySelectorAll('*')]
    .map(element => element.getBoundingClientRect())
    .filter(box => box.width > 0 && box.height > 0)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return visible ? { x: visible.left + visible.width / 2, y: visible.top + visible.height / 2 } : null;
})()`

type PlacesCard = { name: string; websiteLink: string; phone: string; address: string; sponsored: boolean }

const businessKey = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const websiteKey = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}
/** Drops Google's tracking parameters (utm_*) from a business website address. */
function cleanWebsite(url: string) {
  const address = new URL(url)
  for (const key of [...address.searchParams.keys()])
    if (/^utm_/i.test(key)) address.searchParams.delete(key)
  return address.toString()
}
const isGoogleHost = (hostname: string) => /(^|\.)google\.[a-z.]+$/i.test(hostname)

/*
 * Polite pacing for Google Search (AGENTS.md, rule 5), from Preferences → Search → Search timing
 * (packages/schemas/src/search-timing.ts): at most the chosen pages per location, a random pause between pages, a
 * pause between two locations' Google Search reads, and a longer break every few locations, so LeadsGhr asks Google
 * far less often than a fast script would. It does not hide that it is a browser controlled by LeadsGhr; when Google
 * still shows its check page, the search stops.
 */
let lastGoogleSearchAt = 0
let googleSearchReads = 0

/**
 * Turns a Google Search Website link (an encoded /goto or /url redirect) into the business's own address by reading
 * the redirect target, without opening the business site. Returns '' when it is not a public http(s) website.
 */
export async function resolveWebsite(link: string, signal: AbortSignal): Promise<string> {
  try {
    const start = new URL(link)
    if (!isGoogleHost(start.hostname))
      return ['http:', 'https:'].includes(start.protocol) ? cleanWebsite(link) : ''
    const direct = start.searchParams.get('adurl') || start.searchParams.get('q')
    let target: URL | undefined
    if (direct && /^https?:\/\//i.test(direct)) target = new URL(direct)
    else {
      const response = await fetch(start, {
        redirect: 'manual',
        signal,
        headers: { 'user-agent': app.userAgentFallback || 'Mozilla/5.0' },
      })
      const location = response.headers.get('location')
      await response.body?.cancel().catch(() => undefined)
      if (location) target = new URL(location, start)
    }
    if (
      !target ||
      !['http:', 'https:'].includes(target.protocol) ||
      target.username ||
      target.password ||
      isGoogleHost(target.hostname)
    )
      return ''
    return cleanWebsite(target.toString())
  } catch {
    return ''
  }
}

export async function scanMaps(
  query: string,
  location: string,
  emit: (event: MapsScanEvent) => void,
  signal: AbortSignal,
  showChrome = true,
  sources: { maps: boolean; googleSearch?: boolean; websites: boolean } = {
    maps: true,
    googleSearch: false,
    websites: false,
  },
  timing: SearchTiming = SEARCH_TIMING_PRESETS.normal,
) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&hl=en`
  // Google Search's business list (what "More businesses" opens). Google's robots.txt disallows /search; reading it
  // is an owner-approved exception that runs only when the user turns it on (AGENTS.md, rule 5).
  const placesUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=local&hl=en`
  const googleSearch = Boolean(sources.googleSearch)
  const url = sources.maps || sources.websites ? mapsUrl : placesUrl
  const crawlTargets: MapsRow[] = []
  let child: ChildProcess | undefined
  let cdp: Cdp | undefined
  let profile: string | undefined
  const seen = new Set<string>()
  // Every business shown so far, by name and by website, so a Google Search listing that is already on Maps updates
  // that row ("Maps + Google Search") instead of appearing twice.
  const found = new Map<string, MapsRow>()
  const shown = new Set<string>()
  const remember = (row: MapsRow) => {
    shown.add(row.id)
    const name = businessKey(row.name)
    if (name) found.set(`name:${name}`, row)
    const site = websiteKey(row.website)
    if (site) found.set(`site:${site}`, row)
  }
  const addCrawlTarget = (row: MapsRow) => {
    if (!sources.websites || !row.website || crawlTargets.length >= 15) return
    try {
      const website = new URL(row.website)
      if (['http:', 'https:'].includes(website.protocol) && !website.username && !website.password)
        crawlTargets.push(row)
    } catch {
      /* Ignore malformed website links. */
    }
  }
  try {
    emit({ type: 'status', text: 'Checking public access and robots.txt...' })
    if (!sources.maps && !googleSearch && !sources.websites)
      throw new Error(
        'Turn on Google Maps or Google Search listings in Settings → Preferences → Search',
      )
    if (sources.maps || sources.websites) await checkRobots(url)
    if (signal.aborted) throw new Error('Search stopped')
    profile = await mkdtemp(join(app.getPath('temp'), 'leadsghr-maps-'))
    emit({
      type: 'status',
      text: showChrome
        ? 'Opening a visible Chrome window...'
        : 'Opening Chrome privately in the background...',
    })
    child = spawn(
      chromePath(),
      [
        ...(showChrome
          ? ['--new-window', '--start-maximized']
          : ['--headless=new', '--disable-gpu']),
        // Keep the page working at full speed when the window is behind other windows or hidden, so result
        // lists keep loading as they are scrolled.
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        url,
      ],
      { windowsHide: !showChrome, stdio: 'ignore' },
    )
    await new Promise<void>((resolve, reject) => {
      child!.once('spawn', resolve)
      child!.once('error', reject)
    })
    let port = 0
    for (let i = 0; i < 40; i++) {
      if (signal.aborted) throw new Error('Search stopped')
      try {
        port = Number(
          (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0],
        )
        if (port) break
      } catch {
        /* Chrome is starting. */
      }
      await wait(250, signal)
    }
    if (!port) throw new Error('Chrome did not start its local browser connection')
    cdp = await connect(port, signal)
    if (showChrome) await cdp.call('Page.bringToFront')
    if (sources.maps || sources.websites) {
      emit({ type: 'status', text: 'Reading public Maps results...' })
      let quietRounds = 0
      let loadingRounds = 0
      let lastPageUrl = ''
      let reopened = false
      for (let step = 0; step < 70 && seen.size < 200; step++) {
        if (signal.aborted) throw new Error('Search stopped')
        await wait(step === 0 ? 1700 : 1400, signal)
        const page = await cdp.evaluate<{
          url: string
          text: string
          cards: Pick<MapsRow, 'name' | 'website' | 'phone' | 'address' | 'mapsUrl' | 'emails'>[]
          feed: boolean
          end: boolean
          scrollTop: number
          scrollHeight: number
          clientHeight: number
        }>(snapshot)
        lastPageUrl = page.url
        // Chrome sometimes keeps the new tab on about:blank and never starts loading the Maps address it was
        // started with. Open the address once in that case (Google was not reached yet, so this is not a repeat).
        if (page.url === 'about:blank' && step >= 2 && !reopened) {
          reopened = true
          loadingRounds = 0
          emit({
            type: 'status',
            text: 'Chrome opened an empty tab; opening the Maps search again...',
          })
          await cdp.call('Page.navigate', { url: mapsUrl })
          continue
        }
        // Chrome shows its own error page when the connection drops: report it as a network problem, not as a broken search.
        if (page.url.startsWith('chrome-error://'))
          throw new Error('Chrome could not load Google Maps (network error)')
        if (CHALLENGE.test(page.text)) throw new Error('Google presented a challenge; search paused')
        if (!page.cards.length && !seen.size && loadingRounds < 12) {
          loadingRounds++
          if (loadingRounds === 1)
            emit({ type: 'status', text: 'Waiting for Maps results to load...' })
          continue
        }
        let added = 0
        for (const card of page.cards) {
          if (signal.aborted) throw new Error('Search stopped')
          if (!card.name || !card.mapsUrl || seen.has(card.mapsUrl)) continue
          seen.add(card.mapsUrl)
          added++
          const row: MapsRow = {
            ...card,
            id: card.mapsUrl,
            location,
            source: 'Maps',
            emails: card.emails,
            emailsScanned: false,
          }
          remember(row)
          if (sources.maps) emit({ type: 'row', row })
          addCrawlTarget(row)
        }
        quietRounds = added ? 0 : quietRounds + 1
        // Stop at Maps' own "end of the list" message. Without it, keep scrolling a while longer: Maps can take
        // several seconds to load its next batch, and stopping early silently loses listings.
        if (
          !page.feed ||
          page.end ||
          (quietRounds >= 6 && page.scrollTop + page.clientHeight >= page.scrollHeight - 20)
        )
          break
        // Scroll the list with the mouse wheel, as a person would: Maps loads its next batch on real scrolling,
        // which a script-set scroll position does not always trigger. The script scroll stays as a backup.
        const point = await cdp.evaluate<{ x: number; y: number } | null>(feedPoint)
        if (point)
          for (let turn = 0; turn < 3; turn++)
            await cdp.call('Input.dispatchMouseEvent', {
              type: 'mouseWheel',
              x: point.x,
              y: point.y,
              deltaX: 0,
              deltaY: 900,
            })
        await cdp.evaluate(
          `(() => { const feed = document.querySelector('[role="feed"]'); if (feed) feed.scrollBy(0, Math.max(500, feed.clientHeight * .85)); })()`,
        )
      }
      if (!seen.size && !lastPageUrl.startsWith('https://www.google.com/maps/') && !googleSearch) {
        let shownUrl = lastPageUrl
        try {
          const page = new URL(lastPageUrl)
          shownUrl = `${page.hostname}${page.pathname}`.slice(0, 80)
        } catch {
          /* keep the raw value */
        }
        throw new Error(
          `Google opened a different result view (${shownUrl || 'no page'}); Maps listings were not available for this search`,
        )
      }
    }
    if (googleSearch) {
      if (signal.aborted) throw new Error('Search stopped')
      const pace = clampSearchTiming(timing)
      if (pace.breakEvery && googleSearchReads && googleSearchReads % pace.breakEvery === 0) {
        emit({
          type: 'status',
          text: `Taking a ${pace.breakMinutes}-minute break after ${googleSearchReads} Google Searches, to keep requests polite...`,
        })
        await wait(pace.breakMinutes * 60_000, signal)
      }
      const gap = pace.locationPauseSec * 1000
      const sinceLast = Date.now() - lastGoogleSearchAt
      if (lastGoogleSearchAt && sinceLast < gap) {
        emit({
          type: 'status',
          text: `Waiting ${Math.ceil((gap - sinceLast) / 1000)} s before the next Google Search, to keep requests polite...`,
        })
        await wait(gap - sinceLast, signal)
      }
      lastGoogleSearchAt = Date.now()
      googleSearchReads++
      emit({ type: 'status', text: 'Reading Google Search business listings...' })
      if (sources.maps || sources.websites) await cdp.call('Page.navigate', { url: placesUrl })
      const placesSeen = new Set<string>()
      let previousFirst = ''
      for (let pageNumber = 1; pageNumber <= pace.pagesPerLocation && placesSeen.size < 200; pageNumber++) {
        // Wait for this page's business cards; after a page change, wait until they are the new page's cards.
        let page:
          | { url: string; text: string; cards: PlacesCard[]; first: string; hasNext: boolean }
          | undefined
        for (let attempt = 0; attempt < 24; attempt++) {
          await wait(attempt === 0 ? 1500 : 750, signal)
          page = await cdp.evaluate<NonNullable<typeof page>>(placesSnapshot)
          if (page!.url.startsWith('chrome-error://'))
            throw new Error('Chrome could not load Google Search (network error)')
          if (/\/sorry\//.test(page!.url))
            throw new Error(
              'Google showed its "unusual traffic" check page for Google Search; search paused. Try again later, or search with Google Maps only.',
            )
          // Wait until the browser has left the Maps page before judging this one.
          if (!page!.url.startsWith('https://www.google.com/search')) continue
          if (CHALLENGE.test(page!.text) || /\/sorry\//.test(page!.url))
            throw new Error(
              `Google presented a challenge on Google Search ("${page!.text.match(CHALLENGE)?.[0] ?? 'blocked page'}"); search paused`,
            )
          if (page!.cards.length && page!.first !== previousFirst) break
        }
        if (!page || !page.cards.length || page.first === previousFirst) break
        previousFirst = page.first
        emit({
          type: 'status',
          text: `Reading Google Search business listings (page ${pageNumber})...`,
        })
        for (const card of page.cards) {
          if (signal.aborted) throw new Error('Search stopped')
          const key = businessKey(card.name)
          if (card.sponsored || !key || placesSeen.has(key)) continue
          placesSeen.add(key)
          const website = card.websiteLink ? await resolveWebsite(card.websiteLink, signal) : ''
          const match =
            found.get(`name:${key}`) ??
            (website ? found.get(`site:${websiteKey(website)}`) : undefined)
          const row: MapsRow = match
            ? {
                ...match,
                website: match.website || website,
                phone: match.phone || card.phone,
                address: match.address || card.address,
                source: combineSources(match.source, 'Google Search'),
              }
            : {
                id: '',
                name: card.name,
                website,
                phone: card.phone,
                address: card.address,
                location,
                mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.name} ${card.address || location}`)}`,
                source: 'Google Search',
                emails: [],
                emailsScanned: false,
              }
          if (!match) row.id = row.mapsUrl
          remember(row)
          emit({ type: 'row', row })
          if (!match) addCrawlTarget(row)
        }
        if (!page.hasNext) break
        const arrow = await cdp.evaluate<{ x: number; y: number } | null>(nextArrowPoint)
        if (!arrow) break
        await wait(pagePauseMs(pace), signal)
        for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
          await cdp.call('Input.dispatchMouseEvent', {
            type,
            x: arrow.x,
            y: arrow.y,
            button: 'left',
            clickCount: 1,
          })
      }
    }
    for (const row of crawlTargets) {
      if (signal.aborted) throw new Error('Search stopped')
      try {
        emit({
          type: 'status',
          text: `Checking public emails on ${new URL(row.website).hostname}...`,
        })
        const result = await readPublicEmails(row.website, signal)
        emit({
          type: 'row',
          row: {
            ...row,
            source: sources.maps || googleSearch ? withWebsiteSource(row.source) : 'Website',
            emails: [...new Set([...row.emails, ...result.emails])],
            emailsScanned: result.scanned,
          },
        })
      } catch (error) {
        if (signal.aborted) throw error
        emit({
          type: 'row',
          row: {
            ...row,
            source: sources.maps || googleSearch ? withWebsiteSource(row.source) : 'Website',
            emails: row.emails,
            emailsScanned: false,
          },
        })
      }
      await wait(800, signal)
    }
    emit({
      type: 'done',
      count: sources.maps || googleSearch ? shown.size : crawlTargets.length,
    })
  } catch (error) {
    if (signal.aborted) emit({ type: 'status', text: 'Search stopped.' })
    else emit({ type: 'error', text: String(error) })
  } finally {
    cdp?.close()
    child?.kill()
    if (profile) {
      try {
        const target = await realpath(profile)
        const tempRoot = await realpath(app.getPath('temp'))
        if (dirname(target) === tempRoot && basename(target).startsWith('leadsghr-maps-'))
          await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
      } catch {
        /* A locked temporary profile can be removed by the OS later. */
      }
    }
  }
}
