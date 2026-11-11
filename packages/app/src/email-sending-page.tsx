import { useState } from 'react'
import { ExtensionInstallPage } from './extension-install-page'

type SendingBridge = {
  downloadTrackingExtension(): Promise<string | null>
}

const bridge = () => (window as Window & { leadsGhrDesktop?: SendingBridge }).leadsGhrDesktop

const steps = [
  { number: '01', title: 'Install the Chrome extension', detail: 'Download the ZIP from this page, extract it, then load the unpacked folder in chrome://extensions.' },
  { number: '02', title: 'Open Gmail and extension settings', detail: 'Sign in to Gmail in Chrome, open LeadsGhr Mail settings, and choose the Sending tab.' },
  { number: '03', title: 'Load template, CSV, and range', detail: 'Paste or import a subject/body template, import a recipients CSV, set inclusive From/To numbers, then start sending.' },
]

export function EmailSendingPage() {
  const [showDownload, setShowDownload] = useState(false)
  const [message, setMessage] = useState('')

  async function downloadExtension() {
    try {
      const api = bridge()
      if (!api?.downloadTrackingExtension) throw new Error('Restart the desktop app to enable extension download.')
      const path = await api.downloadTrackingExtension()
      setMessage(path ? `Saved to ${path}` : 'Download cancelled')
    } catch (error) { setMessage(String(error)) }
  }

  if (showDownload) {
    return <ExtensionInstallPage
      onBack={() => setShowDownload(false)}
      onDownload={() => { void downloadExtension() }}
      message={message}
      backLabel="Back to Email Sending"
      eyebrow="LEADSGHR MAIL SENDING"
      title="Install sending in Gmail"
      summary="Download the companion extension, load it into Chrome, then send templated CSV ranges from your Gmail session."
      finalStep={<>Open extension settings, choose the <strong>Sending</strong> tab, load a template and CSV, set the recipient range, and keep Gmail open while the job runs.</>}
      requirement={<><strong>Sending uses your Gmail session.</strong> Messages go out one at a time with a polite delay. Keep the Gmail tab open, stay signed in, and start with a small range while you verify delivery.</>}
    />
  }

  return <section className="la-local-tracking">
    <div className="la-local-tracking-heading">
      <div>
        <h2>Email Sending</h2>
        <p>Prepare a template and CSV range in the Chrome extension, then send through your own Gmail account.</p>
      </div>
      <button type="button" onClick={() => setShowDownload(true)}>Get Chrome extension</button>
    </div>
    <div className="la-extension-steps">{steps.map((step) => <article className="la-extension-step" key={step.number}><div className="la-extension-step-top"><span className="la-extension-step-number">{step.number}</span></div><h4>{step.title}</h4><p>{step.detail}</p></article>)}</div>
    <p className="la-local-tracking-note">Campaign state stays in the Chrome profile. LeadsGhr does not upload recipients, subjects, or message bodies to Supabase.</p>
    {message && <p role="status" className="la-local-tracking-message">{message}</p>}
  </section>
}
