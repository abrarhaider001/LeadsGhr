import { app } from 'electron'
import { join } from 'node:path'

/**
 * User-visible LeadsGhr folder for files the user opens directly: CSV exports and the Chrome
 * extension ZIP. On Windows this is `C:\LeadsGhr` (on the system drive); elsewhere it falls back
 * to `Documents/LeadsGhr`. Preferences and SQLite stay in Electron's user-data directory.
 */
export function leadsGhrRoot(): string {
  if (process.platform === 'win32') return join(`${process.env.SystemDrive ?? 'C:'}\\`, 'LeadsGhr')
  return join(app.getPath('documents'), 'LeadsGhr')
}

export const leadsGhrExportsDirectory = (): string => join(leadsGhrRoot(), 'exports')
export const leadsGhrExtensionsDirectory = (): string => join(leadsGhrRoot(), 'extensions')
