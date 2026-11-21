import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in the styles below
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'


const style = `
body{font:var(--ui-text-base) var(--ui-font-sans);color:var(--ui-color-text);margin:0;background:var(--ui-color-surface)}main{max-width:900px;margin:var(--ui-space-10) auto;padding:0 var(--ui-space-6)}.brand{display:flex;align-items:center;gap:var(--ui-space-3)}.brand img{width:40px;height:40px}h1{margin:0;font-size:var(--ui-text-6xl)}h2{margin:0 0 var(--ui-space-2);font-size:var(--ui-text-3xl)}h3{margin:var(--ui-space-5) 0 var(--ui-space-2);font-size:var(--ui-text-lg)}p{color:var(--ui-color-text-muted);line-height:1.5}section{border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-xl);padding:var(--ui-space-5);margin:var(--ui-space-5) 0}label{display:block;font-weight: var(--ui-weight-semibold);margin:var(--ui-space-3) 0}input[type=text],input[type=password]{display:block;width:100%;box-sizing:border-box;padding:var(--ui-space-3);border:1px solid var(--ui-color-border);border-radius:var(--ui-field-radius);margin-top:var(--ui-space-1-5);font:inherit;font-weight: var(--ui-weight-regular)}input[type=text]:focus,input[type=password]:focus{border-color:var(--ui-color-primary);outline:none}input[type=checkbox]{accent-color:var(--ui-color-primary)}button{background:var(--ui-color-primary);color:var(--ui-color-on-primary);border:0;border-radius:var(--ui-button-radius);padding:var(--ui-space-2-5) var(--ui-space-3-5);cursor:pointer;font:inherit;font-weight: var(--ui-weight-semibold)}button:focus-visible{outline:2px solid var(--ui-color-focus);outline-offset:2px}.muted{font-size:var(--ui-text-sm);color:var(--ui-color-text-muted)}.ticks{display:inline-block;width:20px;height:12px;vertical-align:middle;fill:none;stroke:var(--ui-color-text-disabled);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ticks.sent .tick-first,.ticks.open path{stroke:var(--ui-color-primary)}.hot{margin-left:var(--ui-space-1-5);padding:var(--ui-space-0-5) var(--ui-space-2);border-radius:var(--ui-radius-lg);background:var(--ui-color-primary);color:var(--ui-color-on-primary);font-size:var(--ui-text-2xs);font-weight: var(--ui-weight-bold);letter-spacing:.06em;vertical-align:middle}
.report-head{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-3)}.report-head h2{margin:0}.report-head button{background:var(--ui-color-surface);color:var(--ui-color-text);border:1px solid var(--ui-color-border)}.report-head button:hover{background:var(--ui-color-primary-soft)}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--ui-space-2-5);margin:var(--ui-space-4) 0}.metric{padding:var(--ui-space-3);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-lg);background:var(--ui-color-primary-soft)}.metric strong{display:block;font-size:var(--ui-text-4xl)}.metric span{color:var(--ui-color-text-muted);font-size:var(--ui-text-sm)}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-2-5);margin-bottom:var(--ui-space-2-5)}.toolbar input{flex:1;min-width:200px;margin:0!important}.segments{display:flex;gap:var(--ui-space-1);padding:var(--ui-space-1);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-lg)}.segments button{padding:var(--ui-space-2) var(--ui-space-3);background:transparent;color:var(--ui-color-text-muted);font-size:var(--ui-text-sm)}.segments button[aria-pressed=true]{background:var(--ui-color-primary-subtle);color:var(--ui-color-primary);font-weight: var(--ui-weight-bold)}
.emails{margin:0;padding:0;list-style:none}.email{border-top:1px solid var(--ui-color-border-neutral)}.email-summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:var(--ui-space-3);width:100%;padding:var(--ui-space-3) var(--ui-space-1-5);border-radius:var(--ui-radius-md);background:transparent;color:inherit;text-align:left}.email-summary:hover,.email.open .email-summary{background:var(--ui-color-primary-soft)}.email{scroll-margin:24px}
.email-main strong,.email-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.email-main small{margin-top:var(--ui-space-1);color:var(--ui-color-text-muted);font-size:var(--ui-text-sm)}
.pill{padding:var(--ui-space-1) var(--ui-space-2-5);border-radius:var(--ui-radius-xl);font-size:var(--ui-text-xs);font-weight: var(--ui-weight-bold)}.pill.opened{background:var(--ui-color-primary-subtle);color:var(--ui-color-primary)}.pill.sent{background:var(--ui-color-surface-muted);color:var(--ui-color-text-muted)}.pill.unsent{background:var(--ui-color-warning-soft);color:var(--ui-color-warning)}
.email-loads{min-width:46px;text-align:right}.email-loads strong{display:block;font-size:var(--ui-text-2xl)}.email-loads small{color:var(--ui-color-text-muted);font-size:var(--ui-text-xs)}
.details{margin:0 var(--ui-space-1-5) var(--ui-space-3-5);padding:var(--ui-space-3-5) var(--ui-space-4);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-lg)}.details dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ui-space-2-5) var(--ui-space-5);margin:0}.details dt{color:var(--ui-color-text-muted);font-size:var(--ui-text-sm);font-weight: var(--ui-weight-semibold)}.details dd{margin:var(--ui-space-1) 0 0;font-size:var(--ui-text-md);overflow-wrap:anywhere}.details code{font-size:var(--ui-text-sm)}.details h3{margin:var(--ui-space-4) 0 var(--ui-space-2);font-size:var(--ui-text-md)}
.timeline{margin:0;padding:var(--ui-space-2) var(--ui-space-3);border-radius:var(--ui-radius-md);background:var(--ui-color-primary-soft);list-style:none;font-size:var(--ui-text-sm);color:var(--ui-color-text-muted);line-height:1.8}.timeline li{display:flex;justify-content:space-between;gap:var(--ui-space-3)}.note{margin:var(--ui-space-2-5) 0 0;font-size:var(--ui-text-sm);color:var(--ui-color-text-muted)}.empty{color:var(--ui-color-text-muted)}
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
createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>)
