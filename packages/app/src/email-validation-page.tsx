import { useEffect, useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { EmptyTable, Icon } from '@leadsghr/ui'
import type { EmailVerifyResult } from '@leadsghr/schemas'
import {
  EMAIL_VERIFY_MAX,
  collectEmailInputs,
  detectEmailColumns,
  parseCsv,
  statusClass,
  statusLabel,
  type ImportTable,
} from './email-validation-data'

const PAGE_SIZE = 100

type VerifyBridge = {
  startEmailVerify(input: { emails: string[] }): Promise<string>
  stopEmailVerify(id: string): Promise<boolean>
  onEmailVerifyEvent(callback: (message: unknown) => void): () => void
}

type VerifyEvent = {
  id: string
  index: number
  total: number
  result?: EmailVerifyResult
  done?: boolean
  stopped?: boolean
  error?: string
  results?: EmailVerifyResult[]
}

const bridge = () => (window as Window & { leadsGhrDesktop?: VerifyBridge }).leadsGhrDesktop

export function EmailValidationPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasted, setPasted] = useState('')
  const [tables, setTables] = useState<ImportTable[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState<EmailVerifyResult[] | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState({ index: 0, total: 0 })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | EmailVerifyResult['status']>('all')
  const columns = detectEmailColumns(tables)

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
          const next = current ? [...current] : []
          next.push(event.result!)
          return next
        })
        setProgress({ index: event.index + 1, total: event.total })
      }
      if (event.done) {
        setRunning(false)
        setJobId(null)
        if (event.results) setResults(event.results)
        if (event.error && !/stopped/i.test(event.error)) setMessage(event.error)
        else if (event.stopped) setMessage('Validation stopped. Partial SMTP results are shown.')
        else setMessage('SMTP validation finished. Review statuses carefully; acceptance is not a delivery guarantee.')
      }
    })
  }, [])

  async function importFile(file: File) {
    setLoading(true)
    setMessage('Reading file...')
    setResults(null)
    try {
      if (file.size > 20_000_000) throw new Error('Choose a file smaller than 20 MB.')
      const name = file.name.toLowerCase()
      let next: ImportTable[]
      if (name.endsWith('.xlsx')) {
        const sheets = await readXlsxFile(file)
        next = sheets.map(({ sheet, data }) => ({ sheet, rows: data.map((row) => row.map((cell) => String(cell ?? ''))) }))
      } else if (name.endsWith('.csv')) next = [{ sheet: file.name, rows: parseCsv(await file.text()) }]
      else throw new Error('Import an .xlsx or .csv file.')
      const detected = detectEmailColumns(next)
      setTables(next)
      setSelected(new Set(detected.filter((column) => column.selected).map((column) => column.key)))
      setFileName(file.name)
      setMessage(detected.length ? `${detected.length} possible email column${detected.length === 1 ? '' : 's'} found. Review the selected columns below.` : 'No email column found. You can still paste addresses on the left.')
    } catch (error) { setTables([]); setSelected(new Set()); setFileName(''); setMessage(String(error)) }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function startValidation() {
    const api = bridge()
    if (!api) {
      setMessage('Email Validation needs the Electron desktop app. Open it with pnpm.cmd --filter @leadsghr/desktop dev, then try again.')
      return
    }
    if (!api.startEmailVerify) {
      setMessage('Desktop bridge is outdated. Fully restart the desktop app so main and preload reload the SMTP validation IPC.')
      return
    }
    const inputs = collectEmailInputs(pasted, tables, selected)
    const emails = [...new Set(inputs.map((item) => item.value.trim()).filter(Boolean))]
    if (!emails.length) { setResults(null); setMessage('Paste email addresses or import and select an email column first.'); return }
    if (emails.length > EMAIL_VERIFY_MAX) {
      setMessage(`SMTP validation supports up to ${EMAIL_VERIFY_MAX} addresses per run to keep probing polite.`)
      return
    }
    setResults([])
    setPage(1)
    setStatusFilter('all')
    setProgress({ index: 0, total: emails.length })
    setRunning(true)
    setMessage(`Starting SMTP RCPT checks for ${emails.length} address${emails.length === 1 ? '' : 'es'}...`)
    try {
      const id = await api.startEmailVerify({ emails })
      setJobId(id)
    } catch (error) {
      setRunning(false)
      setJobId(null)
      setMessage(String(error))
    }
  }

  async function stopValidation() {
    if (!jobId) return
    try { await bridge()?.stopEmailVerify(jobId) }
    catch (error) { setMessage(String(error)) }
  }

  async function copyEmails() {
    const rows = filteredResults()
    if (!rows.length) return
    try {
      await navigator.clipboard.writeText(rows.map((item) => item.email).join('\n'))
      setMessage('Visible validation results copied.')
    } catch { setMessage('Could not copy emails. Use Download CSV instead.') }
  }

  function downloadCsv() {
    const rows = filteredResults()
    if (!rows.length) return
    const body = ['email,status,reason,mx_host,smtp_code', ...rows.map((item) =>
      [item.email, item.status, item.reason, item.mxHost ?? '', item.smtpCode ?? '']
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','))]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + body.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `leadsghr-email-validation-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function filteredResults() {
    if (!results) return []
    return statusFilter === 'all' ? results : results.filter((item) => item.status === statusFilter)
  }

  const filtered = filteredResults()
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const counts = results?.reduce((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc }, { valid: 0, risky: 0, invalid: 0, unknown: 0 } as Record<EmailVerifyResult['status'], number>)

  return <div className="la-email-filter-page la-email-verify-page">
    <div className="la-email-filter-intro"><div><h2>Email Validation</h2><p>Probe receiving mail servers with SMTP RCPT TO. No messages are sent.</p></div><span className="la-spam-local-badge"><span aria-hidden="true" /> Runs on this computer</span></div>
    <div className="la-email-filter-layout">
      <section className="la-email-filter-panel" aria-label="Email input">
        <div className="la-email-filter-panel-heading la-spam-panel-title"><span className="la-spam-panel-icon"><Icon name="mailCheck" size={18}/></span><div><h3>Input emails</h3><p>Paste addresses or import an Excel or CSV file.</p></div><button className="la-email-filter-import" type="button" onClick={() => fileRef.current?.click()} disabled={loading || running} aria-label="Import from Excel or CSV"><Icon name="exports" size={17} />{loading ? 'Reading...' : 'Import'}</button></div>
        <input ref={fileRef} className="la-email-filter-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Choose an Excel or CSV file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} />
        {fileName && <div className="la-email-filter-file-name"><Icon name="profiles" size={15}/><span title={fileName}>{fileName}</span><button type="button" onClick={() => { setTables([]); setSelected(new Set()); setFileName(''); setResults(null) }} aria-label="Remove imported file" disabled={running}>×</button></div>}
        {columns.length > 0 && <div className="la-email-filter-columns"><strong>Email columns</strong><span>Choose which columns to include.</span>{columns.map((column) => <label key={column.key}><input type="checkbox" checked={selected.has(column.key)} disabled={running} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(column.key); else next.delete(column.key); return next })}/><span>{column.sheet} · {column.label}<small>{column.matches} email-like values in sample</small></span></label>)}</div>}
        <label className="la-email-filter-paste">Paste email addresses<span>One per line, or separated by commas. Up to {EMAIL_VERIFY_MAX} unique addresses per run.</span><textarea value={pasted} onChange={(event) => { setPasted(event.target.value); setResults(null) }} placeholder={'name@company.com\nhello@acme.com'} spellCheck={false} disabled={running} /></label>
        {running
          ? <button className="la-email-filter-start la-email-verify-stop" type="button" onClick={() => void stopValidation()}>Stop validation</button>
          : <button className="la-email-filter-start" type="button" onClick={() => void startValidation()} disabled={loading}>Start SMTP validation <Icon name="arrow" size={17}/></button>}
      </section>
      <section className="la-email-filter-panel la-email-filter-output" aria-label="Validation results">
        <div className="la-email-filter-panel-heading la-spam-panel-title"><span className="la-spam-panel-icon"><Icon name="shield" size={18}/></span><div><h3>Validation results</h3><p>Statuses come from SMTP RCPT TO replies when the probe can reach the server.</p></div>{results && <span className="la-email-filter-result-count">{results.length} checked</span>}</div>
        {results ? <>
          {running && <p className="la-email-verify-progress" role="status">Checking {progress.index} of {progress.total}...</p>}
          {counts && <div className="la-email-filter-stats la-email-verify-stats">
            <button type="button" className={statusFilter === 'all' ? 'is-active' : undefined} onClick={() => { setStatusFilter('all'); setPage(1) }}><strong>{results.length}</strong><span>All</span></button>
            <button type="button" className={statusFilter === 'valid' ? 'is-active' : undefined} onClick={() => { setStatusFilter('valid'); setPage(1) }}><strong>{counts.valid}</strong><span>Valid</span></button>
            <button type="button" className={statusFilter === 'risky' ? 'is-active' : undefined} onClick={() => { setStatusFilter('risky'); setPage(1) }}><strong>{counts.risky}</strong><span>Risky</span></button>
            <button type="button" className={statusFilter === 'invalid' ? 'is-active' : undefined} onClick={() => { setStatusFilter('invalid'); setPage(1) }}><strong>{counts.invalid}</strong><span>Invalid</span></button>
            <button type="button" className={statusFilter === 'unknown' ? 'is-active' : undefined} onClick={() => { setStatusFilter('unknown'); setPage(1) }}><strong>{counts.unknown}</strong><span>Unknown</span></button>
          </div>}
          <div className="la-email-filter-actions"><button type="button" onClick={() => void copyEmails()} disabled={!filtered.length}>Copy visible</button><button type="button" onClick={downloadCsv} disabled={!filtered.length}><Icon name="exports" size={15}/> Download CSV</button></div>
          <div className="la-email-filter-table-wrap"><table className="la-table"><thead><tr><th>#</th><th>Email address</th><th>Status</th><th>Reason</th></tr></thead><tbody>{visible.map((item, index) => <tr key={`${item.email}:${(page - 1) * PAGE_SIZE + index}`}><td>{(page - 1) * PAGE_SIZE + index + 1}</td><td>{item.email}</td><td><span className={statusClass(item.status)}>{statusLabel(item.status)}</span></td><td>{item.reason}</td></tr>)}</tbody></table>{!filtered.length && <EmptyTable title="No matching results" description="Try another status filter or run validation again." />}</div>
          {totalPages > 1 && <div className="la-email-filter-pagination"><span>Page {page} of {totalPages}</span><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><Icon name="back" size={16}/></button><button type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label="Next page"><Icon name="chevron" size={16}/></button></div>}
        </> : <EmptyTable title="Ready to validate" description="Add emails on the left, then start SMTP validation to see Valid, Risky, Invalid, or Unknown here." />}
      </section>
    </div>
    <p className="la-email-filter-note">Method used: SMTP verification (RCPT TO) after resolving MX/A records. Many hosts block probes and many networks block outbound port 25; those cases stay Unknown. This is not catch-all testing, disposable screening, or proof that mail will be delivered.</p>
    {message && <p className="la-email-filter-message" role="status">{message}</p>}
  </div>
}
