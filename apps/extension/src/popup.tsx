import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type TrackingRecord = { id: string; recipient: string; subject: string; sentAt: number; loads: number; lastLoad: string | null }
type PopupTab = 'report' | 'settings'

const styles = `
  *{box-sizing:border-box}body{width:340px;margin:0;background:#fff;color:#190B2D;font:13px Arial,sans-serif}button{font:inherit;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #29CBEA;outline-offset:2px}
  .top{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid #DFD9EC}.brand{display:flex;align-items:center;gap:10px}.brand img{width:30px;height:30px;object-fit:contain}.brand strong{font-size:17px;letter-spacing:-.03em}.version{padding:4px 7px;border-radius:12px;background:#ECE9FA;color:#675E76;font-size:10px}
  .nav{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:13px 14px 0}.nav button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:39px;border:1px solid #DFD9EC;border-radius:9px;background:#fff;color:#675E76}.nav button[aria-selected=true]{background:#ECE9FA;border-color:#DFD9EC;color:#5B12C9;font-weight:700}.nav svg{width:16px;height:16px}
  .content{min-height:205px;padding:20px 18px 18px}.eyebrow{margin:0 0 12px;color:#675E76;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.metric{padding:12px 10px;border:1px solid #DFD9EC;border-radius:10px;background:#F7F4FF}.metric strong{display:block;font-size:20px;line-height:1.2}.metric span{color:#675E76;font-size:10px}.empty{margin:14px 0;color:#675E76;line-height:1.5}.recent{margin-top:16px}.recent h2{margin:0 0 8px;font-size:12px}.record{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #DFD9EC}.record-main{min-width:0}.record strong,.record small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record strong{font-size:12px}.record small{margin-top:3px;color:#675E76;font-size:10px}.ticks{flex:none;color:#AAAAAA;font-weight:700}.ticks.open{color:#5B12C9}
  .setting-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px;border:1px solid #DFD9EC;border-radius:10px;background:#F7F4FF}.setting-row strong,.setting-row small{display:block}.setting-row small{margin-top:4px;color:#675E76;font-size:11px;line-height:1.35}.switch{position:relative;flex:none;width:37px;height:22px;appearance:none;border:1px solid #AAAAAA;border-radius:20px;background:#D9D9DE;cursor:pointer}.switch:checked{border-color:#5B12C9;background:#5B12C9}.switch:after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:white;transition:transform .15s}.switch:checked:after{transform:translateX(15px)}.connection{display:flex;align-items:center;gap:8px;margin:13px 1px;color:#675E76;font-size:11px}.dot{width:7px;height:7px;border-radius:50%;background:#AAAAAA}.dot.ready{background:#5B12C9}.note{margin:12px 0 0;color:#675E76;font-size:10px;line-height:1.5}
  .footer{display:flex;gap:8px;padding:12px 18px 17px;border-top:1px solid #DFD9EC}.footer button{flex:1;min-height:36px;border:1px solid #DFD9EC;border-radius:8px;background:#fff;color:#190B2D}.footer button.primary{border-color:#5B12C9;background:#5B12C9;color:#fff;font-weight:700}.footer button:hover{filter:brightness(.95)}.status{margin:0 18px 14px;color:#5B12C9;font-size:11px;line-height:1.4}
`

function Icon({ kind }: { kind: 'report' | 'settings' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'report' ? <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 15l3-3 2 2 5-5"/></> : <><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}
  </svg>
}

function Popup() {
  const [tab, setTab] = useState<PopupTab>('report')
  const [enabled, setEnabled] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [records, setRecords] = useState<TrackingRecord[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    void chrome.storage.local.get(['enabled', 'endpoint', 'registrationKey', 'records']).then(data => {
      setEnabled(data.enabled !== false)
      setConfigured(Boolean(data.endpoint && data.registrationKey))
      setRecords(Array.isArray(data.records) ? data.records : [])
    }).catch(error => setStatus(String(error)))
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (changes.enabled) setEnabled(changes.enabled.newValue !== false)
      if (changes.records) setRecords(Array.isArray(changes.records.newValue) ? changes.records.newValue : [])
      if (changes.endpoint || changes.registrationKey) {
        void chrome.storage.local.get(['endpoint', 'registrationKey']).then(data => setConfigured(Boolean(data.endpoint && data.registrationKey)))
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  async function changeEnabled(next: boolean) {
    try {
      await chrome.storage.local.set({ enabled: next })
      setEnabled(next)
      setStatus('Saved. Reload Gmail to update open compose windows.')
    } catch (error) { setStatus(String(error)) }
  }

  async function refresh() {
    try {
      const result = await chrome.runtime.sendMessage({ kind: 'tracking:refresh' }) as { error?: string }
      if (result?.error) throw new Error(result.error)
      const data = await chrome.storage.local.get('records')
      setRecords(Array.isArray(data.records) ? data.records : [])
      setStatus('Image-load counts refreshed.')
    } catch (error) { setStatus(String(error)) }
  }

  const opened = records.filter(record => record.loads > 0).length
  const loads = records.reduce((total, record) => total + record.loads, 0)
  return <><style>{styles}</style>
    <header className="top"><div className="brand"><img src="/icon.png" alt=""/><strong>LeadsGhr</strong></div><span className="version">v{chrome.runtime.getManifest().version}</span></header>
    <nav className="nav" aria-label="Extension sections"><button type="button" aria-selected={tab === 'report'} onClick={() => setTab('report')}><Icon kind="report"/>Tracking report</button><button type="button" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}><Icon kind="settings"/>Settings</button></nav>
    <main className="content">{tab === 'report' ? <><p className="eyebrow">Image-load activity</p><div className="metrics"><div className="metric"><strong>{records.length}</strong><span>Tracked</span></div><div className="metric"><strong>{opened}</strong><span>With loads</span></div><div className="metric"><strong>{loads}</strong><span>Total loads</span></div></div><div className="recent"><h2>Recent messages</h2>{records.slice(0, 3).map(record => <div className="record" key={record.id}><div className="record-main"><strong>{record.subject}</strong><small>{record.recipient}</small></div><span className={`ticks ${record.loads ? 'open' : ''}`} aria-label={`${record.loads} image loads`}>{record.loads ? '✓✓' : '✓'} {record.loads}</span></div>)}{records.length === 0 && <p className="empty">No tracked messages yet. Set up tracking, then send a message from Gmail.</p>}</div></> : <><p className="eyebrow">Basic settings</p><label className="setting-row"><span><strong>Tracking by default</strong><small>Start new Gmail drafts with tracking on.</small></span><input className="switch" type="checkbox" checked={enabled} onChange={event => void changeEnabled(event.target.checked)} aria-label="Enable tracking by default"/></label><p className="connection"><span className={`dot ${configured ? 'ready' : ''}`}/>{configured ? 'Public endpoint configured' : 'Public endpoint needs setup'}</p><p className="note">Configure the HTTPS endpoint and registration key in full settings. Image loads do not prove a person read the email.</p></>}</main>
    <footer className="footer">{tab === 'report' && <button type="button" onClick={() => void refresh()}>Refresh counts</button>}<button className="primary" type="button" onClick={() => void chrome.runtime.openOptionsPage()}>Open full settings</button></footer>
    {status && <p className="status" role="status">{status}</p>}
  </>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Popup /></React.StrictMode>)
