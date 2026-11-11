import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type RecordEntry = { id: string; recipient: string; subject: string; sentAt: number; loads: number; lastLoad: string | null }
const style = `body{font:14px Arial,sans-serif;color:#21152d;margin:0;background:#fff}main{max-width:900px;margin:40px auto;padding:0 24px}h1{margin:0 0 6px;font-size:28px}p{color:#62556c;line-height:1.5}section{border:1px solid #ded6ec;border-radius:12px;padding:20px;margin:20px 0}label{display:block;font-weight:600;margin:12px 0}input[type=text],input[type=password]{display:block;width:100%;box-sizing:border-box;padding:11px;border:1px solid #cfc7d8;border-radius:8px;margin-top:6px}button{background:#5B12C9;color:white;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}.row{display:flex;justify-content:space-between;gap:16px;padding:10px;border-top:1px solid #eee}.ticks{color:#9aa0a6;font-weight:700}.ticks.open{color:#5B12C9}.muted{font-size:12px;color:#756987}`

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
    setMessage(result?.error ?? 'Image-load counts refreshed.')
  }
  return <main><style>{style}</style><h1>LeadsGhr Mail Tracking</h1><p>Gmail compose tracking and image-load indicators. A public tracking endpoint must be configured before real email tracking can work.</p>
    <section><h2>Tracking settings</h2><label>Public HTTPS endpoint<input type="text" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://YOUR_PROJECT.supabase.co/functions/v1/mail-tracking" /></label><label>Registration key<input type="password" value={registrationKey} onChange={event => setRegistrationKey(event.target.value)} placeholder="Server registration key" /></label><label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enable tracking by default</label><button onClick={() => void save()}>Save settings</button><p className="muted">Only opaque pixel tokens are stored online. Recipient and subject stay in this Chrome profile. An image load can come from a mail proxy or preview and does not prove a person read the email.</p></section>
    <section><h2>Tracked messages</h2><button onClick={() => void refresh()}>Refresh counts</button>{records.map(record => <div className="row" key={record.id}><div><strong>{record.subject}</strong><div className="muted">To: {record.recipient} · {new Date(record.sentAt).toLocaleString()}</div></div><div><span className={`ticks ${record.loads ? 'open' : ''}`}>✓✓</span> {record.loads} image loads</div></div>)}{!records.length && <p>No tracked messages yet. Compose and send an email in Gmail after setup.</p>}</section>{message && <p role="status">{message}</p>}</main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>)
