/*
 * LeadsGhr Mailer keeps its data (saved templates, preferences) as JSON files in the extension's own folder:
 *   C:\LeadsGhr\extensions\leadsghr-mailer\data\
 * Files there survive clearing Chrome's storage and are kept by the packaging script on every rebuild.
 *
 * Reading: every extension page and the background worker fetch the files from the extension's own URL
 * (chrome-extension://<id>/data/...). Chrome serves an unpacked extension straight from its folder, so no
 * permission is needed and the latest file is returned.
 * Writing: Chrome extensions cannot write files on their own, so the settings page asks the user once to choose
 * that data folder (File System Access API). The folder handle is remembered in IndexedDB; Chrome may ask the
 * user to allow access again in a later session, which happens on the next Save.
 */

export const DATA_FOLDER_PATH = 'C:\\LeadsGhr\\extensions\\leadsghr-mailer\\data'
export const TEMPLATES_FILE = 'templates.json'
export const PREFERENCES_FILE = 'preferences.json'
/** chrome.storage.local key bumped after every write so open pages re-read the files (it holds no data). */
export const DATA_CHANGED_KEY = 'mailerDataChangedAt'

type Permission = 'granted' | 'denied' | 'prompt'
type DirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>
}
type PickerWindow = Window & { showDirectoryPicker(options?: { id?: string; mode?: 'readwrite'; startIn?: string }): Promise<DirectoryHandle> }

export type DataFolderState = 'connected' | 'needs-permission' | 'not-connected'

const DB_NAME = 'leadsghr-mailer'
const STORE = 'handles'
const HANDLE_KEY = 'data-folder'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storedHandle(): Promise<DirectoryHandle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(HANDLE_KEY)
    request.onsuccess = () => resolve((request.result as DirectoryHandle | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function storeHandle(handle: DirectoryHandle): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(handle, HANDLE_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/** Reads a JSON file from the data folder; null when it does not exist yet or cannot be parsed. */
export async function readDataFile<T>(name: string): Promise<T | null> {
  try {
    const response = await fetch(chrome.runtime.getURL(`data/${name}`), { cache: 'no-store' })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

export async function dataFolderState(): Promise<DataFolderState> {
  const handle = await storedHandle().catch(() => null)
  if (!handle) return 'not-connected'
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'connected' : 'needs-permission'
}

/** True when the chosen folder is this extension's own data folder (a file written there is served by the extension). */
async function isExtensionDataFolder(handle: DirectoryHandle): Promise<boolean> {
  const name = 'folder-check.txt'
  const token = crypto.randomUUID()
  const file = await handle.getFileHandle(name, { create: true })
  const writer = await file.createWritable()
  await writer.write(token)
  await writer.close()
  try {
    const response = await fetch(chrome.runtime.getURL(`data/${name}`), { cache: 'no-store' })
    return response.ok && (await response.text()).trim() === token
  } catch {
    return false
  } finally {
    await handle.removeEntry(name).catch(() => undefined)
  }
}

/** Asks the user to choose the data folder (needs a click). Rejects folders that are not this extension's data folder. */
export async function connectDataFolder(): Promise<void> {
  const picker = (window as unknown as Partial<PickerWindow>).showDirectoryPicker
  if (!picker) throw new Error('This Chrome version cannot open a folder picker.')
  const handle = await picker.call(window, { id: 'leadsghr-mailer-data', mode: 'readwrite', startIn: 'desktop' })
  if (!(await isExtensionDataFolder(handle))) {
    throw new Error(`That is not the LeadsGhr Mailer data folder. Choose ${DATA_FOLDER_PATH}.`)
  }
  await storeHandle(handle)
}

/** The data folder with write access, asking for it when needed (call from a click so Chrome can show its prompts). */
async function writableFolder(): Promise<DirectoryHandle> {
  let handle = await storedHandle().catch(() => null)
  if (!handle) {
    await connectDataFolder()
    handle = await storedHandle()
    if (!handle) throw new Error('No data folder was chosen.')
  }
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted'
    && (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
    throw new Error(`Chrome needs permission to save to ${DATA_FOLDER_PATH}. Select Allow and try again.`)
  }
  return handle
}

/** Writes a JSON file to the data folder, then tells open pages to re-read their files. */
export async function writeDataFile(name: string, value: unknown): Promise<void> {
  const folder = await writableFolder()
  const file = await folder.getFileHandle(name, { create: true })
  const writer = await file.createWritable()
  await writer.write(JSON.stringify(value, null, 2))
  await writer.close()
  await chrome.storage.local.set({ [DATA_CHANGED_KEY]: Date.now() })
}
