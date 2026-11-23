import { useEffect, useEffectEvent, useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { Button, EmptyTable, Icon, Textarea } from '@leadsghr/ui'
import type { DesktopPreferences, EmailVerifyResult } from '@leadsghr/schemas'
import { defaultDesktopPreferences, emailVerifyChecksFromPreferences } from '@leadsghr/schemas'
import {
  EMAIL_VERIFY_CONCURRENCY_DEFAULT,
  EMAIL_VERIFY_CONCURRENCY_MAX,
  EMAIL_VERIFY_CONCURRENCY_MIN,
  EMAIL_VERIFY_MAX,
  checkSummary,
  collectEmailInputs,
  detectEmailColumns,
  isRetryable,
  parseCsv,
  smtpLabel,
  statusClass,
  statusLabel,
  type ImportTable,
} from './email-validation-data'

const PAGE_SIZE = 10

type VerifyBridge = {
  startEmailVerify(input: {
    emails: string[]
    concurrency: number
    checkSyntax: boolean
    checkDomain: boolean
    checkMx: boolean
    checkSmtp: boolean
    checkDisposable: boolean
    checkRoleBased: boolean
    checkCatchAll: boolean
    mailFrom: string
    ehlo: string
    perSession: number
    paceMs: number
  }): Promise<string>
  stopEmailVerify(id: string): Promise<boolean>
  onEmailVerifyEvent(callback: (message: unknown) => void): () => void
}

type VerifyEvent = {
  id: string
  index: number
  completed?: number
  total: number
  result?: EmailVerifyResult
  done?: boolean
  stopped?: boolean
  error?: string
  results?: EmailVerifyResult[]
}

const bridge = () => (window as Window & { leadsGhrDesktop?: VerifyBridge }).leadsGhrDesktop

export function EmailValidationPage({
  preferences = defaultDesktopPreferences,
}: {
  preferences?: DesktopPreferences
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasted, setPasted] = useState('')
  const [tables, setTables] = useState<ImportTable[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState<Array<EmailVerifyResult | undefined> | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState({ index: 0, total: 0 })
  const [concurrency, setConcurrency] = useState(EMAIL_VERIFY_CONCURRENCY_DEFAULT)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | EmailVerifyResult['status']>('all')
  const [active, setActive] = useState<EmailVerifyResult | null>(null)
  const columns = detectEmailColumns(tables)
  const filled = results?.filter((item): item is EmailVerifyResult => Boolean(item)) ?? []

  useEffect(() => {
    const api = bridge()
    if (!api?.onEmailVerifyEvent) return
    return api.onEmailVerifyEvent((raw) => {
      const event = raw as VerifyEvent
      if (!event?.id) return
      setJobId((current) => {
        if (current && current !== event.id) return current
        return event.id
      })
      if (event.result) {
        setResults((current) => {
          const next: Array<EmailVerifyResult | undefined> = current
            ? [...current]
            : Array.from({ length: event.total })
          next[event.index] = event.result
          return next
        })
        setProgress({
          index: event.completed ?? event.index + 1,
          total: event.total,
        })
      }
      if (event.done) {
        setRunning(false)
        setJobId(null)
        if (event.error && event.results?.length === 0) setResults([])
        if (event.error && !/stopped/i.test(event.error)) setMessage(event.error)
        else if (event.stopped) setMessage('Stopped. Partial results kept.')
        else setMessage('Done.')
      }
    })
  }, [])

  function changeConcurrency(delta: number) {
    setConcurrency((current) =>
      Math.min(
        EMAIL_VERIFY_CONCURRENCY_MAX,
        Math.max(EMAIL_VERIFY_CONCURRENCY_MIN, current + delta),
      ),
    )
  }

  async function importFile(file: File) {
    setLoading(true)
    setMessage('Reading file...')
    setResults(null)
    setActive(null)
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
          ? `${detected.length} email column${detected.length === 1 ? '' : 's'} found.`
          : 'No email column found.',
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

  async function runEmails(emails: string[]) {
    const api = bridge()
    if (!api) {
      setMessage('Open the desktop app to run email verification.')
      return
    }
    if (!api.startEmailVerify) {
      setMessage('Restart the desktop app to reload verification.')
      return
    }
    if (!emails.length) {
      setResults(null)
      setMessage('Add emails first.')
      return
    }
    if (emails.length > EMAIL_VERIFY_MAX) {
      setMessage(`Max ${EMAIL_VERIFY_MAX} addresses per run.`)
      return
    }
    setResults(Array.from<EmailVerifyResult | undefined>({ length: emails.length }))
    setActive(null)
    setPage(1)
    setStatusFilter('all')
    setProgress({ index: 0, total: emails.length })
    setRunning(true)
    setMessage(`Checking ${emails.length}...`)
    try {
      const checks = emailVerifyChecksFromPreferences(preferences)
      const id = await api.startEmailVerify({
        emails,
        concurrency,
        ...checks,
        mailFrom: preferences.emailVerifyMailFrom,
        ehlo: preferences.emailVerifyEhlo,
        perSession: preferences.emailVerifyPerSession,
        paceMs: preferences.emailVerifyPaceMs,
      })
      setJobId(id)
    } catch (error) {
      setRunning(false)
      setJobId(null)
      setMessage(String(error))
    }
  }

  async function startValidation() {
    const inputs = collectEmailInputs(pasted, tables, selected)
    await runEmails([...new Set(inputs.map((item) => item.value.trim()).filter(Boolean))])
  }

  async function retrySoft() {
    const emails = filled.filter(isRetryable).map((item) => item.email)
    if (!emails.length) {
      setMessage('No soft failures to retry.')
      return
    }
    await runEmails([...new Set(emails)])
  }

  async function stopValidation() {
    if (!jobId) return
    try {
      await bridge()?.stopEmailVerify(jobId)
    } catch (error) {
      setMessage(String(error))
    }
  }

  async function copyEmails() {
    const rows = filteredResults()
    if (!rows.length) return
    try {
      await navigator.clipboard.writeText(rows.map((item) => item.email).join('\n'))
      setMessage('Copied.')
    } catch {
      setMessage('Copy failed.')
    }
  }

  function downloadCsv() {
    const rows = filteredResults()
    if (!rows.length) return
    const body = [
      'email,status,confidence,code,reason,syntax,domain,mx,smtp,disposable,role_based,catch_all,mx_host,smtp_code',
      ...rows.map((item) =>
        [
          item.email,
          item.status,
          item.confidence,
          item.code ?? '',
          item.reason,
          item.checks.syntax,
          item.checks.domain,
          item.checks.mx,
          item.checks.smtp,
          item.checks.disposable,
          item.checks.roleBased,
          item.checks.catchAll,
          item.mxHost ?? '',
          item.smtpCode ?? '',
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ]
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + body.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `leadsghr-email-validation-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function filteredResults() {
    return statusFilter === 'all' ? filled : filled.filter((item) => item.status === statusFilter)
  }

  const filtered = filteredResults()
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageWindow = Math.min(10, totalPages)
  const firstPageButton = Math.max(
    1,
    Math.min(page - Math.floor(pageWindow / 2), totalPages - pageWindow + 1),
  )
  const pageButtons = Array.from({ length: pageWindow }, (_, index) => firstPageButton + index)
  const counts = filled.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    },
    { valid: 0, risky: 0, invalid: 0 } as Record<EmailVerifyResult['status'], number>,
  )
  const retryCount = filled.filter(isRetryable).length
  const activeResult = active
    ? (filled.find((item) => item.email === active.email) ?? active)
    : null
  const closeDetail = useEffectEvent(() => setActive(null))

  useEffect(() => {
    if (!activeResult) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeResult])

  return (
    <div className="la-email-filter-page la-email-verify-page">
      <div className="la-email-filter-intro">
        <span className="la-spam-local-badge">
          <span aria-hidden="true" /> Local
        </span>
      </div>
      <div className="la-email-filter-layout">
        <section className="la-email-filter-panel" aria-label="Email input">
          <div className="la-email-filter-panel-heading la-spam-panel-title">
            <span className="la-spam-panel-icon">
              <Icon name="mailCheck" size={18} />
            </span>
            <div>
              <h3>Input</h3>
            </div>
            <Button
              className="la-email-filter-import"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || running}
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
                  setResults(null)
                  setActive(null)
                }}
                aria-label="Remove imported file"
                disabled={running}
              >
                ×
              </button>
            </div>
          )}
          {columns.length > 0 && (
            <div className="la-email-filter-columns">
              <strong>Email columns</strong>
              {columns.map((column) => (
                <label key={column.key}>
                  <input
                    type="checkbox"
                    checked={selected.has(column.key)}
                    disabled={running}
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
                  </span>
                </label>
              ))}
            </div>
          )}
          <label className="la-email-filter-paste">
            Emails<span>Up to {EMAIL_VERIFY_MAX}</span>
            <Textarea
              value={pasted}
              onChange={(event) => {
                setPasted(event.target.value)
                setResults(null)
                setActive(null)
              }}
              placeholder={'name@company.com'}
              spellCheck={false}
              disabled={running}
            />
          </label>
          <div
            className="la-email-verify-concurrency"
            role="group"
            aria-label="Parallel mail servers"
          >
            <strong>Parallel mail servers</strong>
            <div className="la-email-verify-concurrency-controls">
              <button
                type="button"
                aria-label="Decrease parallel mail servers"
                disabled={running || concurrency <= EMAIL_VERIFY_CONCURRENCY_MIN}
                onClick={() => changeConcurrency(-1)}
              >
                −
              </button>
              <input
                type="number"
                min={EMAIL_VERIFY_CONCURRENCY_MIN}
                max={EMAIL_VERIFY_CONCURRENCY_MAX}
                step={1}
                value={concurrency}
                disabled={running}
                aria-label="Parallel mail server count"
                onChange={(event) => {
                  const value = Number(event.currentTarget.value)
                  if (
                    Number.isInteger(value) &&
                    value >= EMAIL_VERIFY_CONCURRENCY_MIN &&
                    value <= EMAIL_VERIFY_CONCURRENCY_MAX
                  )
                    setConcurrency(value)
                }}
              />
              <button
                type="button"
                aria-label="Increase parallel mail servers"
                disabled={running || concurrency >= EMAIL_VERIFY_CONCURRENCY_MAX}
                onClick={() => changeConcurrency(1)}
              >
                +
              </button>
            </div>
          </div>
          {running ? (
            <Button
              className="la-email-filter-start la-email-verify-stop"
              type="button"
              onClick={() => void stopValidation()}
            >
              Stop
            </Button>
          ) : (
            <Button
              className="la-email-filter-start"
              type="button"
              onClick={() => void startValidation()}
              disabled={loading}
            >
              Validate <Icon name="arrow" size={17} />
            </Button>
          )}
        </section>
        <section
          className="la-email-filter-panel la-email-filter-output"
          aria-label="Validation results"
        >
          <div className="la-email-filter-panel-heading la-spam-panel-title">
            <span className="la-spam-panel-icon">
              <Icon name="shield" size={18} />
            </span>
            <div>
              <h3>Results</h3>
            </div>
            {results && <span className="la-email-filter-result-count">{filled.length}</span>}
          </div>
          {results ? (
            <>
              {running && (
                <p className="la-email-verify-progress" role="status">
                  {progress.index}/{progress.total}
                </p>
              )}
              <div className="la-email-filter-stats la-email-verify-stats">
                <button
                  type="button"
                  className={statusFilter === 'all' ? 'is-active' : undefined}
                  onClick={() => {
                    setStatusFilter('all')
                    setPage(1)
                  }}
                >
                  <strong>{filled.length}</strong>
                  <span>All</span>
                </button>
                <button
                  type="button"
                  className={statusFilter === 'valid' ? 'is-active' : undefined}
                  onClick={() => {
                    setStatusFilter('valid')
                    setPage(1)
                  }}
                >
                  <strong>{counts.valid}</strong>
                  <span>Valid</span>
                </button>
                <button
                  type="button"
                  className={statusFilter === 'risky' ? 'is-active' : undefined}
                  onClick={() => {
                    setStatusFilter('risky')
                    setPage(1)
                  }}
                >
                  <strong>{counts.risky}</strong>
                  <span>Risky</span>
                </button>
                <button
                  type="button"
                  className={statusFilter === 'invalid' ? 'is-active' : undefined}
                  onClick={() => {
                    setStatusFilter('invalid')
                    setPage(1)
                  }}
                >
                  <strong>{counts.invalid}</strong>
                  <span>Invalid</span>
                </button>
              </div>
              <div className="la-email-filter-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyEmails()}
                  disabled={!filtered.length}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadCsv}
                  disabled={!filtered.length}
                >
                  <Icon name="exports" size={15} /> CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void retrySoft()}
                  disabled={running || !retryCount}
                >
                  Retry soft
                </Button>
              </div>
              <div className="la-email-filter-table-wrap">
                <table className="la-table la-email-verify-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item, index) => (
                      <tr
                        key={`${item.email}:${(page - 1) * PAGE_SIZE + index}`}
                        className={activeResult?.email === item.email ? 'is-active' : undefined}
                        onClick={() => setActive(item)}
                      >
                        <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                        <td title={checkSummary(item)}>{item.email}</td>
                        <td>
                          <span className={statusClass(item.status)}>
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td>{item.confidence}</td>
                        <td title={item.code ? `${item.reason} (${item.code})` : item.reason}>
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <EmptyTable title="No matches" description="Try another filter." />
                )}
              </div>
              {totalPages > 1 && (
                <div className="la-email-filter-pagination la-email-verify-pagination">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    aria-label="Previous page"
                  >
                    <Icon name="back" size={16} />
                  </button>
                  {pageButtons.map((number) => (
                    <button
                      type="button"
                      key={number}
                      aria-label={`Page ${number}`}
                      aria-current={number === page ? 'page' : undefined}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ))}
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
            </>
          ) : (
            <EmptyTable title="No results yet" description="Add emails, then validate." />
          )}
        </section>
      </div>
      {message && (
        <p className="la-email-filter-message" role="status">
          {message}
        </p>
      )}
      {activeResult && (
        <div
          className="la-email-verify-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActive(null)
          }}
        >
          <div
            className="la-email-verify-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="la-email-verify-detail-title"
          >
            <div className="la-email-verify-detail-head">
              <div className="la-email-verify-modal-title">
                <strong id="la-email-verify-detail-title" title={activeResult.email}>
                  {activeResult.email}
                </strong>
                <span className={statusClass(activeResult.status)}>
                  {statusLabel(activeResult.status)}
                </span>
              </div>
              <button
                type="button"
                className="la-niche-panel-close"
                onClick={() => setActive(null)}
                aria-label="Close check details"
              >
                ×
              </button>
            </div>
            <p className="la-email-verify-modal-reason">
              {activeResult.reason}
              {activeResult.code ? ` · ${activeResult.code}` : ''}
            </p>
            <ul className="la-email-verify-detail-list">
              <li>
                <span>Syntax check</span>
                <strong>{activeResult.checks?.syntax ? 'Passed' : 'Failed'}</strong>
              </li>
              <li>
                <span>Domain check</span>
                <strong>{activeResult.checks?.domain ? 'Passed' : 'Failed'}</strong>
              </li>
              <li>
                <span>MX records</span>
                <strong>{activeResult.checks?.mx ? 'Found' : 'Missing'}</strong>
              </li>
              <li>
                <span>SMTP check</span>
                <strong>{smtpLabel(activeResult.checks?.smtp ?? 'unverifiable')}</strong>
              </li>
              <li>
                <span>Disposable email</span>
                <strong>{activeResult.checks?.disposable ? 'Yes' : 'No'}</strong>
              </li>
              <li>
                <span>Role-based</span>
                <strong>{activeResult.checks?.roleBased ? 'Yes' : 'No'}</strong>
              </li>
              <li>
                <span>Catch-all domain</span>
                <strong>{activeResult.checks?.catchAll ? 'Yes' : 'No'}</strong>
              </li>
              <li>
                <span>Deliverability</span>
                <strong>{activeResult.confidence}</strong>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
