import { BrowserWindow, ipcMain } from 'electron'
import robotsParser from 'robots-parser'
import { lookup } from 'node:dns/promises'
import { randomUUID } from 'node:crypto'
import { publicIp } from './adapters'
import { desktopPreferencesSchema, scanRequestSchema } from '@leadsghr/schemas'
import type { HttpAdapter } from '@leadsghr/platform'

const AGENT = 'LeadsGhr/0.1 (public-data crawler)'
const challenge = /captcha|unusual traffic|verify you are human|sign in to continue/i
export function registerCrawlerTest(window: BrowserWindow, http: HttpAdapter) {
  const approvedUrls = new Set<string>()
  const nextAllowedFetch = new Map<string, number>()
  const robotsPolicies = new Map<string, Promise<ReturnType<typeof robotsParser>>>()
  window.webContents.on('will-attach-webview', (event, preferences, params) => {
    if (!approvedUrls.has(params.src) || !params.partition?.startsWith('crawler-test-')) {
      event.preventDefault()
      return
    }
    delete preferences.preload
    delete params.preload
    delete params.allowpopups
    preferences.nodeIntegration = false
    preferences.contextIsolation = true
    preferences.sandbox = true
    preferences.webSecurity = true
  })
  window.webContents.on('did-attach-webview', (_event, guest) => {
    guest.setWindowOpenHandler(() => ({ action: 'deny' }))
    guest.on('will-navigate', (event, url) => {
      if (!approvedUrls.has(url)) event.preventDefault()
    })
    guest.session.webRequest.onBeforeRequest((details, callback) => {
      try {
        const target = new URL(details.url)
        if (['data:', 'blob:'].includes(target.protocol)) return callback({})
        if (!['http:', 'https:'].includes(target.protocol)) return callback({ cancel: true })
        void lookup(target.hostname, { all: true }).then((addresses) => {
          callback(addresses.length && addresses.every(({ address }) => publicIp(address)) ? {} : { cancel: true })
        }).catch(() => callback({ cancel: true }))
      } catch { callback({ cancel: true }) }
    })
    guest.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    guest.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders }
      delete headers.Cookie
      delete headers.cookie
      delete headers.Authorization
      delete headers.authorization
      callback({ requestHeaders: headers })
    })
  })

  async function checkRobots(url: string) {
    const origin = new URL(url).origin
    let policy = robotsPolicies.get(origin)
    if (!policy) {
      const robotsUrl = `${origin}/robots.txt`
      policy = http.get(robotsUrl, { maxBytes: 250_000, timeoutMs: 20000 }).then((response) => {
        if (response.status !== 200 && response.status !== 404) throw new Error('Robots policy unavailable; crawl paused')
        return robotsParser(robotsUrl, response.status === 200 ? response.body : '')
      }).catch((error) => { robotsPolicies.delete(origin); throw error })
      robotsPolicies.set(origin, policy)
    }
    const robots = await policy
    if (!robots.isAllowed(url, AGENT)) throw new Error('robots.txt disallows crawling this page')
    return Math.max(2000, (robots.getCrawlDelay(AGENT) ?? 0) * 1000)
  }

  async function reservePageFetch(url: string) {
    const delay = await checkRobots(url)
    const origin = new URL(url).origin
    const at = Math.max(Date.now(), nextAllowedFetch.get(origin) ?? 0)
    nextAllowedFetch.set(origin, at + delay)
    if (at > Date.now()) await new Promise((resolve) => setTimeout(resolve, at - Date.now()))
  }

  async function fetchPage(url: string) {
    await reservePageFetch(url)
    const response = await http.get(url, { maxBytes: 24_000_000, timeoutMs: 20000 })
    const target = new URL(response.url)
    const source = new URL(url)
    if (target.hostname.replace(/^www\./, '') !== source.hostname.replace(/^www\./, '')) throw new Error('Cross-site redirect paused')
    if (target.origin !== source.origin) await checkRobots(response.url)
    if (response.status !== 200 || !response.contentType.includes('text/html')) throw new Error('Page did not return public HTML')
    if (challenge.test(response.body.slice(0, 10000))) throw new Error('Page presented a challenge; crawl paused')
    approvedUrls.add(response.url)
    return { url: response.url, html: response.body }
  }

  ipcMain.handle('leadsghr:crawler-test:prepare', async (event, input: unknown) => {
    if (event.sender !== window.webContents) throw new Error('Unexpected caller')
    const { url } = scanRequestSchema.parse(input)
    return fetchPage(url)
  })

  ipcMain.handle('leadsghr:crawler-test:inspect', async (event, input: unknown) => {
    if (event.sender !== window.webContents) throw new Error('Unexpected caller')
    const { url, method } = scanRequestSchema.extend({ method: desktopPreferencesSchema.shape.crawlerFetchMethod }).parse(input)
    const prepared = await fetchPage(url)
    const snapshots = [prepared.html]
    if (method === 'http') return { url: prepared.url, snapshots }
    const preview = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, partition: `crawler-worker-${randomUUID()}` } })
    preview.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    preview.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    preview.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders }
      delete headers.Cookie; delete headers.cookie; delete headers.Authorization; delete headers.authorization
      callback({ requestHeaders: headers })
    })
    preview.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      try {
        const target = new URL(details.url)
        if (['data:', 'blob:'].includes(target.protocol)) return callback({})
        if (!['http:', 'https:'].includes(target.protocol)) return callback({ cancel: true })
        void lookup(target.hostname, { all: true }).then((addresses) => callback(addresses.length && addresses.every(({ address }) => publicIp(address)) ? {} : { cancel: true })).catch(() => callback({ cancel: true }))
      } catch { callback({ cancel: true }) }
    })
    preview.webContents.on('will-navigate', (event, destination) => { if (destination !== prepared.url) event.preventDefault() })
    try {
      await reservePageFetch(prepared.url)
      await Promise.race([preview.loadURL(prepared.url), new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Rendered page timed out')), 20000))])
      for (let step = 0; step < 8; step++) {
        const html = await preview.webContents.executeJavaScript(`window.scrollTo(0, document.documentElement.scrollHeight * ${(step + 1) / 8}); document.documentElement.outerHTML`) as string
        if (challenge.test(html.slice(0, 10000))) throw new Error('Page presented a challenge; crawl paused')
        snapshots.push(html)
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    } catch (error) {
      if (challenge.test(String(error))) throw error
      // Keep the public HTML response when JavaScript rendering fails.
    } finally { if (!preview.isDestroyed()) preview.destroy() }
    return { url: prepared.url, snapshots }
  })
}

