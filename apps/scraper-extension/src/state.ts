import { scraperJobSchema, type ScraperJob, type ScraperProgress } from '@leadsghr/schemas'
import { readDataFile } from './data-folder'
import type { Counts } from './engine'

/*
 * How the popup and the settings page work together. The run lives on the settings page (it stays open while the
 * Scraper works; a popup closes as soon as it loses focus). The popup sends commands through chrome.storage.local
 * (COMMAND_KEY); the settings page reports progress there (PROGRESS_KEY, written by the engine). Only short-lived
 * run state is kept in Chrome storage; the job and results are files in the data folder.
 */

export const COMMAND_KEY = 'scraper.command'
export type Command = { action: 'start' | 'pause' | 'stop'; at: number }
export type StoredProgress = ScraperProgress & { counts?: Counts; startedAt?: number; page?: number }

export async function readJob(): Promise<ScraperJob | null> {
  const parsed = scraperJobSchema.safeParse(await readDataFile('job.json'))
  return parsed.success ? parsed.data : null
}

export async function sendCommand(action: Command['action']) {
  await chrome.storage.local.set({ [COMMAND_KEY]: { action, at: Date.now() } satisfies Command })
}

/** The settings page tab, if it is open. */
export async function settingsTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ url: chrome.runtime.getURL('settings.html') + '*' })
  return tab
}

/** Starts a run: tells an open settings page, or opens one in the background that starts by itself. */
export async function startRun() {
  await sendCommand('start')
  if (!(await settingsTab()))
    await chrome.tabs.create({ url: chrome.runtime.getURL('settings.html?autostart=1'), active: false })
}

export const elapsedClock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const mm = String(Math.floor(seconds / 60) % 60).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** True while a run is really going: running or waiting, and updated in the last 90 seconds. A run whose Scraper tab
 *  was closed stops updating and then counts as paused (it can be resumed). */
export const isLive = (progress: StoredProgress | null | undefined) =>
  !!progress &&
  (progress.state === 'running' || progress.state === 'waiting') &&
  Date.now() - Date.parse(progress.updatedAt) < 90_000
