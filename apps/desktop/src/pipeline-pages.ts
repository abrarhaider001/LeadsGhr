import { BrowserWindow, ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import robotsParser from 'robots-parser'
import { randomUUID } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { discoverPage, extractContacts } from '@leadsghr/extract'
import type { HttpAdapter } from '@leadsghr/platform'
import { crawlRunIdSchema, crawlRunRowInputSchema, type CrawlRow } from '@leadsghr/schemas'
import type { createCrawlRunStore } from './crawl-runs'
import { publicIp } from './adapters'

const AGENT = 'LeadsGhr/0.1 (public-data crawler)'
const CHALLENGE = /captcha|unusual traffic|verify you are human|sign in to continue/i
const CONTACT = /(?:^|[\/_-])(?:contact(?:-us)?|get-in-touch|reach-us|enquir(?:y|ies)|inquir(?:y|ies))(?:$|[\/_-])/i
const MAX_SITE_PAGES = 40
const MAX_RUN_PAGES = 5000
type PageStatus = 'queued' | 'fetching' | 'ready' | 'crawling' | 'crawled' | 'skipped'
type StoredPage = { run_id: string; row_key: string; url: string; kind: 'Homepage' | 'Contact page' | 'Page'; status: PageStatus; emails_json: string; error: string | null; created_at: string }
type Page = { rowKey: string; url: string; kind: StoredPage['kind']; status: PageStatus; emails: string[]; error: string | null }
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const canonical = (raw: string) => { const url = new URL(raw); url.hash = ''; if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only public HTTP pages can be queued'); url.pathname = url.pathname.replace(/\/$/, '') || '/'; return url.toString() }
const rowKey = (row: CrawlRow) => row.mapsUrl.trim().toLowerCase() || row.website.trim().toLowerCase().replace(/\/$/, '') || `${row.name.trim().toLowerCase()}|${row.address.trim().toLowerCase()}`

export function registerPipelinePages(window: BrowserWindow, db: Database.Database, http: HttpAdapter, store: ReturnType<typeof createCrawlRunStore>) {
  db.exec(`CREATE TABLE IF NOT EXISTS pipeline_pages (run_id TEXT NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE, row_key TEXT NOT NULL, url TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, emails_json TEXT NOT NULL DEFAULT '[]', error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(run_id,row_key,url));
    CREATE INDEX IF NOT EXISTS pipeline_pages_pending_idx ON pipeline_pages(run_id,status,created_at);`)
  db.prepare("UPDATE pipeline_pages SET status='queued' WHERE status IN ('fetching','ready','crawling')").run()
  let active: { id: string; controller: AbortController; paused: boolean } | null = null
  const page = (stored: StoredPage): Page => ({ rowKey: stored.row_key, url: stored.url, kind: stored.kind, status: stored.status, emails: JSON.parse(stored.emails_json), error: stored.error })
  const redirectAliases = new Map<string, string>()
  const list = (id: string): Page[] => (db.prepare('SELECT * FROM pipeline_pages WHERE run_id=? ORDER BY created_at,rowid').all(id) as StoredPage[]).map(page)
  const emit = (id: string, text: string) => { if (!window.isDestroyed()) window.webContents.send('leadsghr:pipeline-pages:event', { id, text, pages: list(id) }) }
  const setStatus = (id: string, target: Page, status: PageStatus, error?: string, emails?: string[]) => {
    db.prepare('UPDATE pipeline_pages SET status=?,error=?,emails_json=COALESCE(?,emails_json),updated_at=? WHERE run_id=? AND row_key=? AND url=?')
      .run(status, error ?? null, emails ? JSON.stringify(emails) : null, new Date().toISOString(), id, target.rowKey, target.url)
    emit(id, `${target.kind}: ${status} ${target.url}`)
  }
  const enqueue = (id: string, key: string, raw: string, kind: Page['kind']) => {
    const url = canonical(raw)
    if (redirectAliases.has(`${id}|${key}|${url}`)) return false
    const siteCount = (db.prepare('SELECT COUNT(*) AS count FROM pipeline_pages WHERE run_id=? AND row_key=?').get(id, key) as { count: number }).count
    const runCount = (db.prepare('SELECT COUNT(*) AS count FROM pipeline_pages WHERE run_id=?').get(id) as { count: number }).count
    if (siteCount >= MAX_SITE_PAGES || runCount >= MAX_RUN_PAGES) return false
    const now = new Date().toISOString()
    const result = db.prepare("INSERT OR IGNORE INTO pipeline_pages (run_id,row_key,url,kind,status,emails_json,created_at,updated_at) VALUES (?,?,?,?,'queued','[]',?,?)").run(id, key, url, kind, now, now)
    if (result.changes) emit(id, `Queued ${url}`)
    return result.changes > 0
  }
  const nextPage = (id: string) => {
    const item = db.prepare("SELECT * FROM pipeline_pages WHERE run_id=? AND status='queued' ORDER BY CASE kind WHEN 'Contact page' THEN 0 WHEN 'Homepage' THEN 1 ELSE 2 END, created_at,rowid LIMIT 1").get(id) as StoredPage | undefined
    return item ? page(item) : null
  }
  const policies = new Map<string, ReturnType<typeof robotsParser>>()
  const nextAllowedFetch = new Map<string, number>()
  async function reserveFetch(origin: string, delay: number) {
    const at = Math.max(Date.now(), nextAllowedFetch.get(origin) ?? 0)
    nextAllowedFetch.set(origin, at + delay)
    if (at > Date.now()) await wait(at - Date.now())
  }
  async function prefetch(id: string, target: Page, signal: AbortSignal) {
    setStatus(id, target, 'fetching')
    const origin = new URL(target.url).origin
    let robots = policies.get(origin)
    if (!robots) {
      const robotsUrl = `${origin}/robots.txt`
      const response = await http.get(robotsUrl, { maxBytes: 250_000, timeoutMs: 20000 })
      if (response.status !== 200 && response.status !== 404) throw new Error('Robots policy unavailable; crawl paused')
      robots = robotsParser(robotsUrl, response.status === 200 ? response.body : '')
      policies.set(origin, robots)
    }
    if (!robots.isAllowed(target.url, AGENT)) { setStatus(id, target, 'skipped', 'Disallowed by robots.txt'); return null }
    const delay = Math.max(2000, (robots.getCrawlDelay(AGENT) ?? 0) * 1000)
    await reserveFetch(origin, delay)
    if (signal.aborted) return null
    const response = await http.get(target.url, { maxBytes: 2_000_000, timeoutMs: 20000 })
    if (signal.aborted) return null
    const final = new URL(response.url)
    const requested = new URL(target.url)
    if (final.hostname.replace(/^www\./, '') !== requested.hostname.replace(/^www\./, '')) throw new Error('Cross-site redirect paused')
    if (final.origin !== origin) {
      const finalRobotsUrl = `${final.origin}/robots.txt`
      const finalRobotsResponse = await http.get(finalRobotsUrl, { maxBytes: 250_000, timeoutMs: 20000 })
      if (finalRobotsResponse.status !== 200 && finalRobotsResponse.status !== 404) throw new Error('Redirect robots policy unavailable; crawl paused')
      const finalRobots = robotsParser(finalRobotsUrl, finalRobotsResponse.status === 200 ? finalRobotsResponse.body : '')
      policies.set(final.origin, finalRobots)
      if (!finalRobots.isAllowed(final.toString(), AGENT)) throw new Error('Redirect target disallowed by robots.txt')
    }
    if ([401, 403, 429, 503].includes(response.status) || CHALLENGE.test(response.body.slice(0, 10000))) throw new Error('Page presented a challenge; crawl paused')
    if (response.status !== 200 || !response.contentType.includes('text/html')) { setStatus(id, target, 'skipped', `HTTP ${response.status}: no public HTML`); return null }
    if (response.url !== target.url) redirectAliases.set(`${id}|${target.rowKey}|${canonical(response.url)}`, target.url)
    setStatus(id, target, 'ready')
    return { html: response.body, url: response.url }
  }
  async function crawl(id: string, target: Page, html: string, pageUrl: string, contactOnly: boolean) {
    setStatus(id, target, 'crawling')
    const snapshots = [html]
    const preview = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, partition: `pipeline-${randomUUID()}` } })
    preview.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    const allowNavigation = (url: string) => { try { const destination = new URL(url); return destination.origin === new URL(pageUrl).origin && (policies.get(destination.origin)?.isAllowed(url, AGENT) ?? false) } catch { return false } }
    preview.webContents.on('will-navigate', (event, url) => { if (!allowNavigation(url)) event.preventDefault() })
    preview.webContents.on('will-redirect', (event, url) => { if (!allowNavigation(url)) event.preventDefault() })
    preview.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    preview.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders }
      delete headers.Cookie; delete headers.cookie; delete headers.Authorization; delete headers.authorization
      callback({ requestHeaders: headers })
    })
    preview.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = new URL(details.url)
        if (['data:', 'blob:'].includes(url.protocol)) return callback({})
        if (!['http:', 'https:'].includes(url.protocol)) return callback({ cancel: true })
        void lookup(url.hostname, { all: true }).then((addresses) => callback(addresses.length && addresses.every(({ address }) => publicIp(address)) ? {} : { cancel: true })).catch(() => callback({ cancel: true }))
      } catch { callback({ cancel: true }) }
    })
    try {
      const origin = new URL(pageUrl).origin
      await reserveFetch(origin, Math.max(2000, (policies.get(origin)?.getCrawlDelay(AGENT) ?? 0) * 1000))
      if (active?.controller.signal.aborted) return
      await Promise.race([preview.loadURL(pageUrl), new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Rendered page timed out')), 20000))])
      for (let step = 0; step < 8; step++) {
        if (active?.controller.signal.aborted) break
        const rendered = await preview.webContents.executeJavaScript(`window.scrollTo(0, document.documentElement.scrollHeight * ${(step + 1) / 8}); document.documentElement.outerHTML`) as string
        if (CHALLENGE.test(rendered.slice(0, 10000))) throw new Error('Page presented a challenge; crawl paused')
        snapshots.push(rendered)
        await wait(350)
      }
    } catch (error) {
      if (CHALLENGE.test(String(error))) throw error
      emit(id, `Rendered preview unavailable for ${target.url}; using public HTML.`)
    } finally { if (!preview.isDestroyed()) preview.destroy() }
    const links = new Set<string>()
    const emails = new Set<string>()
    for (const snapshot of snapshots) {
      const discovery = discoverPage(snapshot, pageUrl)
      for (const link of discovery.links) links.add(link)
      for (const email of [...extractContacts(snapshot).emails, ...discovery.formRecipientEmails]) emails.add(email)
    }
    const storedRow = db.prepare('SELECT payload FROM crawl_run_rows WHERE run_id=? AND row_key=?').get(id, target.rowKey) as { payload: string } | undefined
    if (storedRow) {
      const row = JSON.parse(storedRow.payload) as CrawlRow
      store.saveRow({ id, row: { ...row, emails: [...new Set([...row.emails, ...emails])].slice(0, 100), emailsScanned: true, source: 'Maps + website' } })
    }
    if (target.kind === 'Homepage') {
      const contact = [...links].find((link) => CONTACT.test(decodeURIComponent(new URL(link).pathname)))
      if (contact) enqueue(id, target.rowKey, contact, 'Contact page')
    }
    if (!contactOnly) for (const link of links) enqueue(id, target.rowKey, link, CONTACT.test(decodeURIComponent(new URL(link).pathname)) ? 'Contact page' : 'Page')
    setStatus(id, target, 'crawled', undefined, [...emails])
  }
  async function process(id: string, signal: AbortSignal) {
    const run = store.get(id)
    if (!run) throw new Error('Pipeline not found')
    const contactOnly = run.preferences.crawlerContactOnly
    const prepare = (target: Page) => prefetch(id, target, signal).then((result) => ({ result, error: null as unknown }), (error: unknown) => ({ result: null, error }))
    let target = nextPage(id)
    let pending = target ? prepare(target) : null
    while (target && pending && !signal.aborted) {
      const { result: prepared, error } = await pending
      if (error) {
        setStatus(id, target, 'queued', String(error))
        emit(id, `Paused: ${String(error)}`)
        return 'paused'
      }
      if (signal.aborted) break
      const current = target
      target = nextPage(id)
      pending = target ? prepare(target) : null // fetch N+1 while N is crawled
      if (prepared) {
        try { await crawl(id, current, prepared.html, prepared.url, contactOnly) }
        catch (error) {
          active?.controller.abort()
          setStatus(id, current, 'queued', String(error))
          db.prepare("UPDATE pipeline_pages SET status='queued' WHERE run_id=? AND status IN ('fetching','ready','crawling')").run(id)
          emit(id, `Paused: ${String(error)}`)
          return 'paused'
        }
      }
    }
    if (signal.aborted) {
      db.prepare("UPDATE pipeline_pages SET status='queued' WHERE run_id=? AND status IN ('fetching','ready','crawling')").run(id)
      emit(id, 'Pipeline paused')
      return 'paused'
    }
    emit(id, 'Website crawl complete')
    return 'completed'
  }
  const requireOwner = (event: Electron.IpcMainInvokeEvent) => { if (event.sender !== window.webContents) throw new Error('Unexpected caller') }
  ipcMain.handle('leadsghr:pipeline-pages:enqueue', (event, input: unknown) => {
    requireOwner(event)
    const { id, row } = crawlRunRowInputSchema.parse(input)
    if (!store.get(id)) throw new Error('Pipeline not found')
    if (!row.website) return false
    return enqueue(id, rowKey(row), row.website, 'Homepage')
  })
  ipcMain.handle('leadsghr:pipeline-pages:list', (event, id: unknown) => { requireOwner(event); return list(crawlRunIdSchema.parse(id)) })
  ipcMain.handle('leadsghr:pipeline-pages:start', async (event, rawId: unknown) => {
    requireOwner(event)
    const id = crawlRunIdSchema.parse(rawId)
    if (active) throw new Error('Another pipeline website crawl is running')
    const controller = new AbortController()
    active = { id, controller, paused: false }
    try { return await process(id, controller.signal) }
    finally { if (active?.controller === controller) active = null }
  })
  ipcMain.handle('leadsghr:pipeline-pages:pause', (event, rawId: unknown) => { requireOwner(event); const id = crawlRunIdSchema.parse(rawId); if (active?.id === id) { active.controller.abort(); active.paused = true } return true })
  window.on('closed', () => active?.controller.abort())
}
