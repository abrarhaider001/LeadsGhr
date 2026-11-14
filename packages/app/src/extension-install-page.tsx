import type { ReactNode } from 'react'

type ExtensionInstallPageProps = {
  onBack: () => void
  onDownload: () => void
  message: string
  backLabel?: string
  eyebrow?: string
  title?: string
  summary?: string
  finalStep?: ReactNode
  requirement?: ReactNode
}

function StepIcon({ kind }: { kind: 'download' | 'chrome' | 'mail' }) {
  const common = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...common}>
    {kind === 'download' ? <><path d="M12 3v11m-4-4 4 4 4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></> : kind === 'chrome' ? <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><path d="M8 15h8m-8-3h8"/></> : <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/><path d="m13 17 2 2 4-4"/></>}
  </svg>
}

export function ExtensionInstallPage({
  onBack,
  onDownload,
  message,
  backLabel = 'Back to Email Tracking',
  eyebrow = 'LEADSGHR MAIL TRACKING',
  title = 'Install tracking in Gmail',
  summary = 'Download the companion extension, load it into Chrome, and see image-load indicators beside messages you send.',
  finalStep = <>In extension settings, enter your deployed public HTTPS tracking endpoint and registration key. Save, reload Gmail, then compose with Tracking on.</>,
  requirement = <><strong>Tracking needs a public endpoint.</strong> The local preview only works on this computer. Recipient-side image loads require the public service described in the Email Tracking guide; image loads do not prove a person read the message.</>,
}: ExtensionInstallPageProps) {
  const steps = [
    { number: '01', kind: 'download' as const, title: 'Download and extract', details: <>Save the ZIP, then extract it to a permanent folder. Chrome loads the extracted files, not the ZIP itself.</> },
    { number: '02', kind: 'chrome' as const, title: 'Load it in Chrome', details: <>Open <code>chrome://extensions</code>, turn on <strong>Developer mode</strong>, select <strong>Load unpacked</strong>, then choose the folder containing <code>manifest.json</code>.</> },
    { number: '03', kind: 'mail' as const, title: 'Connect and try it', details: finalStep },
  ]
  return <section className="la-extension-install">
    <div className="la-extension-install-top"><button type="button" className="la-extension-back" onClick={onBack} aria-label={backLabel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h13"/></svg>{backLabel}</button><span className="la-extension-version">CHROME · MANIFEST V3</span></div>
    <div className="la-extension-hero"><div className="la-extension-hero-copy"><span className="la-extension-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{summary}</p><small>ZIP download · Extract before loading into Chrome</small>{message && <p className="la-extension-status" role="status">{message}</p>}</div><div className="la-extension-hero-action"><button type="button" className="la-extension-download" onClick={onDownload}><StepIcon kind="download"/>Download extension ZIP</button></div></div>
    <div className="la-extension-steps-heading"><div><h3>Set up in three steps</h3><p>Keep the extracted folder on your computer after installing.</p></div><span>About 2 minutes</span></div>
    <div className="la-extension-steps">{steps.map(step => <article className="la-extension-step" key={step.number}><div className="la-extension-step-top"><span className="la-extension-step-icon"><StepIcon kind={step.kind}/></span><span className="la-extension-step-number">{step.number}</span></div><h4>{step.title}</h4><p>{step.details}</p></article>)}</div>
    <div className="la-extension-requirement"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg><p>{requirement}</p></div>
  </section>
}
