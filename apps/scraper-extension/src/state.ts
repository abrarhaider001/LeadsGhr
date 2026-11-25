import {
  SCRAPER_FORMAT_VERSION,
  SCRAPER_JOBS_FILE,
  SCRAPER_LEGACY_JOB_FILE,
  SCRAPER_REMOVED_FILE,
  scraperRemovedJobsSchema,
  visibleScraperJobs,
  type ScraperJob,
  type ScraperProgress,
} from '@leadsghr/schemas'
import { readDataFile, writeDataFile } from './data-folder'
import type { Counts } from './engine'

/*
 * How the popup and the settings page work together. The run lives on the settings page (it stays open while the
 * Scraper works; a popup closes as soon as it loses focus). The popup sends commands through chrome.storage.local
 * (COMMAND_KEY); the settings page reports progress there (PROGRESS_KEY, written by the engine). Only short-lived
 * run state is kept in Chrome storage (the live run, each job's counts, and which job is picked); the jobs and results
 * are files in the data folder.
 */

export const COMMAND_KEY = 'scraper.command'
export type Command = { action: 'start' | 'pause' | 'stop'; jobId?: string; at: number }
export type StoredProgress = ScraperProgress & { counts?: Counts; startedAt?: number; page?: number }

/** The live run (any job), written by the engine while it works. */
export const PROGRESS_KEY = 'scraper.progress'
/** The last status and counts of one job, so every job in the list shows its own. */
export const JOB_PROGRESS_KEY = (jobId: string) => `scraper.job.${jobId}`
export const DONE_KEY = (jobId: string) => `scraper.done.${jobId}`
/** The job picked in the popup or on the settings page. */
export const SELECTED_KEY = 'scraper.selectedJob'

/** The saved jobs sent from the desktop app, newest first (removed ones left out). */
export async function readJobs(): Promise<ScraperJob[]> {
  const [list, legacy, removed] = await Promise.all([
    readDataFile(SCRAPER_JOBS_FILE),
    readDataFile(SCRAPER_LEGACY_JOB_FILE),
    readDataFile(SCRAPER_REMOVED_FILE),
  ])
  return visibleScraperJobs(list, legacy, removed)
}

/** The picked job's id, or the newest job when none is picked (or the picked one is gone). */
export async function selectedJobId(jobs: ScraperJob[]): Promise<string> {
  const picked = (await chrome.storage.local.get(SELECTED_KEY))[SELECTED_KEY] as string | undefined
  return jobs.find((job) => job.id === picked)?.id ?? jobs[0]?.id ?? ''
}

export async function selectJob(jobId: string) {
  await chrome.storage.local.set({ [SELECTED_KEY]: jobId })
}

/** The job's last status: its own record, or the live run when that was this job (earlier versions kept only that). */
export async function readJobProgress(jobId: string): Promise<StoredProgress | null> {
  const stored = await chrome.storage.local.get([JOB_PROGRESS_KEY(jobId), PROGRESS_KEY])
  const own = stored[JOB_PROGRESS_KEY(jobId)] as StoredProgress | undefined
  const live = stored[PROGRESS_KEY] as StoredProgress | undefined
  return own ?? (live?.jobId === jobId ? live : null)
}

/** Hides a job from the list (the desktop app keeps its run and the rows already saved). Needs the data folder. */
export async function removeJob(jobId: string) {
  const parsed = scraperRemovedJobsSchema.safeParse(await readDataFile(SCRAPER_REMOVED_FILE))
  const ids = parsed.success ? parsed.data.ids : []
  if (!ids.includes(jobId)) await writeDataFile(SCRAPER_REMOVED_FILE, { version: SCRAPER_FORMAT_VERSION, ids: [...ids, jobId] })
  await chrome.storage.local.remove([JOB_PROGRESS_KEY(jobId), DONE_KEY(jobId)])
}

export async function sendCommand(action: Command['action'], jobId?: string) {
  await chrome.storage.local.set({ [COMMAND_KEY]: { action, jobId, at: Date.now() } satisfies Command })
}

/** The settings page tab, if it is open. */
export async function settingsTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ url: chrome.runtime.getURL('settings.html') + '*' })
  return tab
}

/** Starts a run: tells an open settings page, or opens one in the background that starts by itself. */
export async function startRun(jobId: string) {
  await selectJob(jobId)
  await sendCommand('start', jobId)
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
