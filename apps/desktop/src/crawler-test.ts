import { ipcMain, type BrowserWindow } from 'electron'
import robotsParser from 'robots-parser'
import { lookup } from 'node:dns/promises'
import { publicIp } from './adapters'
import { scanRequestSchema } from '@leadsghr/schemas'
import type { HttpAdapter } from '@leadsghr/platform'

const AGENT = 'LeadsGhr/0.1 (public-data crawler)'
const challenge = /captcha|unusual traffic|verify you are human|sign in to continue/i
export function registerCrawlerTest(window: BrowserWindow, http: HttpAdapter) {
  let approvedUrl: string | null = null
  window.webContents.on('will-attach-webview', (event, preferences, params) => {
    if (!approvedUrl || params.src !== approvedUrl || !params.partition?.startsWith('crawler-test-')) {
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
      if (url !== approvedUrl) event.preventDefault()
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
    const robotsUrl = new URL('/robots.txt', url).toString()
    const response = await http.get(robotsUrl, { maxBytes: 250_000 })
    if (response.status !== 200 && response.status !== 404) throw new Error('Robots policy unavailable; crawl paused')
    const robots = robotsParser(robotsUrl, response.status === 200 ? response.body : '')
    if (!robots.isAllowed(url, AGENT)) throw new Error('robots.txt disallows crawling this page')
  }

  ipcMain.handle('leadsghr:crawler-test:prepare', async (event, input: unknown) => {
    if (event.sender !== window.webContents) throw new Error('Unexpected caller')
    const { url } = scanRequestSchema.parse(input)
    approvedUrl = null
    await checkRobots(url)
    const response = await http.get(url, { maxBytes: 2_000_000, timeoutMs: 20000 })
    if (new URL(response.url).origin !== new URL(url).origin) await checkRobots(response.url)
    if (response.status !== 200 || !response.contentType.includes('text/html')) throw new Error('Page did not return public HTML')
    if (challenge.test(response.body.slice(0, 10000))) throw new Error('Page presented a challenge; crawl paused')
    approvedUrl = response.url
    return { url: response.url, html: response.body }
  })
}

