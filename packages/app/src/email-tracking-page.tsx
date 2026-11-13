import { useState, type ReactNode } from 'react'

type TrackingBridge = { downloadTrackingExtension(): Promise<string | null> }
const bridge = () => (window as Window & { leadsGhrDesktop?: TrackingBridge }).leadsGhrDesktop

type IconKind = 'download' | 'folder' | 'chrome' | 'key' | 'compose' | 'send' | 'open' | 'bell' | 'refresh'

function Icon({ kind }: { kind: IconKind }) {
  const paths: Record<IconKind, ReactNode> = {
    download: <><path d="M12 3v11m-4-4 4 4 4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5m-2.5-2.5L12 16l2.5-2.5"/></>,
    chrome: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><path d="M8 15h8m-8-3h8"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 2 2m-5 1 2 2"/></>,
    compose: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></>,
    send: <><path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/></>,
    open: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/></>,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>
}

/** Same double check the extension draws in Gmail: gray by default, first purple when sent, both purple when loaded. */
function Ticks({ state }: { state: 'untracked' | 'sent' | 'loaded' }) {
  return <svg className={`la-tracking-ticks ${state}`} width="26" height="16" viewBox="0 0 20 12" aria-hidden="true"><path className="la-tracking-tick-first" d="M1.5 6.3l3.3 3.3L11.4 3"/><path d="M8.6 8.1l1.5 1.5L16.6 3"/></svg>
}

const installSteps: { kind: IconKind; title: string; body: ReactNode }[] = [
  { kind: 'download', title: 'Download', body: <>Select <strong>Download extension ZIP</strong>. The save window opens in <code>C:\LeadsGhr\extensions</code>; keep that location.</> },
  { kind: 'folder', title: 'Extract', body: <>Right-click the ZIP, choose <strong>Extract All</strong>, and extract to <code>C:\LeadsGhr\extensions\leadsghr-mail-tracking</code>. Chrome loads this folder, not the ZIP.</> },
  { kind: 'chrome', title: 'Load in Chrome', body: <>Open <code>chrome://extensions</code>, turn on <strong>Developer mode</strong>, select <strong>Load unpacked</strong>, and choose the extracted folder. Pin LeadsGhr from the puzzle icon.</> },
  { kind: 'key', title: 'Connect', body: <>Select the LeadsGhr icon, then <strong>Open full settings</strong>. Enter the tracking endpoint and registration key, select <strong>Save settings</strong>, allow access, and reload Gmail.</> },
]

const flow: { kind: IconKind; title: string; body: string }[] = [
  { kind: 'compose', title: 'You compose', body: 'New emails and replies show “LeadsGhr tracking enabled” just above Send. Turn tracking off in the LeadsGhr popup.' },
  { kind: 'send', title: 'LeadsGhr tags the email', body: 'On Send, the extension creates a unique tracking ID for this email and adds an invisible 1×1 image.' },
  { kind: 'open', title: 'The recipient opens it', body: 'When the email is opened with images shown, the mail app loads that image and the tracking service records the time.' },
  { kind: 'bell', title: 'You are notified', body: 'The tracking service pushes each load to the extension right away, which updates the ticks and shows a Chrome notification within seconds.' },
]

const tickStates: { state: 'untracked' | 'sent' | 'loaded'; title: string; body: string }[] = [
  { state: 'untracked', title: 'Not tracked', body: 'Sent without LeadsGhr tracking, or the send was not confirmed.' },
  { state: 'sent', title: 'Sent with tracking', body: 'Sent from Gmail with a tracking image; no load seen yet.' },
  { state: 'loaded', title: 'Opened or image loaded', body: 'The tracking image was loaded at least once.' },
]

const notes: ReactNode[] = [
  <><strong>Loads are not guaranteed reads.</strong> Mail apps can preload images, and opens with images blocked are not seen.</>,
  <><strong>Repeat opens can be missed.</strong> Gmail keeps a cached copy of the image, so later opens often do not reach the tracking service.</>,
  <><strong>One email, one tracking image.</strong> An email sent to several people shares one image, so any of them can cause a load. Send separate emails to see who opened.</>,
  <><strong>Only Gmail compose is tracked.</strong> Emails sent by other tools, mail merge, or the Gmail API carry no LeadsGhr image.</>,
  <><strong>Your data stays private.</strong> Only the random tracking ID and load times are stored online. Recipient, subject, and message stay in your Chrome profile.</>,
]

export function EmailTrackingPage() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const api = bridge()
      if (!api?.downloadTrackingExtension) throw new Error('Restart the desktop app to enable the extension download.')
      const path = await api.downloadTrackingExtension()
      setMessage(path ? `Saved to ${path}. Extract it next.` : 'Download cancelled.')
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }

  return <section className="la-extension-install">
    <div className="la-extension-hero">
      <div className="la-extension-hero-copy">
        <span className="la-extension-eyebrow">LEADSGHR MAIL TRACKING · CHROME EXTENSION</span>
        <h2>Track email opens in Gmail</h2>
        <p>Install the LeadsGhr Chrome extension to add a tracking image to emails you send from Gmail, see when each one is opened, and get a notification when it happens.</p>
        <small>Saves to C:\LeadsGhr\extensions · Works in Google Chrome</small>
        {message && <p className="la-extension-status" role="status">{message}</p>}
      </div>
      <div className="la-extension-hero-action"><button type="button" className="la-extension-download" onClick={() => void download()} disabled={busy}><Icon kind="download"/>{busy ? 'Saving…' : 'Download extension ZIP'}</button></div>
    </div>

    <div className="la-extension-steps-heading"><div><h3>Install in Chrome</h3><p>Do this once on each computer.</p></div><span>About 2 minutes</span></div>
    <ol className="la-extension-steps la-tracking-install">{installSteps.map((step, index) => <li className="la-extension-step" key={step.title}>
      <div className="la-extension-step-top"><span className="la-extension-step-icon"><Icon kind={step.kind}/></span><span className="la-extension-step-number">{String(index + 1).padStart(2, '0')}</span></div>
      <h4>{step.title}</h4><p>{step.body}</p>
    </li>)}</ol>

    <div className="la-tracking-callout"><Icon kind="refresh"/><p><strong>Updating the extension.</strong> Extract the new ZIP into the same <code>leadsghr-mail-tracking</code> folder, replace the files, then select <strong>Reload</strong> on LeadsGhr in <code>chrome://extensions</code>. Using the same folder keeps your settings and tracked emails.</p></div>

    <div className="la-extension-steps-heading"><div><h3>How tracking works</h3><p>From compose to notification.</p></div></div>
    <ol className="la-tracking-flow">{flow.map((item, index) => <li key={item.title}>
      <span className="la-extension-step-icon"><Icon kind={item.kind}/></span>
      <div><span className="la-extension-step-number">STEP {index + 1}</span><h4>{item.title}</h4><p>{item.body}</p></div>
    </li>)}</ol>

    <div className="la-tracking-columns">
      <section className="la-tracking-panel" aria-labelledby="la-tracking-ticks-title">
        <h3 id="la-tracking-ticks-title">Reading the ticks</h3>
        <ul className="la-tracking-legend">{tickStates.map(item => <li key={item.state}><Ticks state={item.state}/><div><strong>{item.title}</strong><span>{item.body}</span></div></li>)}</ul>
        <p className="la-tracking-panel-note">Ticks appear in the Sent list and beside each message you sent inside a conversation, so every reply has its own status. Hover the ticks to see when the image was last loaded, how soon after sending it was first loaded, and every load time. <strong>Open full settings → Email report</strong> lists every tracked email.</p>
      </section>
      <section className="la-tracking-panel" aria-labelledby="la-tracking-notes-title">
        <h3 id="la-tracking-notes-title">Good to know</h3>
        <ul className="la-tracking-notes">{notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
      </section>
    </div>
  </section>
}
