import { useState } from 'react'
import type { CrawlExport, CrawlRunSummary } from '@leadsghr/schemas'
import { EmptyTable, Icon } from '@leadsghr/ui'
import { crawlRunBridge, formatBytes } from './crawl-run-bridge'

const dateText = (value: string | null) => value ? new Date(value).toLocaleString() : '—'

export function ExportsPage({ runs, exports, onRefresh, onResume, showExportHistory = true }: { runs: CrawlRunSummary[]; exports: CrawlExport[]; onRefresh(): Promise<void>; onResume(id: string): void; showExportHistory?: boolean }) {
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'exports' | 'runs'>('exports')
  async function reexport(id: string) {
    setBusyId(id)
    try {
      const item = await crawlRunBridge()?.exportCrawlRun(id, true)
      if (item) { setMessage(`Exported ${item.fileName} (${item.entryCount.toLocaleString()} entries).`); await onRefresh() }
    } catch (error) { setMessage(`Export failed: ${String(error)}`) }
    finally { setBusyId(null) }
  }
  async function reexportFile(item: CrawlExport) {
    setBusyId(item.id)
    try {
      const saved = await crawlRunBridge()?.reexportCrawlSnapshot(item.id)
      if (saved) { setMessage(`Re-exported ${item.fileName} (${item.entryCount.toLocaleString()} entries).`); await onRefresh() }
    } catch (error) { setMessage(`Could not re-export ${item.fileName}: ${String(error)}`) }
    finally { setBusyId(null) }
  }
  return <div className="la-export-history">
    {showExportHistory && <div className="la-profile-tabs" role="tablist" aria-label="Export sections"><button type="button" role="tab" aria-selected={tab === 'exports'} onClick={() => setTab('exports')}>Exports</button><button type="button" role="tab" aria-selected={tab === 'runs'} onClick={() => setTab('runs')}>Crawl history</button></div>}
    {(!showExportHistory || tab === 'runs') && <div role={showExportHistory ? 'tabpanel' : undefined} aria-label={showExportHistory ? 'Crawl history' : undefined}>
    <div className="la-section-heading"><div><h2>Previous crawl runs</h2><p>Saved locally. Export a new CSV from any run, including one that stopped early.</p></div><span>{runs.length} runs</span></div>
    <div className="la-table-scroll"><table className="la-table la-history-table"><thead><tr><th>Niche</th><th>States</th><th>State range</th><th>Started</th><th>Status</th><th>Entries</th><th>Latest CSV</th><th>Size</th><th>Actions</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td title={run.niches.join(', ')}>{run.niches.join(', ')}</td><td title={run.states.join(', ')}>{run.states.join(', ')}</td><td>{run.stateStartNumber}–{run.stateEndNumber}</td><td>{dateText(run.startedAt)}</td><td>{run.status} · {run.nextQueryIndex}/{run.totalQueries}</td><td>{run.entryCount.toLocaleString()}</td><td title={run.latestFilePath ?? undefined}>{run.latestFileName ?? '—'}</td><td>{formatBytes(run.latestFileSize)}</td><td><div className="la-history-actions"><button type="button" onClick={() => void reexport(run.id)} disabled={busyId === run.id} title="Re-export CSV" aria-label={`Re-export ${run.niches.join(', ')} run`}><Icon name="exports" size={15}/></button>{run.nextQueryIndex < run.totalQueries && <button type="button" onClick={() => onResume(run.id)} title="Resume crawl" aria-label={`Resume ${run.niches.join(', ')} run`}><Icon name="resume" size={15}/></button>}</div></td></tr>)}</tbody></table>{!runs.length && <EmptyTable title="No crawl runs yet" description="Start a crawl from Pipeline or New Search to build your run history." />}</div>
    </div>}
    {showExportHistory && tab === 'exports' && <div role="tabpanel" aria-label="Exports"><div className="la-section-heading"><div><h2>Export history</h2><p>Every CSV export is listed with its filename, size, and entry count.</p></div><span>{exports.length} files</span></div>
    <div className="la-table-scroll"><table className="la-table la-history-table"><thead><tr><th>File name</th><th>Exported</th><th>Entries</th><th>Size</th><th>Location</th><th>Action</th></tr></thead><tbody>{exports.map((item) => <tr key={item.id}><td title={item.fileName}>{item.fileName}</td><td>{dateText(item.exportedAt)}</td><td>{item.entryCount.toLocaleString()}</td><td>{formatBytes(item.fileSize)}</td><td title={item.filePath}>{item.filePath}</td><td><button type="button" className="la-history-export-button la-history-export-button--icon" onClick={() => void reexportFile(item)} disabled={busyId === item.id} title="Re-export CSV" aria-label={`Re-export ${item.fileName}`}><Icon name="exports" size={15}/></button></td></tr>)}</tbody></table>{!exports.length && <EmptyTable title="No CSV exports yet" description="Export a completed or stopped run to see its file here." />}</div></div>}
    {message && <p className="la-export-message" role="status">{message}</p>}
  </div>
}
