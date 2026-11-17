import { DatabaseSync, backup as backupDatabase } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// LeadsGhr keeps its database in C:\LeadsGhr\data (or LEADSGHR_DATA_DIR); versions before the data folder
// kept it in %APPDATA%\@leadsghr\desktop.
const dataFolder = process.env.LEADSGHR_DATA_DIR || join(`${process.env.SystemDrive ?? 'C:'}\\`, 'LeadsGhr', 'data')
const legacy = process.env.APPDATA ? join(process.env.APPDATA, '@leadsghr', 'desktop', 'leadsghr.sqlite') : undefined
const path = existsSync(join(dataFolder, 'leadsghr.sqlite')) || !legacy ? join(dataFolder, 'leadsghr.sqlite') : legacy
if (!existsSync(path)) {
  console.log(`No local crawl database found at ${path}`)
  process.exit(0)
}

const db = new DatabaseSync(path, { timeout: 3000 })
const tables = ['pipeline_pages', 'pipeline_email_filters', 'crawl_exports', 'crawl_run_rows', 'crawl_runs', 'scan_runs']
try {
  const present = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(({ name }) => name))
  const counts = Object.fromEntries(tables.filter((table) => present.has(table)).map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]))
  if (!Object.values(counts).some(Boolean)) console.log('Crawl and pipeline history is already empty.')
  else {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
    const backup = join(dataRoot, '@leadsghr', 'desktop', `leadsghr-before-history-clear-${stamp}.sqlite`)
    await backupDatabase(db, backup)
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const table of tables) if (present.has(table)) db.prepare(`DELETE FROM ${table}`).run()
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    console.log('Deleted local crawl history:', counts)
    console.log(`Database backup: ${backup}`)
    console.log('Preferences, saved selections, leads, and CSV files on disk were preserved.')
  }
} finally {
  db.close()
}
