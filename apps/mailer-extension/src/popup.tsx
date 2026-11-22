import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in the styles below
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import { SENDING_ALARM, type SendingActionResponse } from './email-sending/messages'
import { readRecipientsFile } from './email-sending/recipients-file'
import { DATA_CHANGED_KEY } from './email-sending/data-folder'
import { loadDraft, loadHistory, loadJob, loadTemplates, saveDraft } from './email-sending/storage'
import type { Recipient, SavedTemplate, SendHistoryEntry, SendJob } from './email-sending/types'

const MIN_DELAY = 5
const MAX_DELAY = 120

type Option = { id: string; name: string }

const styles = `
  *{box-sizing:border-box}
  html,body{margin:0}
  body{width:360px;background:var(--ui-color-surface);color:var(--ui-color-text);font:var(--ui-text-md)/1.4 var(--ui-font-sans)}
  button,input{font:inherit;color:inherit}
  button{cursor:pointer}
  :focus-visible{outline:2px solid var(--ui-color-primary);outline-offset:2px}
  .app{display:flex;flex-direction:column;height:560px}
  .top{display:flex;align-items:center;gap:var(--ui-space-2-5);padding:var(--ui-space-3) var(--ui-space-3-5);border-bottom:1px solid var(--ui-color-border-subtle)}
  .top img{width:22px;height:22px}
  .top strong{font-size:var(--ui-text-base);font-weight: var(--ui-weight-semibold)}
  .icon-btn{display:grid;place-items:center;width:30px;height:var(--ui-control-height-sm);margin-left:auto;padding:0;border:0;border-radius:var(--ui-button-radius);background:none;color:var(--ui-color-text-muted)}
  .icon-btn:hover{background:var(--ui-color-primary-soft);color:var(--ui-color-text)}
  .icon-btn svg{width:17px;height:17px}
  .body{flex:1;min-height:0;overflow-y:auto;padding:var(--ui-space-3-5)}
  .field-group+.field-group{margin-top:var(--ui-space-4)}
  .label{display:block;margin:0 0 var(--ui-space-1-5);font-size:var(--ui-text-sm);font-weight: var(--ui-weight-semibold);color:var(--ui-color-text)}
  .locked .field-group{opacity:.55}
  .select{position:relative}
  .select-btn{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-2);width:100%;height:var(--ui-control-height-md);padding:0 var(--ui-space-2-5);border:1px solid var(--ui-color-border);border-radius:var(--ui-field-radius);background:var(--ui-color-surface);text-align:left}
  .select-btn:hover:not(:disabled){border-color:var(--ui-color-border-strong)}
  .select-btn[aria-expanded=true]{border-color:var(--ui-color-primary)}
  .select-btn .value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .select-btn .placeholder{color:var(--ui-color-text-tertiary)}
  .select-btn svg{flex:none;width:14px;height:14px;color:var(--ui-color-text-muted)}
  .menu{position:absolute;z-index:5;top:40px;left:0;right:0;max-height:240px;margin:0;padding:var(--ui-space-1) 0;overflow-y:auto;border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-sm);background:var(--ui-color-surface);box-shadow:0 6px 16px color-mix(in srgb, var(--ui-color-text) 10%, transparent);list-style:none}
  .menu .option{padding:var(--ui-space-2) var(--ui-space-2-5);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .menu .option[aria-selected=true]{color:var(--ui-color-primary);font-weight: var(--ui-weight-semibold)}
  .menu .option.active{background:var(--ui-color-primary-soft)}
  .menu .note{padding:var(--ui-space-2) var(--ui-space-2-5);color:var(--ui-color-text-muted)}
  .menu .note .link{padding:0;border:0;background:none;color:var(--ui-color-primary);text-decoration:underline}
  .drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--ui-space-1);width:100%;height:96px;border:1.5px dashed var(--ui-color-primary-muted);border-radius:var(--ui-radius-md);background:var(--ui-color-surface);cursor:pointer}
  .drop:hover,.drop.dragging{border-color:var(--ui-color-primary);background:var(--ui-color-primary-soft)}
  .drop[aria-disabled=true]{cursor:not-allowed}
  .drop svg{width:30px;height:22px}
  .drop span{font-weight: var(--ui-weight-semibold)}
  .drop small{color:var(--ui-color-text-muted);font-size:var(--ui-text-xs)}
  .drop input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  .filebar{display:flex;align-items:center;gap:var(--ui-space-1-5);margin-top:var(--ui-space-2);padding:var(--ui-space-1-5) var(--ui-space-1) var(--ui-space-1-5) var(--ui-space-2-5);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-sm)}
  .filebar .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .remove{display:grid;place-items:center;flex:none;width:24px;height:24px;padding:0;border:0;border-radius:var(--ui-radius-xs);background:none;color:var(--ui-color-text-muted)}
  .remove:hover:not(:disabled){background:var(--ui-color-primary-soft);color:var(--ui-color-text)}
  .remove:disabled{color:var(--ui-color-border-strong);cursor:not-allowed}
  .remove svg{width:13px;height:13px}
  .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--ui-space-2)}
  .grid label{display:block;font-size:var(--ui-text-sm);font-weight: var(--ui-weight-semibold);color:var(--ui-color-text)}
  .grid input{display:block;width:100%;height:var(--ui-control-height-md);margin-top:var(--ui-space-1-5);padding:0 var(--ui-space-2-5);border:1px solid var(--ui-color-border);border-radius:var(--ui-field-radius);background:var(--ui-color-surface)}
  .grid input:focus{border-color:var(--ui-color-primary);outline:none}
  .grid input:disabled{background:var(--ui-color-surface-muted);color:var(--ui-color-text-tertiary)}
  .error{margin:var(--ui-space-2) 0 0;color:var(--ui-color-danger);font-size:var(--ui-text-sm)}
  .foot{padding:var(--ui-space-3) var(--ui-space-3-5);border-top:1px solid var(--ui-color-border-subtle)}
  .progress{display:flex;justify-content:space-between;margin-bottom:var(--ui-space-1-5);font-size:var(--ui-text-sm)}
  .progress span{color:var(--ui-color-text-muted)}
  .track{height:4px;margin-bottom:var(--ui-space-2-5);overflow:hidden;border-radius:var(--ui-radius-xs);background:var(--ui-color-primary-subtle)}
  .track div{height:100%;background:var(--ui-color-primary)}
  .track.paused div{background:var(--ui-color-text-tertiary)}
  .result{margin:0 0 var(--ui-space-2-5);font-size:var(--ui-text-sm);color:var(--ui-color-text)}
  .result.warn{color:var(--ui-color-danger)}
  .actions{display:flex;gap:var(--ui-space-2)}
  .primary{display:flex;flex:1;align-items:center;justify-content:center;gap:var(--ui-space-2);height:36px;border:1px solid var(--ui-color-primary);border-radius:var(--ui-radius-sm);background:var(--ui-color-primary);color:var(--ui-color-on-primary);font-weight: var(--ui-weight-semibold)}
  .primary:hover:not(:disabled){background:var(--ui-color-primary-hover)}
  .primary.outline{background:var(--ui-color-surface);color:var(--ui-color-primary)}
  .primary:disabled{border-color:var(--ui-color-border-subtle);background:var(--ui-color-primary-subtle);color:var(--ui-color-text-tertiary);cursor:not-allowed}
  .primary svg{width:11px;height:11px}
  .stop{display:grid;place-items:center;flex:none;width:36px;height:36px;padding:0;border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-sm);background:var(--ui-color-surface)}
  .stop:before{content:'';width:10px;height:10px;border-radius:var(--ui-radius-xs);background:var(--ui-color-surface-inverse)}
  .stop:hover:not(:disabled){background:var(--ui-color-primary-soft)}
  .stop:disabled{cursor:not-allowed}
  .stop:disabled:before{background:var(--ui-color-border-strong)}
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
          <svg viewBox="0 0 48 34" aria-hidden="true"><path style={{ fill: 'var(--ui-color-primary)' }} d="M38 13.5A14 14 0 0 0 11.2 10 11.5 11.5 0 0 0 12 34h25a10.5 10.5 0 0 0 1-20.5z"/><path style={{ fill: 'var(--ui-color-surface)' }} d="M24 11l-7 7.5h4.6V27h4.8v-8.5H31z"/></svg>
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

// The license screen is the entry point: the popup opens only with an active license key.
createRoot(document.getElementById('root')!).render(<LicenseGate product="mailer" logo="/icon.svg"><Popup /></LicenseGate>)
