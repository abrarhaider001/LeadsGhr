import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SENDING_ALARM, type SendingActionResponse } from './email-sending/messages'
import { readRecipientsFile } from './email-sending/recipients-file'
import { DATA_CHANGED_KEY } from './email-sending/data-folder'
import { loadDraft, loadHistory, loadJob, loadTemplates, saveDraft } from './email-sending/storage'
import type { Recipient, SavedTemplate, SendHistoryEntry, SendJob } from './email-sending/types'

const MIN_DELAY = 5
const MAX_DELAY = 120

type Option = { id: string; name: string }

const styles = `
  @font-face{font-family:'Instrument Sans';src:url('/fonts/InstrumentSans.ttf') format('truetype');font-weight:400 700;font-display:swap}
  *{box-sizing:border-box}
  html,body{margin:0}
  body{width:360px;background:#fff;color:#190B2D;font:13px/1.4 'Instrument Sans',Arial,sans-serif}
  button,input{font:inherit;color:inherit}
  button{cursor:pointer}
  :focus-visible{outline:2px solid #5B12C9;outline-offset:2px}
  .app{display:flex;flex-direction:column;height:560px}
  .top{display:flex;align-items:center;gap:9px;padding:12px 14px;border-bottom:1px solid #ECE8F2}
  .top img{width:22px;height:22px}
  .top strong{font-size:14px;font-weight:600}
  .icon-btn{display:grid;place-items:center;width:30px;height:30px;margin-left:auto;padding:0;border:0;border-radius:6px;background:none;color:#675E76}
  .icon-btn:hover{background:#F4F1F8;color:#190B2D}
  .icon-btn svg{width:17px;height:17px}
  .body{flex:1;min-height:0;overflow-y:auto;padding:14px}
  .field-group+.field-group{margin-top:16px}
  .label{display:block;margin:0 0 6px;font-size:12px;font-weight:600;color:#3A2E4D}
  .locked .field-group{opacity:.55}
  .select{position:relative}
  .select-btn{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:36px;padding:0 10px;border:1px solid #DFD9EC;border-radius:6px;background:#fff;text-align:left}
  .select-btn:hover:not(:disabled){border-color:#C6BCD8}
  .select-btn[aria-expanded=true]{border-color:#5B12C9}
  .select-btn .value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .select-btn .placeholder{color:#8A8197}
  .select-btn svg{flex:none;width:14px;height:14px;color:#675E76}
  .menu{position:absolute;z-index:5;top:40px;left:0;right:0;max-height:240px;margin:0;padding:4px 0;overflow-y:auto;border:1px solid #DFD9EC;border-radius:6px;background:#fff;box-shadow:0 6px 16px rgba(25,11,45,.10);list-style:none}
  .menu .option{padding:7px 10px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .menu .option[aria-selected=true]{color:#5B12C9;font-weight:600}
  .menu .option.active{background:#F4F1F8}
  .menu .note{padding:7px 10px;color:#675E76}
  .menu .note .link{padding:0;border:0;background:none;color:#5B12C9;text-decoration:underline}
  .drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;height:96px;border:1.5px dashed #B9A6E0;border-radius:8px;background:#fff;cursor:pointer}
  .drop:hover,.drop.dragging{border-color:#5B12C9;background:#FBF9FE}
  .drop[aria-disabled=true]{cursor:not-allowed}
  .drop svg{width:30px;height:22px}
  .drop span{font-weight:600}
  .drop small{color:#675E76;font-size:11px}
  .drop input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  .filebar{display:flex;align-items:center;gap:6px;margin-top:8px;padding:6px 4px 6px 10px;border:1px solid #DFD9EC;border-radius:6px}
  .filebar .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .remove{display:grid;place-items:center;flex:none;width:24px;height:24px;padding:0;border:0;border-radius:4px;background:none;color:#675E76}
  .remove:hover:not(:disabled){background:#F4F1F8;color:#190B2D}
  .remove:disabled{color:#B8B0C4;cursor:not-allowed}
  .remove svg{width:13px;height:13px}
  .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .grid label{display:block;font-size:12px;font-weight:600;color:#3A2E4D}
  .grid input{display:block;width:100%;height:36px;margin-top:6px;padding:0 10px;border:1px solid #DFD9EC;border-radius:6px;background:#fff}
  .grid input:focus{border-color:#5B12C9;outline:none}
  .grid input:disabled{background:#F7F6F9;color:#8A8197}
  .error{margin:8px 0 0;color:#B42318;font-size:12px}
  .foot{padding:12px 14px;border-top:1px solid #ECE8F2}
  .progress{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px}
  .progress span{color:#675E76}
  .track{height:4px;margin-bottom:10px;overflow:hidden;border-radius:2px;background:#ECE8F2}
  .track div{height:100%;background:#5B12C9}
  .track.paused div{background:#8A8197}
  .result{margin:0 0 10px;font-size:12px;color:#3A2E4D}
  .result.warn{color:#B42318}
  .actions{display:flex;gap:8px}
  .primary{display:flex;flex:1;align-items:center;justify-content:center;gap:7px;height:36px;border:1px solid #5B12C9;border-radius:6px;background:#5B12C9;color:#fff;font-weight:600}
  .primary:hover:not(:disabled){background:#4E0FB0}
  .primary.outline{background:#fff;color:#5B12C9}
  .primary:disabled{border-color:#ECE8F2;background:#ECE8F2;color:#8A8197;cursor:not-allowed}
  .primary svg{width:11px;height:11px}
  .stop{display:grid;place-items:center;flex:none;width:36px;height:36px;padding:0;border:1px solid #DFD9EC;border-radius:6px;background:#fff}
  .stop:before{content:'';width:10px;height:10px;border-radius:1px;background:#190B2D}
  .stop:hover:not(:disabled){background:#F4F1F8}
  .stop:disabled{cursor:not-allowed}
  .stop:disabled:before{background:#D3CDDC}
`

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Checks Start/End/Delay and returns the error to show, if any. */
function rangeError(from: string, to: string, delaySec: string, total: number): string {
  if (!total) return ''
  const start = Number(from)
  const end = Number(to)
  const delay = Number(delaySec)
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) return 'Start and End must be whole numbers from 1.'
  if (start > end) return 'Start cannot be after End.'
  if (end > total) return `End cannot be more than ${total}.`
  if (!Number.isFinite(delay) || delay < MIN_DELAY || delay > MAX_DELAY) return `Delay must be ${MIN_DELAY}–${MAX_DELAY} seconds.`
  return ''
}

function TemplateSelect({ options, value, disabled, empty, onChange }: {
  options: Option[]; value: string; disabled: boolean; empty: React.ReactNode; onChange(id: string): void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const selected = options.find((item) => item.id === value)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function toggle() {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((item) => item.id === value)))
    setOpen((current) => !current)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(); return }
    if (!open) return
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(options.length - 1, index + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)) }
    else if ((event.key === 'Enter' || event.key === ' ') && options[active]) { event.preventDefault(); onChange(options[active].id); setOpen(false) }
  }

  return <div className="select" ref={root}>
    <button type="button" id="template" className="select-btn" aria-haspopup="listbox" aria-expanded={open} aria-labelledby="template-label template" disabled={disabled} onClick={toggle} onKeyDown={onKeyDown}>
      {selected ? <span className="value">{selected.name}</span> : <span className="value placeholder">Choose a template</span>}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {open && <ul className="menu" role="listbox" aria-labelledby="template-label">
      {options.map((item, index) => <li key={item.id} role="option" aria-selected={item.id === value} className={`option ${index === active ? 'active' : ''}`} onMouseEnter={() => setActive(index)} onClick={() => { onChange(item.id); setOpen(false) }}>{item.name}</li>)}
      {!options.length && <li className="note" role="presentation">{empty}</li>}
    </ul>}
  </div>
}

function Popup() {
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState<SavedTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [fileName, setFileName] = useState('')
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState('')
  const [delaySec, setDelaySec] = useState('10')
  const [job, setJob] = useState<SendJob | null>(null)
  const [history, setHistory] = useState<SendHistoryEntry[]>([])
  const [nextAt, setNextAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    void Promise.all([loadTemplates(), loadDraft(), loadJob(), loadHistory()]).then(([list, draft, currentJob, sends]) => {
      setSaved(list)
      if (draft) {
        setTemplateId(draft.templateId ?? '')
        setRecipients(draft.recipients ?? [])
        setFileName(draft.fileName ?? '')
        setFrom(draft.from || '1')
        setTo(draft.to || '')
        setDelaySec(draft.delaySec || '10')
      }
      setJob(currentJob)
      setHistory(sends)
      setLoaded(true)
    })
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (changes[DATA_CHANGED_KEY]) void loadTemplates().then(setSaved)
      if (changes.sendingJob) setJob((changes.sendingJob.newValue as SendJob | undefined) ?? null)
      if (changes.sendingHistory) setHistory((changes.sendingHistory.newValue as SendHistoryEntry[] | undefined) ?? [])
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  // Keep the inputs when the popup closes.
  useEffect(() => {
    if (loaded) void saveDraft({ templateId, fileName, recipients, from, to, delaySec })
  }, [loaded, templateId, fileName, recipients, from, to, delaySec])

  // Countdown to the next send while a job runs.
  useEffect(() => {
    if (job?.status !== 'running') { setNextAt(null); return }
    const tick = () => {
      setNow(Date.now())
      void chrome.alarms.get(SENDING_ALARM).then((alarm) => setNextAt(alarm?.scheduledTime ?? null))
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [job?.status, job?.cursor])

  const savedOptions: Option[] = saved.map((item) => ({ id: item.id, name: item.name }))
  const savedTemplate = saved.find((item) => item.id === templateId)
  const hasTemplate = !!savedTemplate
  const active = job?.status === 'running' || job?.status === 'paused'
  const error = rangeError(from, to, delaySec, recipients.length)
  const count = !error && recipients.length ? Number(to) - Number(from) + 1 : 0
  const canStart = loaded && !busy && !active && hasTemplate && count > 0

  async function chooseFile(file: File) {
    try {
      const list = await readRecipientsFile(file)
      setRecipients(list)
      setFileName(file.name)
      setFrom('1')
      setTo(String(list.length))
      setMessage('')
    } catch (problem) {
      setMessage(problem instanceof Error ? problem.message : String(problem))
    }
  }

  function clearFile() {
    setRecipients([])
    setFileName('')
    setFrom('1')
    setTo('')
    setMessage('')
  }

  async function control(kind: 'sending:start' | 'sending:pause' | 'sending:resume' | 'sending:cancel') {
    setBusy(true)
    setMessage('')
    try {
      const payload = kind === 'sending:start'
        ? {
            kind,
            template: { subject: savedTemplate?.subject ?? '', bodyHtml: savedTemplate?.bodyHtml ?? '' },
            recipients,
            range: { from: Number(from), to: Number(to) },
            delayMs: Number(delaySec) * 1000,
          }
        : { kind }
      const result = await chrome.runtime.sendMessage(payload) as SendingActionResponse
      if (!result.ok) throw new Error(result.error)
      setJob(result.job)
    } catch (problem) {
      setMessage(problem instanceof Error ? problem.message : String(problem))
    } finally { setBusy(false) }
  }

  const footer = useMemo(() => {
    if (!job) return null
    const total = job.recipients.length
    const done = Math.min(job.cursor, total)
    const failed = history.filter((entry) => entry.jobId === job.id && entry.status === 'failed').length
    return { total, done, failed, nextIndex: job.recipients[job.cursor]?.index }
  }, [job, history])

  const waitSec = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : null
  const percent = footer && footer.total ? Math.round((footer.done / footer.total) * 100) : 0

  let status: React.ReactNode = null
  if (job?.status === 'running' && footer) {
    status = <><div className="progress"><b>{footer.done} of {footer.total} sent</b><span>{waitSec && waitSec > 1 ? `Next in ${waitSec}s` : 'Sending…'}</span></div><div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={footer.total} aria-valuenow={footer.done} aria-label="Sending progress"><div style={{ width: `${percent}%` }}/></div></>
  } else if (job?.status === 'paused' && footer) {
    status = <><div className="progress"><b>Paused at {footer.done} of {footer.total}</b><span>{footer.nextIndex ? `Resumes at row ${footer.nextIndex}` : ''}</span></div><div className="track paused" role="progressbar" aria-valuemin={0} aria-valuemax={footer.total} aria-valuenow={footer.done} aria-label="Sending progress"><div style={{ width: `${percent}%` }}/></div></>
  } else if (job && footer && job.status === 'completed') {
    status = <p className="result" role="status">Sent {footer.done} of {footer.total}{footer.failed ? `, ${footer.failed} failed` : ''}.</p>
  } else if (job && footer && job.status === 'failed') {
    status = <p className="result warn" role="alert">Stopped at {footer.done + 1} of {footer.total}: {job.lastError ?? 'sending failed'}</p>
  } else if (job && footer && job.status === 'cancelled') {
    status = <p className="result" role="status">Stopped after {footer.done} of {footer.total}.</p>
  }

  const play = <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3.5v17l14-8.5z"/></svg>
  const primary = job?.status === 'running'
    ? <button type="button" className="primary" disabled={busy} onClick={() => void control('sending:pause')}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>Pause</button>
    : job?.status === 'paused'
      ? <button type="button" className="primary outline" disabled={busy} onClick={() => void control('sending:resume')}>{play}Resume</button>
      : <button type="button" className="primary" disabled={!canStart} onClick={() => void control('sending:start')}>{play}{busy ? 'Starting…' : count > 0 ? `Send ${plural(count, 'email')}` : 'Start sending'}</button>

  return <div className="app">
    <style>{styles}</style>
    <header className="top">
      <img src="/icon.png" alt=""/>
      <strong>LeadsGhr Mailer</strong>
      <button type="button" className="icon-btn" aria-label="Settings" title="Settings" onClick={() => void chrome.runtime.openOptionsPage()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
      </button>
    </header>

    <div className={`body ${active ? 'locked' : ''}`}>
      <div className="field-group">
        <span className="label" id="template-label">Template</span>
        <TemplateSelect options={savedOptions} value={templateId} disabled={active} onChange={setTemplateId}
          empty={<>No templates saved yet. <button type="button" className="link" onClick={() => void chrome.runtime.openOptionsPage()}>Create one in settings</button></>}/>
      </div>

      <div className="field-group grid">
        <label>Start<input type="number" inputMode="numeric" min={1} max={recipients.length || undefined} value={from} disabled={!recipients.length || active} onChange={(event) => setFrom(event.target.value)}/></label>
        <label>End<input type="number" inputMode="numeric" min={1} max={recipients.length || undefined} value={recipients.length ? to : ''} disabled={!recipients.length || active} onChange={(event) => setTo(event.target.value)}/></label>
        <label>Delay (s)<input type="number" inputMode="numeric" min={MIN_DELAY} max={MAX_DELAY} value={delaySec} disabled={active} onChange={(event) => setDelaySec(event.target.value)}/></label>
      </div>

      <div className="field-group">
        <span className="label">Recipients</span>
        <label className={`drop ${dragging ? 'dragging' : ''}`} aria-disabled={active}
          onDragOver={(event) => { if (active) return; event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file && !active) void chooseFile(file) }}>
          <svg viewBox="0 0 48 34" aria-hidden="true"><path fill="#5B12C9" d="M38 13.5A14 14 0 0 0 11.2 10 11.5 11.5 0 0 0 12 34h25a10.5 10.5 0 0 0 1-20.5z"/><path fill="#fff" d="M24 11l-7 7.5h4.6V27h4.8v-8.5H31z"/></svg>
          <span>Browse files to upload</span>
          <small>.csv or .xlsx</small>
          <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={active} aria-label="Upload a CSV or Excel file of recipients"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void chooseFile(file); event.currentTarget.value = '' }}/>
        </label>
        {fileName && <div className="filebar">
          <span className="name" title={fileName}>{fileName}</span>
          <button type="button" className="remove" aria-label={`Remove ${fileName}`} title="Remove file" disabled={active} onClick={clearFile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>}
      </div>
      {error && !active && <p className="error" role="alert">{error}</p>}
      {message && <p className="error" role="alert">{message}</p>}
    </div>

    <footer className="foot">
      {status}
      <div className="actions">
        {primary}
        <button type="button" className="stop" aria-label="Stop sending" title="Stop" disabled={busy || !active} onClick={() => void control('sending:cancel')}/>
      </div>
    </footer>
  </div>
}

createRoot(document.getElementById('root')!).render(<Popup />)
