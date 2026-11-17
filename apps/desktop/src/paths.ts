import { app } from 'electron'
import { join } from 'node:path'

/**
 * User-visible LeadsGhr folder: CSV exports, the Chrome extensions, exported settings, and LeadsGhr's
 * own data (database, preferences, profile) in `data`. On Windows this is `C:\LeadsGhr` (on the system
 * drive); elsewhere it falls back to `Documents/LeadsGhr`. Electron's caches stay in its user-data folder.
 */
export function leadsGhrRoot(): string {
  if (process.platform === 'win32') return join(`${process.env.SystemDrive ?? 'C:'}\\`, 'LeadsGhr')
  return join(app.getPath('documents'), 'LeadsGhr')
}

export const leadsGhrExportsDirectory = (): string => join(leadsGhrRoot(), 'exports')
export const leadsGhrExtensionsDirectory = (): string => join(leadsGhrRoot(), 'extensions')
/**
 * LeadsGhr's data: the SQLite database, preferences.json, search-criteria.json, and profile.json.
 * LEADSGHR_DATA_DIR points it elsewhere, for example a separate folder for performance tests.
 */
export const leadsGhrDataDirectory = (): string => process.env.LEADSGHR_DATA_DIR || join(leadsGhrRoot(), 'data')
/** Exported preference files (Preferences → Export settings). */
export const leadsGhrSettingsDirectory = (): string => join(leadsGhrRoot(), 'settings')
