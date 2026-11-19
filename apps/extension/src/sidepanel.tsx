import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'


const style = `@font-face{font-family:'Instrument Sans';src:url('/fonts/InstrumentSans.ttf') format('truetype');font-weight:400 700;font-display:swap}
body{font:14px 'Instrument Sans',Arial,sans-serif;color:#21152d;margin:0;background:#fff}main{max-width:900px;margin:40px auto;padding:0 24px}.brand{display:flex;align-items:center;gap:12px}.brand img{width:40px;height:40px}h1{margin:0;font-size:28px}h2{margin:0 0 8px;font-size:20px}h3{margin:20px 0 8px;font-size:15px}p{color:#62556c;line-height:1.5}section{border:1px solid #ded6ec;border-radius:12px;padding:20px;margin:20px 0}label{display:block;font-weight:600;margin:12px 0}input[type=text],input[type=password]{display:block;width:100%;box-sizing:border-box;padding:11px;border:1px solid #DFD9EC;border-radius:8px;margin-top:6px;font:inherit;font-weight:400}input[type=text]:focus,input[type=password]:focus{border-color:#5B12C9;outline:none}input[type=checkbox]{accent-color:#5B12C9}button{background:#5B12C9;color:#fff;border:0;border-radius:6px;padding:9px 14px;cursor:pointer;font:inherit;font-weight:600}button:focus-visible{outline:2px solid #29CBEA;outline-offset:2px}.muted{font-size:12px;color:#756987}.ticks{display:inline-block;width:20px;height:12px;vertical-align:middle;fill:none;stroke:#A0A4AA;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ticks.sent .tick-first,.ticks.open path{stroke:#5B12C9}.hot{margin-left:6px;padding:2px 7px;border-radius:10px;background:#5B12C9;color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;vertical-align:middle}
.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.report-head h2{margin:0}.report-head button{background:#fff;color:#352254;border:1px solid #DFD9EC}.report-head button:hover{background:#f7f4ff}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.metric{padding:12px;border:1px solid #ded6ec;border-radius:10px;background:#F7F4FF}.metric strong{display:block;font-size:22px}.metric span{color:#756987;font-size:12px}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:10px}.toolbar input{flex:1;min-width:200px;margin:0!important}.segments{display:flex;gap:4px;padding:3px;border:1px solid #ded6ec;border-radius:9px}.segments button{padding:7px 11px;background:transparent;color:#62556c;font-size:12px}.segments button[aria-pressed=true]{background:#ECE9FA;color:#5B12C9;font-weight:700}
.emails{margin:0;padding:0;list-style:none}.email{border-top:1px solid #eee}.email-summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:12px;width:100%;padding:12px 6px;border-radius:8px;background:transparent;color:inherit;text-align:left}.email-summary:hover,.email.open .email-summary{background:#F7F4FF}.email{scroll-margin:24px}
.email-main strong,.email-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.email-main small{margin-top:3px;color:#756987;font-size:12px}
.pill{padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700}.pill.opened{background:#ECE9FA;color:#5B12C9}.pill.sent{background:#F1F1F3;color:#62556c}.pill.unsent{background:#FFF4E5;color:#8A4B00}
.email-loads{min-width:46px;text-align:right}.email-loads strong{display:block;font-size:18px}.email-loads small{color:#756987;font-size:11px}
.details{margin:0 6px 14px;padding:14px 16px;border:1px solid #ded6ec;border-radius:10px}.details dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 20px;margin:0}.details dt{color:#756987;font-size:12px;font-weight:600}.details dd{margin:3px 0 0;font-size:13px;overflow-wrap:anywhere}.details code{font-size:12px}.details h3{margin:16px 0 8px;font-size:13px}
.timeline{margin:0;padding:8px 12px;border-radius:8px;background:#F7F4FF;list-style:none;font-size:12px;color:#62556c;line-height:1.8}.timeline li{display:flex;justify-content:space-between;gap:12px}.note{margin:10px 0 0;font-size:12px;color:#756987}.empty{color:#756987}
@media (max-width:640px){.metrics{grid-template-columns:repeat(2,1fr)}.details dl{grid-template-columns:1fr}.email-summary{grid-template-columns:auto minmax(0,1fr) auto}.pill{display:none}}`

function Options() {
  const [endpoint, setEndpoint] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const load = async () => {
      const data = await chrome.storage.local.get(['endpoint', 'registrationKey', 'enabled'])
      setEndpoint(data.endpoint ?? '')
      setRegistrationKey(data.registrationKey ?? '')
      setEnabled(data.enabled !== false)
    }
    void load()
  }, [])
  async function save() {
    try {
      if (endpoint && new URL(endpoint).protocol !== 'https:') throw new Error('Use a public HTTPS endpoint.')
      if (endpoint && !await chrome.permissions.request({ origins: [`${new URL(endpoint).origin}/*`] })) throw new Error('Endpoint access was declined.')
      await chrome.storage.local.set({ endpoint: endpoint.trim(), registrationKey, enabled })
      setMessage('Settings saved. Reload Gmail to use them.')
    } catch (error) { setMessage(String(error)) }
  }
  return <main><style>{style}</style><div className="brand"><img src="/icon.png" alt=""/><h1>LeadsGhr Tracker</h1></div><p>See when emails you send from Gmail are opened. Set the tracking endpoint and registration key once below.</p>
    <section><h2>Tracking settings</h2><label>Public HTTPS endpoint<input type="text" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://YOUR_PROJECT.supabase.co/functions/v1/mail-tracking" /></label><label>Registration key<input type="password" value={registrationKey} onChange={event => setRegistrationKey(event.target.value)} placeholder="Server registration key" /></label><label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enable tracking by default</label><button onClick={() => void save()}>Save settings</button><p className="muted">Only opaque pixel tokens are stored online. Recipient and subject stay in this Chrome profile. An image load can come from a mail proxy or preview and does not prove a person read the email. Gmail fetches the image through its proxy and may reuse a cached copy, so repeat opens can go unobserved; counts are observed image loads, not exact opens.</p></section>
    {message && <p role="status">{message}</p>}</main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><LicenseGate product="tracker" logo="/icon.svg"><Options /></LicenseGate></React.StrictMode>)
