import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in the styles below
import React from 'react'
import { createRoot } from 'react-dom/client'
import { EmailSendingPanel } from './email-sending/panel'
import { DataFolderPanel } from './email-sending/data-folder-panel'
import { SendingPreferencesPanel } from './email-sending/preferences'

const style = `
body{font:var(--ui-text-base) var(--ui-font-sans);color:var(--ui-color-text);margin:0;background:var(--ui-color-surface)}main{max-width:900px;margin:var(--ui-space-10) auto;padding:0 var(--ui-space-6)}
.brand{display:flex;align-items:center;gap:var(--ui-space-3)}.brand img{width:40px;height:40px}h1{margin:0;font-size:var(--ui-text-6xl)}h2{margin:0 0 var(--ui-space-2);font-size:var(--ui-text-3xl)}p{color:var(--ui-color-text-muted);line-height:1.5}
section{border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-xl);padding:var(--ui-space-5);margin:var(--ui-space-5) 0}label{display:block;font-weight: var(--ui-weight-semibold);margin:var(--ui-space-3) 0}
input[type=text],textarea{display:block;width:100%;box-sizing:border-box;padding:var(--ui-space-3);border:1px solid var(--ui-color-border);border-radius:var(--ui-field-radius);margin-top:var(--ui-space-1-5);font:inherit;font-weight: var(--ui-weight-regular)}textarea{resize:vertical;min-height:140px}
input[type=text]:focus,textarea:focus{border-color:var(--ui-color-primary);outline:none}button{background:var(--ui-color-primary);color:var(--ui-color-on-primary);border:0;border-radius:var(--ui-button-radius);padding:var(--ui-space-2-5) var(--ui-space-3-5);cursor:pointer;font:inherit;font-weight: var(--ui-weight-semibold)}button:disabled{opacity:.55;cursor:not-allowed}
button:focus-visible{outline:2px solid var(--ui-color-focus);outline-offset:2px}input[type=radio]:focus-visible{outline:2px solid var(--ui-color-primary);outline-offset:2px}.muted{font-size:var(--ui-text-sm);color:var(--ui-color-text-muted)}
.row{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-4);padding:var(--ui-space-2-5);border-top:1px solid var(--ui-color-border-neutral)}.row-main{min-width:0}.row-main strong,.row-main .muted{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row-actions{display:flex;flex:none;gap:var(--ui-space-1-5)}
.actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-2);margin:var(--ui-space-4) 0}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--ui-space-4)}.section-head button{flex:none;white-space:nowrap}.section-head p{margin:0 0 var(--ui-space-2)}
button.secondary,.file-button{background:var(--ui-color-surface);color:var(--ui-color-text);border:1px solid var(--ui-color-border)}button.secondary:hover,.file-button:hover{background:var(--ui-color-primary-soft)}button.danger{color:var(--ui-color-danger)}
.file-button{display:inline-flex;align-items:center;margin:0;padding:var(--ui-space-2-5) var(--ui-space-4);border-radius:var(--ui-button-radius);font-weight: var(--ui-weight-regular);cursor:pointer}.file-button input{position:absolute;width:1px;height:1px;opacity:0}.file-button:focus-within{outline:2px solid var(--ui-color-focus);outline-offset:2px}
fieldset.choice-group{margin:0;padding:0;border:0}fieldset.choice-group+fieldset.choice-group{margin-top:var(--ui-space-4)}fieldset.choice-group legend{margin:0 0 var(--ui-space-2);font-weight: var(--ui-weight-semibold)}.choice{display:flex;align-items:flex-start;gap:var(--ui-space-2-5);margin:0 0 var(--ui-space-2);padding:var(--ui-space-3) var(--ui-space-3-5);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-md);font-weight: var(--ui-weight-regular);cursor:pointer}.choice.selected{border-color:var(--ui-color-primary);background:var(--ui-color-primary-soft)}.choice input{margin:var(--ui-space-1) 0 0;accent-color:var(--ui-color-primary)}.choice strong{display:block;margin-bottom:var(--ui-space-1)}.choice small{display:block;color:var(--ui-color-text-muted);font-size:var(--ui-text-sm);line-height:1.5}
code{padding:1px var(--ui-space-1-5);border-radius:var(--ui-radius-xs);background:var(--ui-color-primary-soft);font-family:var(--ui-font-mono);font-size:var(--ui-text-sm)}.folder-status{margin:var(--ui-space-1) 0 0;font-weight: var(--ui-weight-semibold)}.folder-status.connected{color:var(--ui-color-success)}.folder-status.needs-permission{color:var(--ui-color-warning)}.folder-status.not-connected{color:var(--ui-color-danger)}
.editor{margin:var(--ui-space-2) 0 var(--ui-space-4);padding:var(--ui-space-1) var(--ui-space-4);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-lg);background:var(--ui-color-primary-soft)}`

/** LeadsGhr Mailer settings: preferences and saved templates for the toolbar popup. */
function Settings() {
  return <main>
    <style>{style}</style>
    <div className="brand"><img src="/icon.png" alt=""/><h1>LeadsGhr Mailer</h1></div>
    <p>Save templates here, then pick one in the LeadsGhr Mailer toolbar popup to send it to a CSV or Excel recipient range.</p>
    <DataFolderPanel />
    <SendingPreferencesPanel />
    <EmailSendingPanel />
  </main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Settings /></React.StrictMode>)
