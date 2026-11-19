import React from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'
import { EmailSendingPanel } from './email-sending/panel'
import { DataFolderPanel } from './email-sending/data-folder-panel'
import { SendingPreferencesPanel } from './email-sending/preferences'

const style = `@font-face{font-family:'Instrument Sans';src:url('/fonts/InstrumentSans.ttf') format('truetype');font-weight:400 700;font-display:swap}
body{font:14px 'Instrument Sans',Arial,sans-serif;color:#21152d;margin:0;background:#fff}main{max-width:900px;margin:40px auto;padding:0 24px}
.brand{display:flex;align-items:center;gap:12px}.brand img{width:40px;height:40px}h1{margin:0;font-size:28px}h2{margin:0 0 8px;font-size:20px}p{color:#62556c;line-height:1.5}
section{border:1px solid #ded6ec;border-radius:12px;padding:20px;margin:20px 0}label{display:block;font-weight:600;margin:12px 0}
input[type=text],textarea{display:block;width:100%;box-sizing:border-box;padding:11px;border:1px solid #DFD9EC;border-radius:8px;margin-top:6px;font:inherit;font-weight:400}textarea{resize:vertical;min-height:140px}
input[type=text]:focus,textarea:focus{border-color:#5B12C9;outline:none}button{background:#5B12C9;color:#fff;border:0;border-radius:6px;padding:9px 14px;cursor:pointer;font:inherit;font-weight:600}button:disabled{opacity:.55;cursor:not-allowed}
button:focus-visible{outline:2px solid #29CBEA;outline-offset:2px}input[type=radio]:focus-visible{outline:2px solid #5B12C9;outline-offset:2px}.muted{font-size:12px;color:#756987}
.row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px;border-top:1px solid #eee}.row-main{min-width:0}.row-main strong,.row-main .muted{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row-actions{display:flex;flex:none;gap:6px}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.section-head button{flex:none;white-space:nowrap}.section-head p{margin:0 0 8px}
button.secondary,.file-button{background:#fff;color:#352254;border:1px solid #DFD9EC}button.secondary:hover,.file-button:hover{background:#f7f4ff}button.danger{color:#B42318}
.file-button{display:inline-flex;align-items:center;margin:0;padding:10px 16px;border-radius:8px;font-weight:400;cursor:pointer}.file-button input{position:absolute;width:1px;height:1px;opacity:0}.file-button:focus-within{outline:2px solid #29CBEA;outline-offset:2px}
fieldset.choice-group{margin:0;padding:0;border:0}fieldset.choice-group+fieldset.choice-group{margin-top:16px}fieldset.choice-group legend{margin:0 0 8px;font-weight:600}.choice{display:flex;align-items:flex-start;gap:10px;margin:0 0 8px;padding:12px 14px;border:1px solid #DFD9EC;border-radius:8px;font-weight:400;cursor:pointer}.choice.selected{border-color:#5B12C9;background:#faf8ff}.choice input{margin:3px 0 0;accent-color:#5B12C9}.choice strong{display:block;margin-bottom:3px}.choice small{display:block;color:#62556c;font-size:12px;line-height:1.5}
code{padding:1px 5px;border-radius:4px;background:#f3f0fa;font-family:'Monaspace Neon',Consolas,monospace;font-size:12px}.folder-status{margin:4px 0 0;font-weight:600}.folder-status.connected{color:#1D6B3A}.folder-status.needs-permission{color:#8A4B00}.folder-status.not-connected{color:#B42318}
.editor{margin:8px 0 16px;padding:4px 16px;border:1px solid #DFD9EC;border-radius:10px;background:#faf8ff}`

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

createRoot(document.getElementById('root')!).render(<React.StrictMode><LicenseGate product="mailer" logo="/icon.svg"><Settings /></LicenseGate></React.StrictMode>)
