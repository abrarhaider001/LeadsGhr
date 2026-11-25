import { useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { Button, EmptyState, Icon, Table, Textarea } from '@leadsghr/ui'
import {
  collectEmailInputs,
  detectEmailColumns,
  filterEmails,
  parseCsv,
  type FilterResult,
  type ImportTable,
} from './email-filtering-data'

const PAGE_SIZE = 100
export function EmailFilteringPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasted, setPasted] = useState('')
  const [tables, setTables] = useState<ImportTable[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<FilterResult | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const columns = detectEmailColumns(tables)

  async function importFile(file: File) {
    setLoading(true)
    setMessage('Reading file...')
    setResult(null)
    try {
      if (file.size > 20_000_000) throw new Error('Choose a file smaller than 20 MB.')
      const name = file.name.toLowerCase()
      let next: ImportTable[]
      if (name.endsWith('.xlsx')) {
        const sheets = await readXlsxFile(file)
        next = sheets.map(({ sheet, data }) => ({
          sheet,
          rows: data.map((row) => row.map((cell) => String(cell ?? ''))),
        }))
      } else if (name.endsWith('.csv'))
        next = [{ sheet: file.name, rows: parseCsv(await file.text()) }]
      else throw new Error('Import an .xlsx or .csv file.')
      const detected = detectEmailColumns(next)
      setTables(next)
      setSelected(new Set(detected.filter((column) => column.selected).map((column) => column.key)))
      setFileName(file.name)
      setMessage(
        detected.length
          ? `${detected.length} possible email column${detected.length === 1 ? '' : 's'} found. Review the selected columns below.`
          : 'No email column found. You can still paste addresses on the left.',
      )
    } catch (error) {
      setTables([])
      setSelected(new Set())
      setFileName('')
      setMessage(String(error))
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function startFiltering() {
    const inputs = collectEmailInputs(pasted, tables, selected)
    if (!inputs.length) {
      setResult(null)
      setMessage('Paste email addresses or import and select an email column first.')
      return
    }
    if (inputs.length > 100_000) {
      setMessage('This filter supports up to 100,000 email entries at a time.')
      return
    }
    setResult(filterEmails(inputs))
    setPage(1)
    setMessage('Filtering complete. Review the kept and removed addresses on the right.')
  }

  async function copyEmails() {
    if (!result?.kept.length) return
    try {
      await navigator.clipboard.writeText(result.kept.map((item) => item.email).join('\n'))
      setMessage('Filtered emails copied.')
    } catch {
      setMessage('Could not copy emails. Use Download CSV instead.')
    }
  }

  function downloadCsv() {
    if (!result?.kept.length) return
    const csv = '\uFEFFemail\r\n' + result.kept.map((item) => item.email).join('\r\n') + '\r\n'
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `leadsghr-filtered-emails-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.kept.length / PAGE_SIZE)) : 1
  const visible = result?.kept.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? []
  return (
    <div className="la-email-filter-page">
      <div className="la-email-filter-layout">
        <section className="la-email-filter-panel" aria-label="Email input">
          <div className="la-email-filter-panel-heading la-spam-panel-title">
            <span className="la-spam-panel-icon">
              <Icon name="mail" size={18} />
            </span>
            <div>
              <h3>Input emails</h3>
              <p>Paste addresses or import an Excel or CSV file.</p>
            </div>
            <Button
              className="la-email-filter-import"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              aria-label="Import from Excel or CSV"
            >
              <Icon name="exports" size={17} />
              {loading ? 'Reading...' : 'Import'}
            </Button>
          </div>
          <input
            ref={fileRef}
            className="la-email-filter-file"
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Choose an Excel or CSV file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importFile(file)
            }}
          />
          {fileName && (
            <div className="la-email-filter-file-name">
              <Icon name="profiles" size={15} />
              <span title={fileName}>{fileName}</span>
              <button
                type="button"
                onClick={() => {
                  setTables([])
                  setSelected(new Set())
                  setFileName('')
                  setResult(null)
                }}
                aria-label="Remove imported file"
              >
                ×
              </button>
            </div>
          )}
          {columns.length > 0 && (
            <div className="la-email-filter-columns">
              <strong>Email columns</strong>
              <span>Choose which columns to include.</span>
              {columns.map((column) => (
                <label key={column.key}>
                  <input
                    type="checkbox"
                    checked={selected.has(column.key)}
                    onChange={(event) =>
                      setSelected((current) => {
                        const next = new Set(current)
                        if (event.target.checked) next.add(column.key)
                        else next.delete(column.key)
                        return next
                      })
                    }
                  />
                  <span>
                    {column.sheet} · {column.label}
                    <small>{column.matches} email-like values in sample</small>
                  </span>
                </label>
              ))}
            </div>
          )}
          <label className="la-email-filter-paste">
            Paste email addresses<span>One per line, or separated by commas</span>
            <Textarea
              value={pasted}
              onChange={(event) => {
                setPasted(event.target.value)
                setResult(null)
              }}
              placeholder={'name@company.com\nhello@acme.com'}
              spellCheck={false}
            />
          </label>
          <Button
            className="la-email-filter-start"
            type="button"
            onClick={startFiltering}
            disabled={loading}
          >
            Start filtering <Icon name="arrow" size={17} />
          </Button>
        </section>
        <section
          className="la-email-filter-panel la-email-filter-output"
          aria-label="Filtered email results"
        >
          <div className="la-email-filter-panel-heading la-spam-panel-title">
            <span className="la-spam-panel-icon">
              <Icon name="shield" size={18} />
            </span>
            <div>
              <h3>Filtered emails</h3>
              <p>Kept addresses and removal reasons appear here.</p>
            </div>
            {result && (
              <span className="la-email-filter-result-count">{result.kept.length} kept</span>
            )}
          </div>
          {result ? (
            <>
              <div className="la-email-filter-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyEmails()}
                  disabled={!result.kept.length}
                >
                  Copy all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadCsv}
                  disabled={!result.kept.length}
                >
                  <Icon name="exports" size={15} /> Download CSV
                </Button>
              </div>
              <div className="la-email-filter-table-wrap">
              <Table
                data={visible.map((item, index) => ({
                  ...item,
                  rowNumber: (page - 1) * PAGE_SIZE + index + 1,
                }))}
                loading={false}
                paginator={false}
                tableClassName="min-w-[500px]"
                rowKey={(item) => item.email}
                columns={[
                  { field: 'rowNumber', header: '#' },
                  { field: 'email', header: 'Email address' },
                  {
                    field: 'status',
                    header: 'Status',
                    cell: () => <span className="la-email-filter-kept">Kept</span>,
                  },
                  { field: 'reason', header: 'Reason' },
                ]}
              />
              </div>
              {totalPages > 1 && (
                <div className="la-email-filter-pagination">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    aria-label="Previous page"
                  >
                    <Icon name="back" size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    aria-label="Next page"
                  >
                    <Icon name="chevron" size={16} />
                  </button>
                </div>
              )}
              {result.rejected.length > 0 && (
                <details className="la-email-filter-rejected">
                  <summary>Removed entries</summary>
                  <div>
                    {result.rejected.slice(0, 500).map((item, index) => (
                      <div key={`${index}:${item.value}`}>
                        <span title={item.value}>{item.value}</span>
                        <span className="la-email-filter-removed">Removed</span>
                        <small>{item.reason}</small>
                      </div>
                    ))}
                    {result.rejected.length > 500 && <p>Showing the first 500 removed entries.</p>}
                  </div>
                </details>
              )}
            </>
          ) : (
            <EmptyState className="flex-1" />
          )}
        </section>
      </div>
      {message && (
        <p className="la-email-filter-message" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
