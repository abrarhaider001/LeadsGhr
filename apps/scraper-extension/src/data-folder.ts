/*
 * LeadsGhr Scraper's data folder (AGENTS.md, "Extension data"): C:\LeadsGhr\extensions\leadsghr-scraper\data
 * The desktop app writes job.json there; the Scraper writes progress.json and results/<jobId>/<n>.json.
 *
 * Reading: extension pages fetch the files from the extension's own URL (Chrome serves an unpacked extension straight
 * from its folder). Writing: Chrome extensions cannot write files on their own, so the Scraper page asks the user once
 * to choose that folder (File System Access API); the handle is remembered in IndexedDB. Same approach as LeadsGhr
 * Mailer (apps/mailer-extension/src/email-sending/data-folder.ts).
 */

export const DATA_FOLDER_PATH = 'C:\\LeadsGhr\\extensions\\leadsghr-scraper\\data'

type Permission = 'granted' | 'denied' | 'prompt'
type DirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>
}
type PickerWindow = Window & {
  showDirectoryPicker(options?: { id?: string; mode?: 'readwrite'; startIn?: string }): Promise<DirectoryHandle>
}
export type DataFolderState = 'connected' | 'needs-permission' | 'not-connected'

const DB_NAME = 'leadsghr-scraper'
const STORE = 'handles'
const HANDLE_KEY = 'data-folder'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
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
export async function readDataFile<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(chrome.runtime.getURL(`data/${path}`), { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function dataFolderState(): Promise<DataFolderState> {
  const handle = await storedHandle().catch(() => null)
  if (!handle) return 'not-connected'
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted'
    ? 'connected'
    : 'needs-permission'
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
  const handle = await picker.call(window, { id: 'leadsghr-scraper-data', mode: 'readwrite', startIn: 'desktop' })
  if (!(await isExtensionDataFolder(handle)))
    throw new Error(`That is not the LeadsGhr Scraper data folder. Choose ${DATA_FOLDER_PATH}.`)
  await storeHandle(handle)
}

/** The data folder with write access, asking for it when needed (call from a click so Chrome can show its prompts). */
export async function writableFolder(): Promise<DirectoryHandle> {
  let handle = await storedHandle().catch(() => null)
  if (!handle) {
    await connectDataFolder()
    handle = await storedHandle()
    if (!handle) throw new Error('No data folder was chosen.')
  }
  if (
    (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted' &&
    (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted'
  )
    throw new Error(`Chrome needs permission to save to ${DATA_FOLDER_PATH}. Select Allow and try again.`)
  return handle
}

/** Writes a JSON file (path may contain folders, created as needed). Writes a temporary file first, then renames it,
 *  so the desktop app never reads a half-written file. */
export async function writeDataFile(path: string, value: unknown): Promise<void> {
  let folder: FileSystemDirectoryHandle = await writableFolder()
  const parts = path.split('/')
  const name = parts.pop()!
  for (const part of parts) folder = await folder.getDirectoryHandle(part, { create: true })
  const temporary = await folder.getFileHandle(`${name}.tmp`, { create: true })
  const writer = await temporary.createWritable()
  await writer.write(JSON.stringify(value, null, 2))
  await writer.close()
  const movable = temporary as FileSystemFileHandle & { move?(name: string): Promise<void> }
  if (typeof movable.move === 'function') {
    await folder.removeEntry(name).catch(() => undefined)
    await movable.move(name)
  } else {
    const file = await folder.getFileHandle(name, { create: true })
    const direct = await file.createWritable()
    await direct.write(JSON.stringify(value, null, 2))
    await direct.close()
    await folder.removeEntry(`${name}.tmp`).catch(() => undefined)
  }
}
