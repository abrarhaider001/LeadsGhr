import { useEffect, useMemo, useState } from 'react'
import { recipientsFromCsv } from './csv'
import { loadHistory, loadJob } from './storage'
import { readTemplateFile } from './template'
import type { Recipient, SendHistoryEntry, SendJob, Template } from './types'
import type { SendingActionResponse } from './messages'

async function sendMessage<T>(payload: unknown): Promise<T> {
  return chrome.runtime.sendMessage(payload) as Promise<T>
}

export function EmailSendingPanel() {
  const [template, setTemplate] = useState<Template>({ subject: '', bodyHtml: '' })
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [fileName, setFileName] = useState('')
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState('1')
  const [delaySec, setDelaySec] = useState('10')
  const [job, setJob] = useState<SendJob | null>(null)
  const [history, setHistory] = useState<SendHistoryEntry[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setJob(await loadJob())
    setHistory(await loadHistory())
  }

  useEffect(() => {
    void refresh()
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (changes.sendingJob) setJob((changes.sendingJob.newValue as SendJob | undefined) ?? null)
      if (changes.sendingHistory) setHistory((changes.sendingHistory.newValue as SendHistoryEntry[] | undefined) ?? [])
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  useEffect(() => {
    if (recipients.length) setTo(String(recipients.length))
  }, [recipients.length])

  const selectedCount = useMemo(() => {
    const start = Number.parseInt(from, 10)
    const end = Number.parseInt(to, 10)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) return 0
    return Math.max(0, Math.min(end, recipients.length) - start + 1)
  }, [from, to, recipients.length])

  async function onTemplateFile(file: File) {
    try {
      const next = await readTemplateFile(file)
      setTemplate(next)
      setMessage(`Template loaded from ${file.name}.`)
    } catch (error) { setMessage(String(error)) }
  }

  async function onCsvFile(file: File) {
    try {
      if (file.size > 5_000_000) throw new Error('CSV must be smaller than 5 MB.')
      const next = recipientsFromCsv(await file.text())
      if (!next.length) throw new Error('No valid email addresses found in that CSV.')
      setRecipients(next)
      setFileName(file.name)
      setFrom('1')
      setTo(String(next.length))
      setMessage(`${next.length} recipient${next.length === 1 ? '' : 's'} loaded from ${file.name}.`)
    } catch (error) {
      setRecipients([])
      setFileName('')
      setMessage(String(error))
    }
  }

  async function run(kind: 'sending:start' | 'sending:pause' | 'sending:resume' | 'sending:cancel') {
    setBusy(true)
    try {
      const payload = kind === 'sending:start'
        ? {
            kind,
            template,
            recipients,
            range: { from: Number.parseInt(from, 10), to: Number.parseInt(to, 10) },
            delayMs: Number.parseFloat(delaySec) * 1000,
          }
        : { kind }
      const result = await sendMessage<SendingActionResponse>(payload)
      if (!result.ok) throw new Error(result.error)
      setJob(result.job)
      setMessage(kind === 'sending:start' ? 'Send job started. Keep Gmail open while messages go out.' : `Job ${kind.replace('sending:', '')}ed.`)
      await refresh()
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  const progress = job ? `${Math.min(job.cursor, job.recipients.length)} / ${job.recipients.length}` : '0 / 0'
  const active = job?.status === 'running' || job?.status === 'paused'

  return <section>
    <h2>Email sending</h2>
    <p className="muted">Load a template, import a CSV, choose an inclusive recipient range, then send through your open Gmail tab one message at a time.</p>
    <label>Subject<input type="text" value={template.subject} onChange={(event) => setTemplate((current) => ({ ...current, subject: event.target.value }))} placeholder="Quick hello for {{name}}" maxLength={200} /></label>
    <label>Template body (HTML or text)<textarea value={template.bodyHtml} onChange={(event) => setTemplate((current) => ({ ...current, bodyHtml: event.target.value }))} rows={8} placeholder={"Hi {{name}},\n\nWe help teams like {{company}}.\n\nThanks"} /></label>
    <label>Load template file<input type="file" accept=".html,.htm,.txt,.json,text/html,text/plain,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onTemplateFile(file); event.currentTarget.value = '' }} /></label>
    <label>Recipients CSV<input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onCsvFile(file); event.currentTarget.value = '' }} /></label>
    {fileName && <p className="muted">{fileName} · {recipients.length} emails</p>}
    <div className="grid">
      <label>From #<input type="number" min={1} value={from} onChange={(event) => setFrom(event.target.value)} disabled={!recipients.length || active} /></label>
      <label>To #<input type="number" min={1} value={to} onChange={(event) => setTo(event.target.value)} disabled={!recipients.length || active} /></label>
      <label>Delay (sec)<input type="number" min={5} max={120} step={1} value={delaySec} onChange={(event) => setDelaySec(event.target.value)} disabled={active} /></label>
    </div>
    <p className="muted">{selectedCount} message{selectedCount === 1 ? '' : 's'} in range · placeholders like {'{{email}}'} and CSV column names are supported</p>
    <div className="actions">
      <button type="button" disabled={busy || active || !recipients.length || !template.subject.trim() || !template.bodyHtml.trim()} onClick={() => void run('sending:start')}>Start sending</button>
      <button type="button" disabled={busy || job?.status !== 'running'} onClick={() => void run('sending:pause')}>Pause</button>
      <button type="button" disabled={busy || job?.status !== 'paused'} onClick={() => void run('sending:resume')}>Resume</button>
      <button type="button" disabled={busy || !active} onClick={() => void run('sending:cancel')}>Cancel</button>
    </div>
    <div className="status-box">
      <strong>Status:</strong> {job?.status ?? 'idle'} · <strong>Progress:</strong> {progress}
      {job?.lastError && <p role="alert">{job.lastError}</p>}
    </div>
    <h3>Recent sends</h3>
    <div className="actions"><button type="button" disabled={busy || !history.length} onClick={() => void sendMessage({ kind: 'sending:clear-history' }).then(refresh)}>Clear history</button></div>
    {history.slice(0, 40).map((entry) => <div className="row" key={entry.id}>
      <div><strong>{entry.subject}</strong><div className="muted">To: {entry.email} · {new Date(entry.sentAt).toLocaleString()}</div>{entry.error && <div className="muted">{entry.error}</div>}</div>
      <div>{entry.status}</div>
    </div>)}
    {!history.length && <p className="muted">No sends yet.</p>}
    {message && <p role="status">{message}</p>}
  </section>
}
