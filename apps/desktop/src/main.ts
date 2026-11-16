import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises'
import Database from 'better-sqlite3'
import { scanRequestSchema, searchCriteriaSchema, mapsScanSchema, desktopPreferencesSchema, defaultDesktopPreferences, buildPreferencesFile, applyPreferencesFile, type DesktopPreferences } from '@leadsghr/schemas'
import { crawlPublicSite } from '@leadsghr/crawler'
import { createDesktopAdapters, desktopHttp } from './adapters'
import { leadsGhrExportsDirectory, leadsGhrExtensionsDirectory, leadsGhrSettingsDirectory } from './paths'
import { registerCrawlerTest } from './crawler-test'
import { autoUpdater } from 'electron-updater'
import { scanMaps } from './maps-scan'
import { createCrawlRunStore, registerCrawlRunIpc } from './crawl-runs'
import { registerPipelinePages } from './pipeline-pages'
import { abortActiveEmailVerify, registerEmailVerifyIpc } from './email-verify'

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
    adapters = createDesktopAdapters(db, leadsGhrExportsDirectory())
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
  // Email Sending: save the LeadsGhr Mailer extension ZIP (in C:\LeadsGhr\extensions), then confirm with an information dialog.
  ipcMain.handle('leadsghr:mailer:download-extension', async (event) => {
    const source = app.isPackaged
      ? join(process.resourcesPath, 'leadsghr-mailer.zip')
      : join(app.getAppPath(), '../../apps/mailer-extension/leadsghr-mailer.zip')
    const directory = leadsGhrExtensionsDirectory()
    await mkdir(directory, { recursive: true })
    const owner = BrowserWindow.fromWebContents(event.sender)
    const saveOptions = { defaultPath: join(directory, 'leadsghr-mailer.zip'), filters: [{ name: 'ZIP archive', extensions: ['zip'] }] }
    const result = owner ? await dialog.showSaveDialog(owner, saveOptions) : await dialog.showSaveDialog(saveOptions)
    if (result.canceled || !result.filePath) return null
    await copyFile(source, result.filePath)
    const infoOptions = {
      type: 'info' as const,
      title: 'Extension saved',
      message: 'LeadsGhr Mailer extension saved',
      detail: `Saved to ${result.filePath}

Next: extract the ZIP to a folder named leadsghr-mailer, then open chrome://extensions, turn on Developer mode, select Load unpacked, and choose that folder.`,
      buttons: ['Show in folder', 'OK'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    }
    const info = owner ? await dialog.showMessageBox(owner, infoOptions) : await dialog.showMessageBox(infoOptions)
    if (info.response === 0) shell.showItemInFolder(result.filePath)
    return result.filePath
  })
  ipcMain.handle('leadsghr:tracking:download-extension', async () => {
    const source = app.isPackaged
      ? join(process.resourcesPath, 'leadsghr-tracker.zip')
      : join(app.getAppPath(), '../../apps/extension/leadsghr-tracker.zip')
    const directory = leadsGhrExtensionsDirectory()
    await mkdir(directory, { recursive: true })
    const result = await dialog.showSaveDialog({ defaultPath: join(directory, 'leadsghr-tracker.zip'), filters: [{ name: 'ZIP archive', extensions: ['zip'] }] })
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
  // Preferences → Export settings: write the current preferences to C:\LeadsGhr\settings and return the file path.
  ipcMain.handle('leadsghr:preferences:export', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    // The sender's choice of preferences; buildPreferencesFile keeps only known, exportable keys.
    const keys = Array.isArray(input) ? input.filter((key): key is string => typeof key === 'string').slice(0, 100) : undefined
    const preferences = await readPreferences()
    const directory = leadsGhrSettingsDirectory()
    await mkdir(directory, { recursive: true })
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')
    const path = join(directory, `leadsghr-settings-${stamp}.json`)
    const file = buildPreferencesFile(preferences, app.getVersion(), keys)
    await writeFile(path, JSON.stringify(file, null, 2) + '\n', 'utf8')
    return path
  })
  // Preferences → Import settings: pick a JSON file, validate it, save it as the current preferences.
  ipcMain.handle('leadsghr:preferences:import', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    if (!owner) throw new Error('Unexpected caller')
    const result = await dialog.showOpenDialog(owner, {
      title: 'Import LeadsGhr settings',
      defaultPath: leadsGhrSettingsDirectory(),
      properties: ['openFile'],
      filters: [{ name: 'LeadsGhr settings', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const path = result.filePaths[0]
    if ((await stat(path)).size > 1_000_000) throw new Error('That file is too large to be a LeadsGhr settings file.')
    let parsed: unknown
    try { parsed = JSON.parse(await readFile(path, 'utf8')) } catch { throw new Error('That file is not valid JSON.') }
    // Only preferences present in the file and accepted by this version are applied; the rest keep their values.
    const imported = applyPreferencesFile(parsed, await readPreferences())
    const preferences = { ...imported.preferences, scanPublicWebsites: false }
    preferencesWrite = preferencesWrite.catch(() => undefined).then(() => writeFile(join(app.getPath('userData'), 'preferences.json'), JSON.stringify(preferences, null, 2) + '\n', 'utf8'))
    await preferencesWrite
    return { preferences, path, applied: imported.applied.length, skipped: imported.skipped.length, ignored: imported.ignored.length }
  })
  // "Show in folder" for an exported settings file (only files inside C:\LeadsGhr\settings).
  ipcMain.handle('leadsghr:preferences:show-export', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (typeof input !== 'string' || input.length > 1000) throw new Error('Invalid path.')
    const path = resolve(input)
    const directory = resolve(leadsGhrSettingsDirectory())
    if (!path.toLowerCase().startsWith(directory.toLowerCase() + '\\') && !path.toLowerCase().startsWith(directory.toLowerCase() + '/')) throw new Error('Not a settings export.')
    shell.showItemInFolder(path)
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
app.on('before-quit', () => { activeMapsScan?.controller.abort(); abortActiveEmailVerify(); db?.close() })








