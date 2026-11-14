import type { SendHistoryEntry, SendJob } from './types'

const JOB_KEY = 'sendingJob'
const HISTORY_KEY = 'sendingHistory'
const HISTORY_LIMIT = 300

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
