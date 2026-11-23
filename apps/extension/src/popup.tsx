import '@leadsghr/ui/tokens.css' // design tokens: the colours, fonts and sizes used in the styles below
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LicenseGate } from '@leadsghr/license/extension'

type TrackingRecord = {
  id: string
  recipient: string
  subject: string
  sentAt: number
  sent?: boolean
  loads: number
  firstLoad?: string | null
  lastLoad: string | null
  events?: string[]
}

const when = (value: string | number): string =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const styles = `
  *{box-sizing:border-box}
  html,body{margin:0}
  body{width:360px;background:var(--ui-color-surface);color:var(--ui-color-text);font:var(--ui-text-md)/1.4 var(--ui-font-sans)}
  button,input{font:inherit;color:inherit}
  button{cursor:pointer}
  :focus-visible{outline:2px solid var(--ui-color-primary);outline-offset:2px}
  .app{display:flex;flex-direction:column;max-height:560px}
  .top{display:flex;align-items:center;gap:var(--ui-space-2-5);padding:var(--ui-space-3) var(--ui-space-3-5);border-bottom:1px solid var(--ui-color-border-subtle)}
  .top img{width:22px;height:22px}
  .top strong{font-size:var(--ui-text-base);font-weight: var(--ui-weight-semibold)}
  .icons{display:flex;gap:var(--ui-space-0-5);margin-left:auto}
  .icon-btn{display:grid;place-items:center;width:30px;height:var(--ui-control-height-sm);padding:0;border:0;border-radius:var(--ui-button-radius);background:none;color:var(--ui-color-text-muted)}
  .icon-btn:hover:not(:disabled){background:var(--ui-color-primary-soft);color:var(--ui-color-text)}
  .icon-btn:disabled{cursor:default}
  .icon-btn svg{width:17px;height:17px}
  .icon-btn.spinning svg{animation:spin .8s linear infinite;color:var(--ui-color-primary)}
  @keyframes spin{to{transform:rotate(360deg)}}
  .body{flex:1;min-height:0;overflow-y:auto;padding:var(--ui-space-3-5)}
  .label{margin:0 0 var(--ui-space-1-5);font-size:var(--ui-text-sm);font-weight: var(--ui-weight-semibold);color:var(--ui-color-text)}
  .group+.group{margin-top:var(--ui-space-4)}
  .toggle{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-3);padding:var(--ui-space-2-5) 0;cursor:pointer}
  .toggle+.toggle{border-top:1px solid var(--ui-color-border-subtle)}
  .toggle small{display:block;color:var(--ui-color-text-muted);font-size:var(--ui-text-sm)}
  .switch{position:relative;flex:none;width:34px;height:20px;margin:0;appearance:none;border:0;border-radius:var(--ui-radius-lg);background:var(--ui-color-border-strong);cursor:pointer}
  .switch:checked{background:var(--ui-color-primary)}
  .switch:after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--ui-color-surface);transition:transform .15s}
  .switch:checked:after{transform:translateX(14px)}
  .setup{display:flex;align-items:center;gap:var(--ui-space-2);margin:var(--ui-space-2-5) 0 0;padding:var(--ui-space-2) var(--ui-space-2-5);border-radius:var(--ui-radius-sm);background:var(--ui-color-warning-soft);color:var(--ui-color-warning);font-size:var(--ui-text-sm)}
  .setup button{margin-left:auto;padding:0;border:0;background:none;color:var(--ui-color-primary);font-weight: var(--ui-weight-semibold);text-decoration:underline}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--ui-space-2)}
  .stat{padding:var(--ui-space-2) var(--ui-space-2-5);border:1px solid var(--ui-color-border-subtle);border-radius:var(--ui-radius-sm)}
  .stat strong{display:block;font-size:var(--ui-text-2xl);font-weight: var(--ui-weight-semibold)}
  .stat span{color:var(--ui-color-text-muted);font-size:var(--ui-text-xs)}
  .list{margin:0;padding:0;list-style:none}
  .row{display:flex;align-items:center;gap:var(--ui-space-2-5);width:100%;padding:var(--ui-space-2) 0;border:0;border-top:1px solid var(--ui-color-border-subtle);background:none;text-align:left}
  .row-main{flex:1;min-width:0}
  .subject,.meta{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .subject{font-weight: var(--ui-weight-semibold)}
  .meta{color:var(--ui-color-text-muted);font-size:var(--ui-text-sm)}
  .count{display:inline-flex;flex:none;align-items:center;gap:var(--ui-space-1);color:var(--ui-color-text-muted);font-size:var(--ui-text-sm);font-weight: var(--ui-weight-semibold)}
  .ticks{width:20px;height:12px;fill:none;stroke:var(--ui-color-text-disabled);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .ticks.sent .tick-first,.ticks.open path{stroke:var(--ui-color-primary)}
  .empty{margin:var(--ui-space-2) 0 0;color:var(--ui-color-text-muted)}
  .error{margin:var(--ui-space-2) 0 0;color:var(--ui-color-danger);font-size:var(--ui-text-sm)}
  .foot{padding:var(--ui-space-2-5) var(--ui-space-3-5);border-top:1px solid var(--ui-color-border-subtle)}
  .foot button{width:100%;height:var(--ui-control-height-md);border:1px solid var(--ui-color-border);border-radius:var(--ui-button-radius);background:var(--ui-color-surface);font-weight: var(--ui-weight-semibold)}
  .foot button:hover{background:var(--ui-color-primary-soft)}
`

/** Both gray by default, first purple once the send is confirmed, both purple once an image load is observed. */
function Ticks({ sent, loaded }: { sent: boolean; loaded: boolean }) {
  return (
    <svg
      className={`ticks ${loaded ? 'open' : sent ? 'sent' : ''}`}
      viewBox="0 0 20 12"
      aria-hidden="true"
    >
      <path className="tick-first" d="M1.5 6.3l3.3 3.3L11.4 3" />
      <path d="M8.6 8.1l1.5 1.5L16.6 3" />
    </svg>
  )
}

function Popup() {
  const [enabled, setEnabled] = useState(true)
  const [notify, setNotify] = useState(true)
  const [configured, setConfigured] = useState(true)
  const [records, setRecords] = useState<TrackingRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void chrome.storage.local
      .get(['enabled', 'notify', 'endpoint', 'registrationKey', 'records'])
      .then((data) => {
        setEnabled(data.enabled !== false)
        setNotify(data.notify !== false)
        setConfigured(Boolean(data.endpoint && data.registrationKey))
        setRecords(Array.isArray(data.records) ? data.records : [])
      })
      .catch((problem) => setError(String(problem)))
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (changes.enabled) setEnabled(changes.enabled.newValue !== false)
      if (changes.notify) setNotify(changes.notify.newValue !== false)
      if (changes.records)
        setRecords(Array.isArray(changes.records.newValue) ? changes.records.newValue : [])
      if (changes.endpoint || changes.registrationKey) {
        void chrome.storage.local
          .get(['endpoint', 'registrationKey'])
          .then((data) => setConfigured(Boolean(data.endpoint && data.registrationKey)))
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  async function save(values: Record<string, boolean>) {
    try {
      await chrome.storage.local.set(values)
      setError('')
    } catch (problem) {
      setError(String(problem))
    }
  }

  async function refresh() {
    setRefreshing(true)
    setError('')
    try {
      const result = (await chrome.runtime.sendMessage({ kind: 'tracking:refresh' })) as {
        error?: string
      }
      if (result?.error) throw new Error(result.error)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem))
    } finally {
      setRefreshing(false)
    }
  }

  const sent = records.filter((record) => record.sent !== false)
  const opened = sent.filter((record) => record.loads > 0).length
  const loads = records.reduce((total, record) => total + record.loads, 0)

  return (
    <div className="app">
      <style>{styles}</style>
      <header className="top">
        <img src="/icon.png" alt="" />
        <strong>LeadsGhr Tracker</strong>
        <span className="icons">
          <button
            type="button"
            className={`icon-btn ${refreshing ? 'spinning' : ''}`}
            aria-label={refreshing ? 'Refreshing counts' : 'Refresh counts'}
            title="Refresh counts"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4v7h-7" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Settings"
            title="Settings"
            onClick={() => void chrome.runtime.openOptionsPage()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </span>
      </header>

      <div className="body">
        <div className="group">
          <label className="toggle">
            <span>
              Track new emails<small>Adds a tracking image when you send from Gmail.</small>
            </span>
            <input
              className="switch"
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setEnabled(event.target.checked)
                void save({ enabled: event.target.checked })
              }}
              aria-label="Track new emails"
            />
          </label>
          <label className="toggle">
            <span>
              Open notifications<small>A Chrome notification when an email is opened.</small>
            </span>
            <input
              className="switch"
              type="checkbox"
              checked={notify}
              onChange={(event) => {
                setNotify(event.target.checked)
                void save({ notify: event.target.checked })
              }}
              aria-label="Open notifications"
            />
          </label>
          {!configured && (
            <p className="setup">
              Tracking endpoint not set up.
              <button type="button" onClick={() => void chrome.runtime.openOptionsPage()}>
                Set up
              </button>
            </p>
          )}
        </div>

        <div className="group">
          <p className="label">Overview</p>
          <div className="stats">
            <div className="stat">
              <strong>{sent.length}</strong>
              <span>Tracked</span>
            </div>
            <div className="stat">
              <strong>{opened}</strong>
              <span>Opened</span>
            </div>
            <div className="stat">
              <strong>{loads}</strong>
              <span>Image loads</span>
            </div>
          </div>
        </div>

        <div className="group">
          <p className="label">Recent emails</p>
          <ul className="list">
            {records.slice(0, 5).map((record) => (
              <li key={record.id}>
                <div className="row">
                  <span className="row-main">
                    <span className="subject">{record.subject}</span>
                    <span className="meta">
                      {record.recipient} ·{' '}
                      {record.sent === false ? 'not sent' : when(record.sentAt)}
                    </span>
                  </span>
                  <span className="count">
                    <Ticks sent={record.sent !== false} loaded={record.loads > 0} />
                    {record.loads || ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {records.length === 0 && (
            <p className="empty">
              No tracked emails yet. Send an email from Gmail with tracking on.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// The license screen is the entry point: the popup opens only with an active license key.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LicenseGate product="tracker" logo="/icon.svg">
      <Popup />
    </LicenseGate>
  </React.StrictMode>,
)
