import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type RecordEntry = { id: string; recipient: string; subject: string; sentAt: number; sent?: boolean; loads: number; firstLoad?: string | null; lastLoad: string | null; events?: string[] }

const observedLoads = (count: number): string => count ? `${count} image load${count === 1 ? '' : 's'} observed` : 'No image load observed'
const style = `body{font:14px Arial,sans-serif;color:#21152d;margin:0;background:#fff}main{max-width:900px;margin:40px auto;padding:0 24px}h1{margin:0 0 6px;font-size:28px}p{color:#62556c;line-height:1.5}section{border:1px solid #ded6ec;border-radius:12px;padding:20px;margin:20px 0}label{display:block;font-weight:600;margin:12px 0}input[type=text],input[type=password]{display:block;width:100%;box-sizing:border-box;padding:11px;border:1px solid #DFD9EC;border-radius:8px;margin-top:6px}button{background:#5B12C9;color:white;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}.ticks{display:inline-block;width:20px;height:12px;vertical-align:middle;fill:none;stroke:#A0A4AA;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ticks.sent .tick-first,.ticks.open path{stroke:#5B12C9}.muted{font-size:12px;color:#756987}button:focus-visible,input:focus-visible{outline:2px solid #29CBEA;outline-offset:2px}input[type=text]:focus,input[type=password]:focus{border-color:#5B12C9;outline:none}.hot{margin-left:6px;padding:2px 7px;border-radius:10px;background:#5B12C9;color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;vertical-align:middle}
.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.report-head h2{margin:0}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.metric{padding:12px;border:1px solid #ded6ec;border-radius:10px;background:#F7F4FF}.metric strong{display:block;font-size:22px}.metric span{color:#756987;font-size:12px}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:10px}.toolbar input{flex:1;min-width:200px;margin:0!important}.segments{display:flex;gap:4px;padding:3px;border:1px solid #ded6ec;border-radius:9px}.segments button{padding:7px 11px;background:transparent;color:#62556c;font-size:12px}.segments button[aria-pressed=true]{background:#ECE9FA;color:#5B12C9;font-weight:700}
.emails{margin:0;padding:0;list-style:none}.email{border-top:1px solid #eee}.email-summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:12px;width:100%;padding:12px 6px;border-radius:8px;background:transparent;color:inherit;text-align:left}.email-summary:hover,.email.open .email-summary{background:#F7F4FF}.email{scroll-margin:24px}
.email-main strong,.email-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.email-main small{margin-top:3px;color:#756987;font-size:12px}
.pill{padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700}.pill.opened{background:#ECE9FA;color:#5B12C9}.pill.sent{background:#F1F1F3;color:#62556c}.pill.unsent{background:#FFF4E5;color:#8A4B00}
.email-loads{min-width:46px;text-align:right}.email-loads strong{display:block;font-size:18px}.email-loads small{color:#756987;font-size:11px}
.details{margin:0 6px 14px;padding:14px 16px;border:1px solid #ded6ec;border-radius:10px}.details dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 20px;margin:0}.details dt{color:#756987;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.details dd{margin:3px 0 0;font-size:13px;overflow-wrap:anywhere}.details code{font-size:12px}.details h3{margin:16px 0 8px;font-size:13px}
.timeline{margin:0;padding:8px 12px;border-radius:8px;background:#F7F4FF;list-style:none;font-size:12px;color:#62556c;line-height:1.8}.timeline li{display:flex;justify-content:space-between;gap:12px}.note{margin:10px 0 0;font-size:12px;color:#756987}.empty{color:#756987}
@media (max-width:640px){.metrics{grid-template-columns:repeat(2,1fr)}.details dl{grid-template-columns:1fr}.email-summary{grid-template-columns:auto minmax(0,1fr) auto}.pill{display:none}}`

/** Both gray by default, first purple once the send is confirmed, both purple once an image load is observed. */
function Ticks({ sent, loaded }: { sent: boolean; loaded: boolean }) {
  return <svg className={`ticks ${loaded ? 'open' : sent ? 'sent' : ''}`} viewBox="0 0 20 12" aria-hidden="true"><path className="tick-first" d="M1.5 6.3l3.3 3.3L11.4 3"/><path d="M8.6 8.1l1.5 1.5L16.6 3"/></svg>
}

type Filter = 'all' | 'opened' | 'waiting'
type FocusRequest = { id: string; at: number }

function ago(from: number, to = Date.now()): string {
  const minutes = Math.round(Math.max(0, to - from) / 60000)
  if (minutes < 1) return 'less than a minute'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}
const when = (value: string | number): string => new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function status(record: RecordEntry): { label: string; tone: string } {
  if (record.sent === false) return { label: 'Not sent', tone: 'unsent' }
  return record.loads > 0 ? { label: 'Opened', tone: 'opened' } : { label: 'Sent', tone: 'sent' }
}

/** Everything known about one tracked email: send time, first/last load, count, and load timeline. */
function EmailDetails({ record }: { record: RecordEntry }) {
  const events = record.events ?? []
  const first = record.firstLoad ?? events[events.length - 1] ?? null
  const recipients = record.recipient.split(',').map(value => value.trim()).filter(Boolean)
  return <div className="details">
    <dl>
      <div><dt>Sent</dt><dd>{record.sent === false ? 'Send not confirmed' : when(record.sentAt)}</dd></div>
      <div><dt>Recipient{recipients.length > 1 ? 's' : ''}</dt><dd>{recipients.join(', ') || '-'}</dd></div>
      <div><dt>First load</dt><dd>{first ? `${when(first)} (${ago(record.sentAt, Date.parse(first))} after sending)` : '-'}</dd></div>
      <div><dt>Last load</dt><dd>{record.lastLoad ? `${when(record.lastLoad)} (${ago(Date.parse(record.lastLoad))} ago)` : '-'}</dd></div>
      <div><dt>Observed loads</dt><dd>{observedLoads(record.loads)}</dd></div>
      <div><dt>Tracking ID</dt><dd><code>{record.id}</code></dd></div>
    </dl>
    {recipients.length > 1 && <p className="note">Sent to {recipients.length} recipients with one shared tracking image, so a load can come from any of them. Send separate emails to see who opened.</p>}
    <h3>Load timeline</h3>
    {events.length
      ? <ol className="timeline" aria-label={`Observed image loads for ${record.subject}`}>{events.map((event, index) => <li key={`${event}-${index}`}><span>Load {record.loads - index}</span><span>{when(event)}</span></li>)}</ol>
      : <p className="note">{record.loads ? 'Load times appear once the tracking function with load history is deployed.' : 'No image load observed yet.'}</p>}
    {events.length > 0 && record.loads > events.length && <p className="note">Showing the {events.length} most recent of {record.loads} loads.</p>}
  </div>
}

function EmailReport({ records, onRefresh, focus }: { records: RecordEntry[]; onRefresh: () => void; focus: FocusRequest | null }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  // "View in LeadsGhr" and notification clicks open this page on one email (once per request).
  const handledFocus = useRef(0)
  useEffect(() => {
    if (!focus || focus.at === handledFocus.current || !records.some(record => record.id === focus.id)) return
    handledFocus.current = focus.at
    setQuery('')
    setFilter('all')
    setExpanded(focus.id)
    window.requestAnimationFrame(() => document.getElementById(`email-${focus.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    void chrome.storage.local.remove('focusEmail')
  }, [focus, records])
  const sentRecords = records.filter(record => record.sent !== false)
  const opened = sentRecords.filter(record => record.loads > 0).length
  const totalLoads = records.reduce((total, record) => total + record.loads, 0)
  const term = query.trim().toLowerCase()
  const visible = records.filter(record =>
    (!term || record.subject.toLowerCase().includes(term) || record.recipient.toLowerCase().includes(term)) &&
    (filter === 'all' || (filter === 'opened' ? record.loads > 0 : record.sent !== false && record.loads === 0)))
  const filters: [Filter, string][] = [['all', 'All'], ['opened', 'Opened'], ['waiting', 'Not opened yet']]
  return <section aria-labelledby="report-title">
    <div className="report-head"><h2 id="report-title">Email report</h2><button type="button" onClick={onRefresh}>Refresh counts</button></div>
    <div className="metrics">
      <div className="metric"><strong>{records.length}</strong><span>Tracked emails</span></div>
      <div className="metric"><strong>{opened}</strong><span>Opened</span></div>
      <div className="metric"><strong>{sentRecords.length - opened}</strong><span>Not opened yet</span></div>
      <div className="metric"><strong>{totalLoads}</strong><span>Observed loads</span></div>
    </div>
    <div className="toolbar">
      <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search subject or recipient" aria-label="Search tracked emails" />
      <div className="segments" role="group" aria-label="Filter tracked emails">{filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    </div>
    <ul className="emails">{visible.map(record => {
      const open = expanded === record.id
      const state = status(record)
      return <li key={record.id} id={`email-${record.id}`} className={`email${open ? ' open' : ''}`}>
        <button type="button" className="email-summary" aria-expanded={open} onClick={() => setExpanded(open ? null : record.id)}>
          <Ticks sent={record.sent !== false} loaded={record.loads > 0}/>
          <span className="email-main"><strong>{record.subject}</strong><small>To {record.recipient} · {record.sent === false ? 'not sent' : `sent ${when(record.sentAt)}`}{record.lastLoad ? ` · last load ${ago(Date.parse(record.lastLoad))} ago` : ''}</small></span>
          <span className={`pill ${state.tone}`}>{state.label}{record.loads > 5 && <span className="hot">HOT</span>}</span>
          <span className="email-loads"><strong>{record.loads}</strong><small>{record.loads === 1 ? 'load' : 'loads'}</small></span>
        </button>
        {open && <EmailDetails record={record}/>}
      </li>
    })}</ul>
    {!records.length ? <p className="empty">No tracked emails yet. Compose and send an email in Gmail after setup.</p> : !visible.length && <p className="empty">No tracked emails match this search or filter.</p>}
  </section>
}

function Options() {
  const [endpoint, setEndpoint] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [records, setRecords] = useState<RecordEntry[]>([])
  const [message, setMessage] = useState('')
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  useEffect(() => {
    const load = async () => {
      const data = await chrome.storage.local.get(['endpoint', 'registrationKey', 'enabled', 'records', 'focusEmail'])
      if (data.focusEmail?.id) setFocus(data.focusEmail)
      setEndpoint(data.endpoint ?? '')
      setRegistrationKey(data.registrationKey ?? '')
      setEnabled(data.enabled !== false)
      setRecords(data.records ?? [])
    }
    void load()
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return
      if (changes.records) setRecords(changes.records.newValue ?? [])
      if (changes.focusEmail?.newValue?.id) setFocus(changes.focusEmail.newValue)
    })
  }, [])
  async function save() {
    try {
      if (endpoint && new URL(endpoint).protocol !== 'https:') throw new Error('Use a public HTTPS endpoint.')
      if (endpoint && !await chrome.permissions.request({ origins: [`${new URL(endpoint).origin}/*`] })) throw new Error('Endpoint access was declined.')
      await chrome.storage.local.set({ endpoint: endpoint.trim(), registrationKey, enabled })
      setMessage('Settings saved. Reload Gmail to use them.')
    } catch (error) { setMessage(String(error)) }
  }
  async function refresh() {
    const result = await chrome.runtime.sendMessage({ kind: 'tracking:refresh' }) as { error?: string }
    setMessage(result?.error ?? 'Observed image loads refreshed.')
  }
  return <main><style>{style}</style><h1>LeadsGhr Mail Tracking</h1><p>Gmail compose tracking and image-load indicators. A public tracking endpoint must be configured before real email tracking can work.</p>
    <section><h2>Tracking settings</h2><label>Public HTTPS endpoint<input type="text" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://YOUR_PROJECT.supabase.co/functions/v1/mail-tracking" /></label><label>Registration key<input type="password" value={registrationKey} onChange={event => setRegistrationKey(event.target.value)} placeholder="Server registration key" /></label><label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enable tracking by default</label><button onClick={() => void save()}>Save settings</button><p className="muted">Only opaque pixel tokens are stored online. Recipient and subject stay in this Chrome profile. An image load can come from a mail proxy or preview and does not prove a person read the email. Gmail fetches the image through its proxy and may reuse a cached copy, so repeat opens can go unobserved; counts are observed image loads, not exact opens.</p></section>
    <EmailReport records={records} onRefresh={() => void refresh()} focus={focus}/>
    {message && <p role="status">{message}</p>}</main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>)
