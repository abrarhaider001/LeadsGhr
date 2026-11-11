import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import Database from 'better-sqlite3'
import { scanRequestSchema, searchCriteriaSchema, mapsScanSchema, desktopPreferencesSchema, defaultDesktopPreferences, type DesktopPreferences } from '@leadsghr/schemas'
import { crawlPublicSite } from '@leadsghr/crawler'
import { createDesktopAdapters, desktopHttp } from './adapters'
import { registerCrawlerTest } from './crawler-test'
import { autoUpdater } from 'electron-updater'
import { scanMaps } from './maps-scan'
import { createCrawlRunStore, registerCrawlRunIpc } from './crawl-runs'
import { registerPipelinePages } from './pipeline-pages'
import { abortActiveEmailVerify, registerEmailVerifyIpc } from './email-verify'
import { closeLocalEmailTracking, registerLocalEmailTracking } from './local-email-tracking'

let db: Database.Database | undefined
let adapters: ReturnType<typeof createDesktopAdapters> | undefined
const localScope = 'local'
let activeMapsScan: { id: string; controller: AbortController } | undefined
let preferencesWrite = Promise.resolve()
let criteriaWrite = Promise.resolve()

async function readPreferences(): Promise<DesktopPreferences> {
  await preferencesWrite.catch(() => undefined)
  try {
    const raw = JSON.parse(await readFile(join(app.getPath('userData'), 'preferences.json'), 'utf8')) as Record<string, unknown>
    const preferences = desktopPreferencesSchema.parse({ ...defaultDesktopPreferences, ...raw })
    if (/@(?:localhost|.+\.invalid)$/i.test(preferences.emailVerifyMailFrom)) preferences.emailVerifyMailFrom = defaultDesktopPreferences.emailVerifyMailFrom
    if (/^(?:localhost|.*\.invalid)$/i.test(preferences.emailVerifyEhlo)) preferences.emailVerifyEhlo = defaultDesktopPreferences.emailVerifyEhlo
    return { ...preferences, scanPublicWebsites: false }
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultDesktopPreferences; throw error }
}


function localStore() {
  if (!db) {
    db = new Database(join(app.getPath('userData'), 'leadsghr.sqlite'))
    adapters = createDesktopAdapters(db, app.getPath('userData'))
  }
  return { db, adapters: adapters! }
}

function createWindow(crawlStore: ReturnType<typeof createCrawlRunStore>) {
  const window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 800, minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#FFFFFF',
    icon: app.isPackaged
      ? join(process.resourcesPath, 'icons/leadsghr-icon.png')
      : join(__dirname, '../../resources/leadsghr-icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: true,
    },
  })
  window.once('ready-to-show', () => { window.maximize(); window.show() })
  window.webContents.on('did-finish-load', () => window.webContents.setZoomFactor(1))
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return
    const key = input.key.toLowerCase()
    if (key === '0') {
      event.preventDefault()
      window.webContents.setZoomFactor(1)
    } else if (key === '+' || key === '=' || key === 'add') {
      event.preventDefault()
      window.webContents.setZoomFactor(Math.min(2, Math.round((window.webContents.getZoomFactor() + 0.1) * 10) / 10))
    } else if (key === '-' || key === 'subtract') {
      event.preventDefault()
      window.webContents.setZoomFactor(Math.max(0.7, Math.round((window.webContents.getZoomFactor() - 0.1) * 10) / 10))
    }
  })
  registerCrawlerTest(window, desktopHttp)
  registerPipelinePages(window, localStore().db, desktopHttp, crawlStore)
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  const crawlStore = createCrawlRunStore(localStore().db)
  registerCrawlRunIpc(crawlStore)
  registerEmailVerifyIpc(localStore().db)
  await registerLocalEmailTracking(localStore().db)
  ipcMain.handle('leadsghr:tracking:download-extension', async () => {
    const source = app.isPackaged
      ? join(process.resourcesPath, 'leadsghr-mail-tracking.zip')
      : join(app.getAppPath(), '../../apps/extension/leadsghr-mail-tracking.zip')
    const result = await dialog.showSaveDialog({ defaultPath: 'leadsghr-mail-tracking.zip', filters: [{ name: 'ZIP archive', extensions: ['zip'] }] })
    if (result.canceled || !result.filePath) return null
    await copyFile(source, result.filePath)
    return result.filePath
  })
  ipcMain.handle('leadsghr:scan', async (_event, input: unknown) => {
    const { url } = scanRequestSchema.parse(input)
    const { db, adapters } = localStore()
    const id = randomUUID()
    db.prepare('INSERT INTO scan_runs (id,url,status,started_at) VALUES (?,?,?,?)').run(id, url, 'running', new Date().toISOString())
    try {
      const result = await crawlPublicSite(adapters.http, url, 'LeadsGhr/0.1 (public-data crawler)')
      const domain = new URL(url).hostname
      const lead = await adapters.storage.saveLead({
        orgId: localScope, name: domain, domain, website: new URL(url).origin,
        emails: result.emails, phones: result.phones, sourceUrl: url, seenAt: new Date().toISOString(),
      })
      db.prepare('UPDATE scan_runs SET status=?,finished_at=?,result_json=? WHERE id=?')
        .run('completed', new Date().toISOString(), JSON.stringify(result), id)
      return { id, lead, result }
    } catch (error) {
      db.prepare('UPDATE scan_runs SET status=?,finished_at=?,error=? WHERE id=?')
        .run('failed', new Date().toISOString(), String(error), id)
      throw error
    }
  })
  ipcMain.handle('leadsghr:maps-scan:start', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    const { query, location } = mapsScanSchema.parse(input)
    const preferences = await readPreferences()
    activeMapsScan?.controller.abort()
    const id = randomUUID()
    const controller = new AbortController()
    activeMapsScan = { id, controller }
    setTimeout(() => {
      void scanMaps(query, location, (update) => {
        if (activeMapsScan?.id === id && !event.sender.isDestroyed()) event.sender.send('leadsghr:maps-scan:event', { id, update })
      }, controller.signal, preferences.showChromeDuringSearch, { maps: preferences.searchGoogleMaps, websites: false }).finally(() => { if (activeMapsScan?.id === id) activeMapsScan = undefined })
    }, 100)
    return id
  })
  ipcMain.handle('leadsghr:maps-scan:stop', (event, id: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (typeof id === 'string' && activeMapsScan?.id === id) activeMapsScan.controller.abort()
  })
  ipcMain.handle('leadsghr:website:open', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender) || typeof input !== 'string') throw new Error('Unexpected website request')
    const target = new URL(input)
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Only public website links can be opened')
    await shell.openExternal(target.toString())
  })
  const criteriaPath = join(app.getPath('userData'), 'search-criteria.json')
  ipcMain.handle('leadsghr:search-criteria:load', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    await criteriaWrite.catch(() => undefined)
    try { return searchCriteriaSchema.parse(JSON.parse(await readFile(criteriaPath, 'utf8'))) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
  })
  ipcMain.handle('leadsghr:search-criteria:save', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    const criteria = searchCriteriaSchema.parse(input)
    criteriaWrite = criteriaWrite.catch(() => undefined).then(() => writeFile(criteriaPath, JSON.stringify(criteria, null, 2) + '\n', 'utf8'))
    await criteriaWrite
    return criteria
  })
  ipcMain.handle('leadsghr:preferences:load', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    return readPreferences()
  })
  ipcMain.handle('leadsghr:preferences:save', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    const preferences = { ...desktopPreferencesSchema.parse(input), scanPublicWebsites: false }
    preferencesWrite = preferencesWrite.catch(() => undefined).then(() => writeFile(join(app.getPath('userData'), 'preferences.json'), JSON.stringify(preferences, null, 2) + '\n', 'utf8'))
    await preferencesWrite
    return preferences
  })
  ipcMain.handle('leadsghr:leads', () => localStore().adapters.storage.listLeads(localScope, 500))
  ipcMain.handle('leadsghr:runs', () => localStore().db.prepare('SELECT id,url,status,started_at AS startedAt,finished_at AS finishedAt,error FROM scan_runs ORDER BY started_at DESC LIMIT 100').all())
  if (app.isPackaged && process.env.LEADSGHR_UPDATE_URL) {
    autoUpdater.setFeedURL({ provider: 'generic', url: process.env.LEADSGHR_UPDATE_URL })
    void autoUpdater.checkForUpdatesAndNotify().catch(() => undefined)
  }
  createWindow(crawlStore)
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { activeMapsScan?.controller.abort(); abortActiveEmailVerify(); closeLocalEmailTracking(); db?.close() })








