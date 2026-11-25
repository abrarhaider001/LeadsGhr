import { useState } from 'react'
import type { CrawlExport, CrawlRunSummary } from '@leadsghr/schemas'
import { Icon, Table } from '@leadsghr/ui'
import { crawlRunBridge, formatBytes } from './crawl-run-bridge'

const dateText = (value: string | null) => (value ? new Date(value).toLocaleString() : '—')

export function ExportsPage({
  runs,
  exports,
  onRefresh,
  onResume,
  showExportHistory = true,
}: {
  runs: CrawlRunSummary[]
  exports: CrawlExport[]
  onRefresh(): Promise<void>
  onResume(id: string): void
  showExportHistory?: boolean
}) {
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'exports' | 'runs'>('exports')
  async function reexport(id: string) {
    setBusyId(id)
    try {
      const item = await crawlRunBridge()?.exportCrawlRun(id, true)
      if (item) {
        setMessage(`Exported ${item.fileName} (${item.entryCount.toLocaleString()} entries).`)
        await onRefresh()
      }
    } catch (error) {
      setMessage(`Export failed: ${String(error)}`)
    } finally {
      setBusyId(null)
    }
  }
  async function reexportFile(item: CrawlExport) {
    setBusyId(item.id)
    try {
      const saved = await crawlRunBridge()?.reexportCrawlSnapshot(item.id)
      if (saved) {
        setMessage(`Re-exported ${item.fileName} (${item.entryCount.toLocaleString()} entries).`)
        await onRefresh()
      }
    } catch (error) {
      setMessage(`Could not re-export ${item.fileName}: ${String(error)}`)
    } finally {
      setBusyId(null)
    }
  }
  return (
    <div className="la-export-history">
      {showExportHistory && (
        <div className="la-profile-tabs" role="tablist" aria-label="Export sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'exports'}
            onClick={() => setTab('exports')}
          >
            Exports
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'runs'}
            onClick={() => setTab('runs')}
          >
            Crawl history
          </button>
        </div>
      )}
      {(!showExportHistory || tab === 'runs') && (
        <div
          role={showExportHistory ? 'tabpanel' : undefined}
          aria-label={showExportHistory ? 'Crawl history' : undefined}
        >
          <div className="la-section-heading">
            <div>
              <h2>Previous crawl runs</h2>
              <p>Saved locally. Export a new CSV from any run, including one that stopped early.</p>
            </div>
            <span>{runs.length} runs</span>
          </div>
          <div className="la-table-scroll">
          <Table
            data={runs}
            loading={false}
            paginator={false}
            tableClassName="la-history-table"
            rowKey={(run) => run.id}
            columns={[
              {
                field: 'niches',
                header: 'Niche',
                cell: (run) => <span title={run.niches.join(', ')}>{run.niches.join(', ')}</span>,
              },
              {
                field: 'states',
                header: 'States',
                cell: (run) => <span title={run.states.join(', ')}>{run.states.join(', ')}</span>,
              },
              {
                field: 'stateRange',
                header: 'State range',
                cell: (run) => (
                  <>
                    {run.stateStartNumber}–{run.stateEndNumber}
                  </>
                ),
              },
              { field: 'startedAt', header: 'Started', cell: (run) => dateText(run.startedAt) },
              {
                field: 'status',
                header: 'Status',
                cell: (run) => (
                  <>
                    {run.status} · {run.nextQueryIndex}/{run.totalQueries}
                  </>
                ),
              },
              {
                field: 'entryCount',
                header: 'Entries',
                cell: (run) => run.entryCount.toLocaleString(),
              },
              {
                field: 'latestFileName',
                header: 'Latest CSV',
                cell: (run) => (
                  <span title={run.latestFilePath ?? undefined}>{run.latestFileName ?? '—'}</span>
                ),
              },
              {
                field: 'latestFileSize',
                header: 'Size',
                cell: (run) => formatBytes(run.latestFileSize),
              },
              {
                field: 'actions',
                header: 'Actions',
                cell: (run) => (
                  <div className="la-history-actions">
                    <button
                      type="button"
                      onClick={() => void reexport(run.id)}
                      disabled={busyId === run.id}
                      title="Re-export CSV"
                      aria-label={`Re-export ${run.niches.join(', ')} run`}
                    >
                      <Icon name="exports" size={15} />
                    </button>
                    {run.nextQueryIndex < run.totalQueries && (
                      <button
                        type="button"
                        onClick={() => onResume(run.id)}
                        title="Resume crawl"
                        aria-label={`Resume ${run.niches.join(', ')} run`}
                      >
                        <Icon name="resume" size={15} />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          </div>
        </div>
      )}
      {showExportHistory && tab === 'exports' && (
        <div role="tabpanel" aria-label="Exports">
          <div className="la-section-heading">
            <div>
              <h2>Export history</h2>
              <p>Every CSV export is listed with its filename, size, and entry count.</p>
            </div>
            <span>{exports.length} files</span>
          </div>
          <div className="la-table-scroll">
            <Table
              data={exports}
              loading={false}
              paginator={false}
              tableClassName="la-history-table"
              rowKey={(item) => item.id}
              columns={[
                {
                  field: 'fileName',
                  header: 'File name',
                  cell: (item) => <span title={item.fileName}>{item.fileName}</span>,
                },
                { field: 'exportedAt', header: 'Exported', cell: (item) => dateText(item.exportedAt) },
                {
                  field: 'entryCount',
                  header: 'Entries',
                  cell: (item) => item.entryCount.toLocaleString(),
                },
                { field: 'fileSize', header: 'Size', cell: (item) => formatBytes(item.fileSize) },
                {
                  field: 'filePath',
                  header: 'Location',
                  cell: (item) => <span title={item.filePath}>{item.filePath}</span>,
                },
                {
                  field: 'action',
                  header: 'Action',
                  cell: (item) => (
                    <button
                      type="button"
                      className="la-history-export-button la-history-export-button--icon"
                      onClick={() => void reexportFile(item)}
                      disabled={busyId === item.id}
                      title="Re-export CSV"
                      aria-label={`Re-export ${item.fileName}`}
                    >
                      <Icon name="exports" size={15} />
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
      {message && (
        <p className="la-export-message" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
