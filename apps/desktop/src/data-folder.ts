import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { leadsGhrDataDirectory } from './paths'

/** Files LeadsGhr keeps in its data folder (the database with its WAL files, settings, and profile). */
const DATA_FILES = [
  'leadsghr.sqlite',
  'leadsghr.sqlite-wal',
  'leadsghr.sqlite-shm',
  'preferences.json',
  'search-criteria.json',
  'email-templates.json',
] as const

let dataDirectory: string | undefined

/**
 * Folder that holds LeadsGhr's own data: `C:\LeadsGhr\data` on Windows (next to exports, extensions,
 * and settings), so it is easy to find and back up and survives uninstalling and reinstalling LeadsGhr.
 * Call `prepareDataFolder()` once at start-up before reading it.
 */
export function leadsGhrData(): string {
  return dataDirectory ?? prepareDataFolder()
}

export const leadsGhrDataFile = (name: string): string => join(leadsGhrData(), name)

/**
 * Creates the data folder and, the first time a version with it starts, copies data from the old
 * location (Electron's user-data folder, `%APPDATA%\@leadsghr\desktop`) into it. Only files the data
 * folder does not have yet are copied, so an existing folder (for example after a reinstall) is never
 * overwritten; the old files stay where they were as a backup. Falls back to the old location if the
 * data folder cannot be created.
 */
export function prepareDataFolder(): string {
  if (dataDirectory) return dataDirectory
  const legacy = app.getPath('userData')
  const target = leadsGhrDataDirectory()
  try {
    mkdirSync(target, { recursive: true })
  } catch (error) {
    console.warn(
      '[LeadsGhr] Could not create the data folder; using',
      legacy,
      error instanceof Error ? error.message : error,
    )
    dataDirectory = legacy
    return dataDirectory
  }
  // Copy the database only together with its WAL files, and only when the data folder has no database yet.
  const copyDatabase =
    !existsSync(join(target, 'leadsghr.sqlite')) && existsSync(join(legacy, 'leadsghr.sqlite'))
  for (const name of DATA_FILES) {
    const from = join(legacy, name)
    const to = join(target, name)
    if (name.startsWith('leadsghr.sqlite') && !copyDatabase) continue
    if (!existsSync(from) || existsSync(to)) continue
    try {
      copyFileSync(from, to)
    } catch (error) {
      console.warn(
        '[LeadsGhr] Could not copy',
        from,
        error instanceof Error ? error.message : error,
      )
    }
  }
  dataDirectory = target
  return dataDirectory
}
