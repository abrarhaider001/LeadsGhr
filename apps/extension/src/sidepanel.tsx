import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type RecordEntry = { id: string; recipient: string; subject: string; sentAt: number; sent?: boolean; loads: number; firstLoad?: string | null; lastLoad: string | null; events?: string[] }

const observedLoads = (count: number): string => count ? `${count} image load${count === 1 ? '' : 's'} observed` : 'No image load observed'
const style = `body{font:14px Arial,sans-serif;color:#21152d;margin:0;background:#fff}main{max-width:900px;margin:40px auto;padding:0 24px}h1{margin:0 0 6px;font-size:28px}p{color:#62556c;line-height:1.5}section{border:1px solid #ded6ec;border-radius:12px;padding:20px;margin:20px 0}label{display:block;font-weight:600;margin:12px 0}input[type=text],input[type=password]{display:block;width:100%;box-sizing:border-box;padding:11px;border:1px solid #cfc7d8;border-radius:8px;margin-top:6px}button{background:#5B12C9;color:white;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}.row{display:flex;justify-content:space-between;gap:16px;padding:10px;border-top:1px solid #eee}.ticks{display:inline-block;width:20px;height:12px;vertical-align:middle;fill:none;stroke:#A0A4AA;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ticks.sent .tick-first,.ticks.open path{stroke:#1E8E3E}.muted{font-size:12px;color:#756987}.row-main{min-width:0}.row-side{flex:none;text-align:right}details{margin-top:6px}summary{cursor:pointer;color:#5B12C9;font-size:12px}details ol{margin:6px 0 0;padding-left:20px;font-size:12px;color:#62556c;line-height:1.6}`

/** Both gray by default, first green once the send is confirmed, both green once an image load is observed. */
function Ticks({ sent, loaded }: { sent: boolean; loaded: boolean }) {
  return <svg className={`ticks ${loaded ? 'open' : sent ? 'sent' : ''}`} viewBox="0 0 20 12" aria-hidden="true"><path className="tick-first" d="M1.5 6.3l3.3 3.3L11.4 3"/><path d="M8.6 8.1l1.5 1.5L16.6 3"/></svg>
}

function Options() {
  const [endpoint, setEndpoint] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [records, setRecords] = useState<RecordEntry[]>([])
  const [message, setMessage] = useState('')
  useEffect(() => {
    const load = async () => {
      const data = await chrome.storage.local.get(['endpoint', 'registrationKey', 'enabled', 'records'])
      setEndpoint(data.endpoint ?? '')
      setRegistrationKey(data.registrationKey ?? '')
      setEnabled(data.enabled !== false)
      setRecords(data.records ?? [])
    }
    void load()
    chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.records) setRecords(changes.records.newValue ?? []) })
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
    <section><h2>Tracked messages</h2><button onClick={() => void refresh()}>Refresh counts</button>{records.map(record => <div className="row" key={record.id}>
      <div className="row-main"><strong>{record.subject}</strong><div className="muted">To: {record.recipient} · {record.sent === false ? 'Not sent yet' : `Sent ${new Date(record.sentAt).toLocaleString()}`}</div>
        {record.firstLoad && <div className="muted">First observed {new Date(record.firstLoad).toLocaleString()}{record.lastLoad && record.loads > 1 ? ` · last observed ${new Date(record.lastLoad).toLocaleString()}` : ''}</div>}
        {!!record.events?.length && <details><summary>Observed image-load history</summary><ol reversed>{record.events.map((event, index) => <li key={`${event}-${index}`}>{new Date(event).toLocaleString()}</li>)}</ol></details>}
      </div>
      <div className="row-side"><Ticks sent={record.sent !== false} loaded={record.loads > 0}/> {observedLoads(record.loads)}</div>
    </div>)}{!records.length && <p>No tracked messages yet. Compose and send an email in Gmail after setup.</p>}</section>{message && <p role="status">{message}</p>}</main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>)
