import { PREFERENCES_FILE, TEMPLATES_FILE, readDataFile, writeDataFile } from './data-folder'
import type { SavedTemplate, SendHistoryEntry, SendingDraft, SendingPreferences, SendJob } from './types'

const JOB_KEY = 'sendingJob'
const HISTORY_KEY = 'sendingHistory'
const HISTORY_LIMIT = 300
/** Legacy chrome.storage keys; their data moves to the data folder when it is first connected. */
const LEGACY_TEMPLATES_KEY = 'sendingTemplates'
const LEGACY_PREFERENCES_KEY = 'sendingPreferences'
const DRAFT_KEY = 'sendingDraft'

export async function loadJob(): Promise<SendJob | null> {
  const data = await chrome.storage.local.get(JOB_KEY)
  return (data[JOB_KEY] as SendJob | undefined) ?? null
}

export async function saveJob(job: SendJob | null): Promise<void> {
  if (!job) {
    await chrome.storage.local.remove(JOB_KEY)
    return
  }
  await chrome.storage.local.set({ [JOB_KEY]: job })
}

export async function loadHistory(): Promise<SendHistoryEntry[]> {
  const data = await chrome.storage.local.get(HISTORY_KEY)
  return (data[HISTORY_KEY] as SendHistoryEntry[] | undefined) ?? []
}

export async function appendHistory(entry: SendHistoryEntry): Promise<void> {
  const history = await loadHistory()
  await chrome.storage.local.set({ [HISTORY_KEY]: [entry, ...history].slice(0, HISTORY_LIMIT) })
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY)
}

/** Saved templates, read from data/templates.json in the extension folder. */
export async function loadTemplates(): Promise<SavedTemplate[]> {
  const list = await readDataFile<SavedTemplate[]>(TEMPLATES_FILE)
  return Array.isArray(list) ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : []
}

export async function saveTemplate(template: SavedTemplate): Promise<void> {
  const list = (await loadTemplates()).filter((item) => item.id !== template.id)
  await writeDataFile(TEMPLATES_FILE, [...list, { ...template, updatedAt: Date.now() }])
}

export async function deleteTemplate(id: string): Promise<void> {
  await writeDataFile(TEMPLATES_FILE, (await loadTemplates()).filter((item) => item.id !== id))
}

/**
 * Moves templates and preferences that older builds kept in chrome.storage into the data folder,
 * only when the folder has no file for them yet. Returns how many templates were moved.
 */
export async function migrateLegacyData(): Promise<number> {
  const legacy = await chrome.storage.local.get([LEGACY_TEMPLATES_KEY, LEGACY_PREFERENCES_KEY])
  let moved = 0
  const templates = legacy[LEGACY_TEMPLATES_KEY] as SavedTemplate[] | undefined
  if (templates?.length && !(await readDataFile(TEMPLATES_FILE))) {
    await writeDataFile(TEMPLATES_FILE, templates)
    moved = templates.length
  }
  const preferences = legacy[LEGACY_PREFERENCES_KEY] as Partial<SendingPreferences> | undefined
  if (preferences && !(await readDataFile(PREFERENCES_FILE))) {
    await writeDataFile(PREFERENCES_FILE, { delayMode: preferences.delayMode === 'steps' ? 'steps' : 'between' })
  }
  await chrome.storage.local.remove([LEGACY_TEMPLATES_KEY, LEGACY_PREFERENCES_KEY])
  return moved
}

export async function loadDraft(): Promise<SendingDraft | null> {
  const data = await chrome.storage.local.get(DRAFT_KEY)
  return (data[DRAFT_KEY] as SendingDraft | undefined) ?? null
}

export async function saveDraft(draft: SendingDraft): Promise<void> {
  await chrome.storage.local.set({ [DRAFT_KEY]: draft })
}

export const defaultSendingPreferences: SendingPreferences = { delayMode: 'between' }

/** Preferences, read from data/preferences.json in the extension folder. */
export async function loadSendingPreferences(): Promise<SendingPreferences> {
  const stored = await readDataFile<Partial<SendingPreferences>>(PREFERENCES_FILE)
  return { delayMode: stored?.delayMode === 'steps' ? 'steps' : 'between' }
}

export async function saveSendingPreferences(preferences: SendingPreferences): Promise<void> {
  await writeDataFile(PREFERENCES_FILE, preferences)
}
