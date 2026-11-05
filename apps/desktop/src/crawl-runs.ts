import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import Database from 'better-sqlite3'
import { crawlRowsToCsv } from '@leadsghr/export'
import { filterEmails } from '@leadsghr/quality'
import { createCrawlRunSchema, crawlRunIdSchema, crawlRunProgressSchema, crawlRunRowInputSchema, type CrawlExport, type CrawlRow, type CrawlRunDetail, type CrawlRunSummary, type CreateCrawlRun } from '@leadsghr/schemas'

type StoredRun = { id: string; name: string; provider: CrawlRunSummary['provider']; kind: CrawlRunSummary['kind']; criteria_json: string; preferences_json: string; searches_json: string; state_start_number: number; state_end_number: number; started_at: string; finished_at: string | null; status: CrawlRunSummary['status']; next_query_index: number; error: string | null }
type StoredExport = { id: string; run_id: string; file_name: string; file_path: string; file_size: number; entry_count: number; exported_at: string }

export function createCrawlRunStore(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS crawl_runs (id TEXT PRIMARY KEY, criteria_json TEXT NOT NULL, preferences_json TEXT NOT NULL, searches_json TEXT NOT NULL, state_start_number INTEGER NOT NULL, state_end_number INTEGER NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL, next_query_index INTEGER NOT NULL DEFAULT 0, error TEXT);
    CREATE TABLE IF NOT EXISTS crawl_run_rows (run_id TEXT NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE, row_key TEXT NOT NULL, payload TEXT NOT NULL, first_seen_at TEXT NOT NULL, PRIMARY KEY (run_id, row_key));
    CREATE TABLE IF NOT EXISTS crawl_exports (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE, file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_size INTEGER NOT NULL, entry_count INTEGER NOT NULL, exported_at TEXT NOT NULL, csv_bytes BLOB);
    CREATE TABLE IF NOT EXISTS pipeline_email_filters (run_id TEXT NOT NULL, row_key TEXT NOT NULL, original_emails_json TEXT NOT NULL, rejected_json TEXT NOT NULL, filtered_at TEXT NOT NULL, PRIMARY KEY (run_id,row_key));
    CREATE INDEX IF NOT EXISTS crawl_runs_started_idx ON crawl_runs(started_at DESC);
    CREATE INDEX IF NOT EXISTS crawl_exports_run_idx ON crawl_exports(run_id, exported_at DESC);`)
  const exportColumns = db.pragma('table_info(crawl_exports)') as { name: string }[]
  if (!exportColumns.some((column) => column.name === 'csv_bytes')) db.exec('ALTER TABLE crawl_exports ADD COLUMN csv_bytes BLOB')
  const runColumns = db.pragma('table_info(crawl_runs)') as { name: string }[]
  if (!runColumns.some((column) => column.name === 'name')) db.exec("ALTER TABLE crawl_runs ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled pipeline'")
  if (!runColumns.some((column) => column.name === 'provider')) db.exec("ALTER TABLE crawl_runs ADD COLUMN provider TEXT NOT NULL DEFAULT 'google-maps'")
  if (!runColumns.some((column) => column.name === 'kind')) db.exec("ALTER TABLE crawl_runs ADD COLUMN kind TEXT NOT NULL DEFAULT 'search'")
  db.prepare("UPDATE crawl_runs SET status='stopped', finished_at=COALESCE(finished_at, ?) WHERE status='running'").run(new Date().toISOString())

  const stored = (id: string) => db.prepare('SELECT * FROM crawl_runs WHERE id=?').get(id) as StoredRun | undefined
  const rows = (id: string) => (db.prepare('SELECT payload FROM crawl_run_rows WHERE run_id=? ORDER BY first_seen_at, row_key').all(id) as { payload: string }[]).map((item) => JSON.parse(item.payload) as CrawlRow)
  const exportsFor = (id: string) => db.prepare('SELECT id,run_id,file_name,file_path,file_size,entry_count,exported_at FROM crawl_exports WHERE run_id=? ORDER BY exported_at DESC').all(id) as StoredExport[]
  const summary = (run: StoredRun): CrawlRunSummary => {
    const criteria = JSON.parse(run.criteria_json) as CreateCrawlRun['criteria']
    const latest = exportsFor(run.id)[0]
    return { id: run.id, name: run.name, provider: run.provider, kind: run.kind, niches: criteria.selectedNiches, states: criteria.selectedStates, stateStartNumber: run.state_start_number, stateEndNumber: run.state_end_number, startedAt: run.started_at, finishedAt: run.finished_at, status: run.status, nextQueryIndex: run.next_query_index, totalQueries: (JSON.parse(run.searches_json) as unknown[]).length, entryCount: (db.prepare('SELECT COUNT(*) AS count FROM crawl_run_rows WHERE run_id=?').get(run.id) as { count: number }).count, latestFileName: latest?.file_name ?? null, latestFileSize: latest?.file_size ?? null, latestFilePath: latest?.file_path ?? null }
  }
  return {
    create(input: CreateCrawlRun) {
      const run = createCrawlRunSchema.parse(input)
      const id = randomUUID()
      if (run.provider !== 'google-maps') throw new Error(`${run.provider} is not available for automated public crawling.`)
      db.prepare('INSERT INTO crawl_runs (id,name,provider,kind,criteria_json,preferences_json,searches_json,state_start_number,state_end_number,started_at,status,next_query_index) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)')
        .run(id, run.name ?? run.criteria.selectedNiches.join(', ').slice(0, 100), run.provider, run.kind, JSON.stringify(run.criteria), JSON.stringify(run.preferences), JSON.stringify(run.searches), run.stateStartNumber, run.stateEndNumber, new Date().toISOString(), 'running')
      return this.get(id)!
    },
    get(id: string): CrawlRunDetail | null {
      const run = stored(crawlRunIdSchema.parse(id))
      return run ? { ...summary(run), criteria: JSON.parse(run.criteria_json), preferences: JSON.parse(run.preferences_json), searches: JSON.parse(run.searches_json), rows: rows(id) } : null
    },
    list(): CrawlRunSummary[] { return (db.prepare('SELECT * FROM crawl_runs ORDER BY started_at DESC').all() as StoredRun[]).map(summary) },
    delete(id: string): boolean {
      const runId = crawlRunIdSchema.parse(id)
      const run = stored(runId)
      if (!run) return false
      if (run.kind !== 'pipeline') throw new Error('Only a pipeline can be deleted here')
      if (run.status === 'running') throw new Error('Stop the pipeline before deleting it')
      db.transaction(() => {
        db.prepare('DELETE FROM pipeline_pages WHERE run_id=?').run(runId)
        db.prepare('DELETE FROM crawl_exports WHERE run_id=?').run(runId)
        db.prepare('DELETE FROM pipeline_email_filters WHERE run_id=?').run(runId)
        db.prepare('DELETE FROM crawl_run_rows WHERE run_id=?').run(runId)
        db.prepare('DELETE FROM crawl_runs WHERE id=?').run(runId)
      })()
      return true
    },
    listExports(): CrawlExport[] { return (db.prepare('SELECT id,run_id,file_name,file_path,file_size,entry_count,exported_at FROM crawl_exports ORDER BY exported_at DESC').all() as StoredExport[]).map((item) => ({ id: item.id, runId: item.run_id, fileName: item.file_name, filePath: item.file_path, fileSize: item.file_size, entryCount: item.entry_count, exportedAt: item.exported_at })) },
    saveRow(input: unknown) {
      const { id, row } = crawlRunRowInputSchema.parse(input)
      if (!stored(id)) throw new Error('Crawl run not found')
      const key = row.mapsUrl.trim().toLowerCase() || row.website.trim().toLowerCase().replace(/\/$/, '') || `${row.name.trim().toLowerCase()}|${row.address.trim().toLowerCase()}`
      db.prepare('INSERT INTO crawl_run_rows (run_id,row_key,payload,first_seen_at) VALUES (?,?,?,?) ON CONFLICT(run_id,row_key) DO UPDATE SET payload=excluded.payload')
        .run(id, key, JSON.stringify(row), new Date().toISOString())
      return true
    },
    filterRunEmails(id: string) {
      const runId = crawlRunIdSchema.parse(id)
      const run = stored(runId)
      if (!run || run.kind !== 'pipeline') throw new Error('Pipeline not found')
      const items = db.prepare('SELECT row_key,payload FROM crawl_run_rows WHERE run_id=? ORDER BY first_seen_at,row_key').all(runId) as { row_key: string; payload: string }[]
      const prior = db.prepare('SELECT original_emails_json FROM pipeline_email_filters WHERE run_id=? AND row_key=?')
      const update = db.prepare('UPDATE crawl_run_rows SET payload=? WHERE run_id=? AND row_key=?')
      const audit = db.prepare('INSERT INTO pipeline_email_filters (run_id,row_key,original_emails_json,rejected_json,filtered_at) VALUES (?,?,?,?,?) ON CONFLICT(run_id,row_key) DO UPDATE SET original_emails_json=excluded.original_emails_json,rejected_json=excluded.rejected_json,filtered_at=excluded.filtered_at')
      let before = 0, kept = 0, removed = 0
      db.transaction(() => {
        for (const item of items) {
          const row = JSON.parse(item.payload) as CrawlRow
          const previous = prior.get(runId, item.row_key) as { original_emails_json: string } | undefined
          const original = [...new Set([...(previous ? JSON.parse(previous.original_emails_json) as string[] : []), ...row.emails])]
          const result = filterEmails(original.map((value) => ({ value, source: row.website || row.mapsUrl || row.name })))
          before += result.total
          kept += result.kept.length
          removed += result.rejected.length
          update.run(JSON.stringify({ ...row, emails: result.kept.map((entry) => entry.email) }), runId, item.row_key)
          audit.run(runId, item.row_key, JSON.stringify(original), JSON.stringify(result.rejected), new Date().toISOString())
        }
      })()
      return { before, kept, removed }
    },
    progress(input: unknown) {
      const update = crawlRunProgressSchema.parse(input)
      const run = stored(update.id)
      if (!run) throw new Error('Crawl run not found')
      const total = (JSON.parse(run.searches_json) as unknown[]).length
      if (update.nextQueryIndex > total) throw new Error('Crawl position exceeds the query count')
      db.prepare('UPDATE crawl_runs SET next_query_index=?,status=?,finished_at=?,error=? WHERE id=?')
        .run(update.nextQueryIndex, update.status, update.status === 'running' ? null : new Date().toISOString(), update.error ?? null, update.id)
      return summary(stored(update.id)!)
    },
    async export(id: string, saveAs: boolean, owner?: BrowserWindow): Promise<CrawlExport | null> {
      const run = stored(crawlRunIdSchema.parse(id))
      if (!run) throw new Error('Crawl run not found')
      const entryRows = rows(id)
      const criteria = JSON.parse(run.criteria_json) as CreateCrawlRun['criteria']
      const bytes = crawlRowsToCsv(entryRows, run.started_at, criteria.selectedNiches)
      const exportId = randomUUID()
      const niche = (criteria.selectedNiches[0] ?? 'crawl').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'crawl'
      const stamp = run.started_at.replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
      const fileName = `${niche}${criteria.selectedNiches.length > 1 ? `-plus-${criteria.selectedNiches.length - 1}` : ''}-${stamp}-${exportId.slice(0, 8)}.csv`
      const directory = join(app.getPath('documents'), 'LeadsGhr', 'exports')
      let path = join(directory, fileName)
      if (saveAs) {
        const selection = await dialog.showSaveDialog(owner ?? BrowserWindow.getFocusedWindow()!, { title: 'Export crawl results', defaultPath: path, filters: [{ name: 'CSV files', extensions: ['csv'] }] })
        if (selection.canceled || !selection.filePath) return null
        path = selection.filePath
      } else await mkdir(directory, { recursive: true })
      await writeFile(path, bytes)
      const item: CrawlExport = { id: exportId, runId: id, fileName: basename(path), filePath: path, fileSize: bytes.byteLength, entryCount: entryRows.length, exportedAt: new Date().toISOString() }
      db.prepare('INSERT INTO crawl_exports (id,run_id,file_name,file_path,file_size,entry_count,exported_at,csv_bytes) VALUES (?,?,?,?,?,?,?,?)').run(item.id, item.runId, item.fileName, item.filePath, item.fileSize, item.entryCount, item.exportedAt, Buffer.from(bytes))
      return item
    },
    async reexportSnapshot(exportId: string, owner: BrowserWindow): Promise<CrawlExport | null> {
      const previous = db.prepare('SELECT * FROM crawl_exports WHERE id=?').get(crawlRunIdSchema.parse(exportId)) as (StoredExport & { csv_bytes: Buffer | null }) | undefined
      if (!previous) throw new Error('CSV export not found')
      const bytes = previous.csv_bytes ?? await readFile(previous.file_path)
      const selection = await dialog.showSaveDialog(owner, { title: 'Re-export saved CSV', defaultPath: join(app.getPath('documents'), 'LeadsGhr', 'exports', previous.file_name), filters: [{ name: 'CSV files', extensions: ['csv'] }] })
      if (selection.canceled || !selection.filePath) return null
      await writeFile(selection.filePath, bytes)
      const item: CrawlExport = { id: randomUUID(), runId: previous.run_id, fileName: basename(selection.filePath), filePath: selection.filePath, fileSize: bytes.byteLength, entryCount: previous.entry_count, exportedAt: new Date().toISOString() }
      db.prepare('INSERT INTO crawl_exports (id,run_id,file_name,file_path,file_size,entry_count,exported_at,csv_bytes) VALUES (?,?,?,?,?,?,?,?)').run(item.id, item.runId, item.fileName, item.filePath, item.fileSize, item.entryCount, item.exportedAt, bytes)
      return item
    },
  }
}

export function registerCrawlRunIpc(store: ReturnType<typeof createCrawlRunStore>) {
  const owner = (event: Electron.IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('Unexpected caller')
    return window
  }
  ipcMain.handle('leadsghr:crawl-runs:create', (event, input: unknown) => { owner(event); return store.create(createCrawlRunSchema.parse(input)) })
  ipcMain.handle('leadsghr:crawl-runs:get', (event, id: unknown) => { owner(event); return store.get(crawlRunIdSchema.parse(id)) })
  ipcMain.handle('leadsghr:crawl-runs:delete', (event, id: unknown) => { owner(event); return store.delete(crawlRunIdSchema.parse(id)) })
  ipcMain.handle('leadsghr:crawl-runs:list', (event) => { owner(event); return store.list() })
  ipcMain.handle('leadsghr:crawl-runs:exports', (event) => { owner(event); return store.listExports() })
  ipcMain.handle('leadsghr:crawl-runs:row', (event, input: unknown) => { owner(event); return store.saveRow(input) })
  ipcMain.handle('leadsghr:crawl-runs:filter-emails', (event, id: unknown) => { owner(event); return store.filterRunEmails(crawlRunIdSchema.parse(id)) })
  ipcMain.handle('leadsghr:crawl-runs:progress', (event, input: unknown) => { owner(event); return store.progress(input) })
  ipcMain.handle('leadsghr:crawl-runs:export', (event, id: unknown, saveAs: unknown) => store.export(crawlRunIdSchema.parse(id), saveAs === true, owner(event)))
  ipcMain.handle('leadsghr:crawl-runs:reexport-snapshot', (event, id: unknown) => store.reexportSnapshot(crawlRunIdSchema.parse(id), owner(event)))
}
