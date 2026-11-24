import { tokens } from '@leadsghr/ui/tokens'
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises'
import Database from 'better-sqlite3'
import {
  scanRequestSchema,
  searchCriteriaSchema,
  mapsScanSchema,
  desktopPreferencesSchema,
  defaultDesktopPreferences,
  buildPreferencesFile,
  applyPreferencesFile,
  applyEmailVerifyChecksToPreferences,
  type DesktopPreferences,
  clampDisplaySize,
  DISPLAY_SIZE_STEP,
} from '@leadsghr/schemas'
import { crawlPublicSite } from '@leadsghr/crawler'
import { createDesktopAdapters, desktopHttp } from './adapters'
import {
  leadsGhrExportsDirectory,
  leadsGhrExtensionsDirectory,
  leadsGhrSettingsDirectory,
} from './paths'
import { leadsGhrDataFile, prepareDataFolder } from './data-folder'
import { registerLicenseIpc } from './license'
import { z } from 'zod'
import { registerCrawlerTest } from './crawler-test'
import { autoUpdater } from 'electron-updater'
import { scanMaps } from './maps-scan'
import { createCrawlRunStore, registerCrawlRunIpc } from './crawl-runs'
import { registerScraperIpc } from './scraper-bridge'
import { registerPipelinePages } from './pipeline-pages'
import { abortActiveEmailVerify, registerEmailVerifyIpc } from './email-verify'
import { registerEmailTemplateIpc } from './email-templates'

let db: Database.Database | undefined
let adapters: ReturnType<typeof createDesktopAdapters> | undefined
const localScope = 'local'
let activeMapsScan: { id: string; controller: AbortController } | undefined
let preferencesWrite = Promise.resolve()
let criteriaWrite = Promise.resolve()

async function readPreferences(): Promise<DesktopPreferences> {
  await preferencesWrite.catch(() => undefined)
  try {
    const raw = JSON.parse(await readFile(leadsGhrDataFile('preferences.json'), 'utf8')) as Record<
      string,
      unknown
    >
    const preferences = applyEmailVerifyChecksToPreferences(
      desktopPreferencesSchema.parse({ ...defaultDesktopPreferences, ...raw }),
      {},
    )
    if (/@(?:localhost|.+\.invalid)$/i.test(preferences.emailVerifyMailFrom))
      preferences.emailVerifyMailFrom = defaultDesktopPreferences.emailVerifyMailFrom
    if (/^(?:localhost|.*\.invalid)$/i.test(preferences.emailVerifyEhlo))
      preferences.emailVerifyEhlo = defaultDesktopPreferences.emailVerifyEhlo
    return { ...preferences, scanPublicWebsites: false }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultDesktopPreferences
    throw error
  }
}

function localStore() {
  if (!db) {
    db = new Database(leadsGhrDataFile('leadsghr.sqlite'))
    adapters = createDesktopAdapters(db, leadsGhrExportsDirectory())
  }
  return { db, adapters: adapters! }
}

/** Save a display size chosen with the keyboard, keeping every other preference. */
async function saveDisplaySize(displaySize: number) {
  const preferences = { ...(await readPreferences()), displaySize }
  preferencesWrite = preferencesWrite
    .catch(() => undefined)
    .then(() =>
      writeFile(
        leadsGhrDataFile('preferences.json'),
        JSON.stringify(preferences, null, 2) + '\n',
        'utf8',
      ),
    )
  await preferencesWrite
}

function createWindow(crawlStore: ReturnType<typeof createCrawlRunStore>) {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: tokens['color-surface'], // from packages/ui/src/tokens.css; the page paints its own theme before the window shows
    icon: app.isPackaged
      ? join(process.resourcesPath, 'icons/leadsghr-icon.png')
      : join(__dirname, '../../resources/leadsghr-icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  })
  window.once('ready-to-show', () => {
    window.maximize()
    window.show()
  })
  // Display size (zoom) is a saved preference: applied on load, changed with Ctrl + / Ctrl - / Ctrl 0 or in
  // Settings → Preferences → Appearance. Keyboard changes are saved here and sent to the page so the setting follows.
  window.webContents.on('did-finish-load', () => {
    void readPreferences().then(
      (preferences) => window.webContents.setZoomFactor(preferences.displaySize / 100),
      () => window.webContents.setZoomFactor(1),
    )
  })
  const setDisplaySize = (next: number) => {
    const size = clampDisplaySize(next)
    window.webContents.setZoomFactor(size / 100)
    window.webContents.send('leadsghr:display-size:changed', size)
    void saveDisplaySize(size).catch(() => undefined)
  }
  const currentDisplaySize = () => Math.round(window.webContents.getZoomFactor() * 100)
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return
    const key = input.key.toLowerCase()
    if (key === '0') {
      event.preventDefault()
      setDisplaySize(100)
    } else if (key === '+' || key === '=' || key === 'add') {
      event.preventDefault()
      setDisplaySize(currentDisplaySize() + DISPLAY_SIZE_STEP)
    } else if (key === '-' || key === 'subtract') {
      event.preventDefault()
      setDisplaySize(currentDisplaySize() - DISPLAY_SIZE_STEP)
    }
  })
  registerCrawlerTest(window, desktopHttp)
  registerPipelinePages(window, localStore().db, desktopHttp, crawlStore)
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  // LeadsGhr's data lives in C:\LeadsGhr\data; the first start copies it there from %APPDATA%.
  prepareDataFolder()
  const crawlStore = createCrawlRunStore(localStore().db)
  registerCrawlRunIpc(crawlStore)
  registerScraperIpc(crawlStore)
  registerEmailVerifyIpc(localStore().db)
  registerEmailTemplateIpc()
  // Email Sending: save the LeadsGhr Mailer extension ZIP (in C:\LeadsGhr\extensions), then confirm with an information dialog.
  ipcMain.handle('leadsghr:mailer:download-extension', async (event) => {
    const source = app.isPackaged
      ? join(process.resourcesPath, 'leadsghr-mailer.zip')
      : join(app.getAppPath(), '../../apps/mailer-extension/leadsghr-mailer.zip')
    const directory = leadsGhrExtensionsDirectory()
    await mkdir(directory, { recursive: true })
    const owner = BrowserWindow.fromWebContents(event.sender)
    const saveOptions = {
      defaultPath: join(directory, 'leadsghr-mailer.zip'),
      filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
    }
    const result = owner
      ? await dialog.showSaveDialog(owner, saveOptions)
      : await dialog.showSaveDialog(saveOptions)
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
    const info = owner
      ? await dialog.showMessageBox(owner, infoOptions)
      : await dialog.showMessageBox(infoOptions)
    if (info.response === 0) shell.showItemInFolder(result.filePath)
    return result.filePath
  })
  ipcMain.handle('leadsghr:tracking:download-extension', async () => {
    const source = app.isPackaged
      ? join(process.resourcesPath, 'leadsghr-tracker.zip')
      : join(app.getAppPath(), '../../apps/extension/leadsghr-tracker.zip')
    const directory = leadsGhrExtensionsDirectory()
    await mkdir(directory, { recursive: true })
    const result = await dialog.showSaveDialog({
      defaultPath: join(directory, 'leadsghr-tracker.zip'),
      filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePath) return null
    await copyFile(source, result.filePath)
    return result.filePath
  })
  ipcMain.handle('leadsghr:scan', async (_event, input: unknown) => {
    const { url } = scanRequestSchema.parse(input)
    const { db, adapters } = localStore()
    const id = randomUUID()
    db.prepare('INSERT INTO scan_runs (id,url,status,started_at) VALUES (?,?,?,?)').run(
      id,
      url,
      'running',
      new Date().toISOString(),
    )
    try {
      const result = await crawlPublicSite(adapters.http, url, 'LeadsGhr/0.1 (public-data crawler)')
      const domain = new URL(url).hostname
      const lead = await adapters.storage.saveLead({
        orgId: localScope,
        name: domain,
        domain,
        website: new URL(url).origin,
        emails: result.emails,
        phones: result.phones,
        sourceUrl: url,
        seenAt: new Date().toISOString(),
      })
      db.prepare('UPDATE scan_runs SET status=?,finished_at=?,result_json=? WHERE id=?').run(
        'completed',
        new Date().toISOString(),
        JSON.stringify(result),
        id,
      )
      return { id, lead, result }
    } catch (error) {
      db.prepare('UPDATE scan_runs SET status=?,finished_at=?,error=? WHERE id=?').run(
        'failed',
        new Date().toISOString(),
        String(error),
        id,
      )
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
      void scanMaps(
        query,
        location,
        (update) => {
          if (activeMapsScan?.id === id && !event.sender.isDestroyed())
            event.sender.send('leadsghr:maps-scan:event', { id, update })
        },
        controller.signal,
        preferences.showChromeDuringSearch,
        {
          maps: preferences.searchGoogleMaps,
          googleSearch: preferences.searchGooglePlaces,
          websites: false,
        },
      ).finally(() => {
        if (activeMapsScan?.id === id) activeMapsScan = undefined
      })
    }, 100)
    return id
  })
  ipcMain.handle('leadsghr:maps-scan:stop', (event, id: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (typeof id === 'string' && activeMapsScan?.id === id) activeMapsScan.controller.abort()
  })
  ipcMain.handle('leadsghr:website:open', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender) || typeof input !== 'string')
      throw new Error('Unexpected website request')
    const target = new URL(input)
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password)
      throw new Error('Only public website links can be opened')
    await shell.openExternal(target.toString())
  })
  const criteriaPath = leadsGhrDataFile('search-criteria.json')
  ipcMain.handle('leadsghr:search-criteria:load', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    await criteriaWrite.catch(() => undefined)
    try {
      return searchCriteriaSchema.parse(JSON.parse(await readFile(criteriaPath, 'utf8')))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  })
  ipcMain.handle('leadsghr:search-criteria:save', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    const criteria = searchCriteriaSchema.parse(input)
    criteriaWrite = criteriaWrite
      .catch(() => undefined)
      .then(() => writeFile(criteriaPath, JSON.stringify(criteria, null, 2) + '\n', 'utf8'))
    await criteriaWrite
    return criteria
  })
  // Profile (name, email, avatar) in C:\LeadsGhr\data\profile.json, so it survives reinstalling LeadsGhr.
  const profilePath = leadsGhrDataFile('profile.json')
  const profileSchema = z.object({
    account: z.object({
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.string().trim().email().max(254),
    }),
    avatarSeed: z.string().min(1).max(200),
  })
  let profileWrite = Promise.resolve()
  ipcMain.handle('leadsghr:profile:load', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    await profileWrite.catch(() => undefined)
    try {
      return profileSchema.parse(JSON.parse(await readFile(profilePath, 'utf8')))
    } catch {
      return null
    }
  })
  ipcMain.handle('leadsghr:profile:save', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    const profile = profileSchema.parse(input)
    profileWrite = profileWrite
      .catch(() => undefined)
      .then(() => writeFile(profilePath, JSON.stringify(profile, null, 2) + '\n', 'utf8'))
    await profileWrite
  })
  ipcMain.handle('leadsghr:preferences:load', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    return readPreferences()
  })
  ipcMain.handle('leadsghr:preferences:save', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    const preferences = {
      ...applyEmailVerifyChecksToPreferences(desktopPreferencesSchema.parse(input), {}),
      scanPublicWebsites: false,
    }
    preferencesWrite = preferencesWrite
      .catch(() => undefined)
      .then(() =>
        writeFile(
          leadsGhrDataFile('preferences.json'),
          JSON.stringify(preferences, null, 2) + '\n',
          'utf8',
        ),
      )
    await preferencesWrite
    applyAutoUpdatePreference(preferences.autoUpdate)
    event.sender.setZoomFactor(preferences.displaySize / 100)
    return preferences
  })
  // Preferences → Export settings: write the current preferences to C:\LeadsGhr\settings and return the file path.
  ipcMain.handle('leadsghr:preferences:export', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    // The sender's choice of preferences; buildPreferencesFile keeps only known, exportable keys.
    const keys = Array.isArray(input)
      ? input.filter((key): key is string => typeof key === 'string').slice(0, 100)
      : undefined
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
    if ((await stat(path)).size > 1_000_000)
      throw new Error('That file is too large to be a LeadsGhr settings file.')
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(path, 'utf8'))
    } catch {
      throw new Error('That file is not valid JSON.')
    }
    // Only preferences present in the file and accepted by this version are applied; the rest keep their values.
    const imported = applyPreferencesFile(parsed, await readPreferences())
    const preferences = { ...imported.preferences, scanPublicWebsites: false }
    preferencesWrite = preferencesWrite
      .catch(() => undefined)
      .then(() =>
        writeFile(
          leadsGhrDataFile('preferences.json'),
          JSON.stringify(preferences, null, 2) + '\n',
          'utf8',
        ),
      )
    await preferencesWrite
    applyAutoUpdatePreference(preferences.autoUpdate)
    event.sender.setZoomFactor(preferences.displaySize / 100)
    return {
      preferences,
      path,
      applied: imported.applied.length,
      skipped: imported.skipped.length,
      ignored: imported.ignored.length,
    }
  })
  // "Show in folder" for an exported settings file (only files inside C:\LeadsGhr\settings).
  ipcMain.handle('leadsghr:preferences:show-export', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (typeof input !== 'string' || input.length > 1000) throw new Error('Invalid path.')
    const path = resolve(input)
    const directory = resolve(leadsGhrSettingsDirectory())
    if (
      !path.toLowerCase().startsWith(directory.toLowerCase() + '\\') &&
      !path.toLowerCase().startsWith(directory.toLowerCase() + '/')
    )
      throw new Error('Not a settings export.')
    shell.showItemInFolder(path)
  })
  // License key (shown after the splash screen and in Settings → License).
  registerLicenseIpc()
  // Version and updates (Settings → Preferences → Updates, the update banner, and the splash screen).
  ipcMain.handle('leadsghr:app:version', () => app.getVersion())
  ipcMain.handle('leadsghr:update:status', () => updateState)
  ipcMain.handle('leadsghr:update:check', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (
      !app.isPackaged ||
      updateState.status === 'downloading' ||
      updateState.status === 'downloaded'
    )
      return updateState
    await autoUpdater.checkForUpdates().catch(() => undefined)
    return updateState
  })
  ipcMain.handle('leadsghr:update:install', async (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (!app.isPackaged) return updateState
    if (updateState.status === 'downloaded') {
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      return updateState
    }
    if (updateState.status === 'available' || updateState.status === 'error') {
      installWhenDownloaded = true
      setUpdateState({ ...updateState, status: 'downloading', percent: 0 })
      void autoUpdater.downloadUpdate().catch(() => undefined)
    } else if (updateState.status === 'downloading') installWhenDownloaded = true
    return updateState
  })
  ipcMain.handle('leadsghr:leads', () => localStore().adapters.storage.listLeads(localScope, 500))
  ipcMain.handle('leadsghr:runs', () =>
    localStore()
      .db.prepare(
        'SELECT id,url,status,started_at AS startedAt,finished_at AS finishedAt,error FROM scan_runs ORDER BY started_at DESC LIMIT 100',
      )
      .all(),
  )
  void readPreferences().then(
    (preferences) => startAutoUpdates(preferences.autoUpdate),
    () => startAutoUpdates(true),
  )
  createWindow(crawlStore)
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/** What the app knows about updates; sent to every window as it changes. */
type UpdateState = {
  status:
    | 'unsupported'
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  /** Version being offered or downloaded. */
  version?: string
  /** Download progress, 0–100. */
  percent?: number
  message?: string
  checkedAt?: number
}
let updateState: UpdateState = { status: 'idle' }
let installWhenDownloaded = false

function setUpdateState(next: UpdateState): void {
  updateState = next
  for (const window of BrowserWindow.getAllWindows())
    window.webContents.send('leadsghr:update:event', updateState)
}

/** Apply the Auto-update preference: on, new versions download by themselves; off, they are only announced. */
function applyAutoUpdatePreference(enabled: boolean): void {
  if (app.isPackaged) autoUpdater.autoDownload = enabled
}

/**
 * Auto-update for installed copies: check GitHub Releases (the `publish` target in electron-builder.yml)
 * at start-up and every four hours. The renderer shows the state (banner and Settings → Preferences → Updates):
 * "Update now" downloads when needed and restarts into the new version; a downloaded update also installs
 * when the app closes. LEADSGHR_UPDATE_URL can point at another feed for testing.
 */
function startAutoUpdates(autoDownload: boolean): void {
  if (!app.isPackaged) {
    updateState = {
      status: 'unsupported',
      message: 'Updates work in the installed app, not in development.',
    }
    return
  }
  if (process.env.LEADSGHR_UPDATE_URL)
    autoUpdater.setFeedURL({ provider: 'generic', url: process.env.LEADSGHR_UPDATE_URL })
  applyAutoUpdatePreference(autoDownload)
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => {
    if (updateState.status !== 'downloading' && updateState.status !== 'downloaded')
      setUpdateState({ ...updateState, status: 'checking' })
  })
  autoUpdater.on('update-available', (info) =>
    setUpdateState({
      status: autoUpdater.autoDownload ? 'downloading' : 'available',
      version: info.version,
      percent: 0,
      checkedAt: Date.now(),
    }),
  )
  autoUpdater.on('update-not-available', () =>
    setUpdateState({ status: 'not-available', checkedAt: Date.now() }),
  )
  autoUpdater.on('download-progress', (progress) =>
    setUpdateState({
      ...updateState,
      status: 'downloading',
      percent: Math.round(progress.percent),
    }),
  )
  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({
      status: 'downloaded',
      version: info.version,
      percent: 100,
      checkedAt: Date.now(),
    })
    if (installWhenDownloaded) setImmediate(() => autoUpdater.quitAndInstall(false, true))
  })
  autoUpdater.on('error', (error) => {
    console.warn('[LeadsGhr] Update failed:', error instanceof Error ? error.message : error)
    setUpdateState({
      ...updateState,
      status: 'error',
      message: 'Could not check for updates. Check your internet connection and try again.',
    })
  })
  const check = () => {
    void autoUpdater.checkForUpdates().catch(() => undefined)
  }
  check()
  setInterval(check, 4 * 60 * 60 * 1000)
}

app.on('before-quit', () => {
  activeMapsScan?.controller.abort()
  abortActiveEmailVerify()
  db?.close()
})
