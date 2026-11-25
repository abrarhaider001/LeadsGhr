import { useEffect, useState, type MutableRefObject } from 'react'
import { Icon, type IconName } from '@leadsghr/ui'

type TrackingBridge = { downloadTrackingExtension(): Promise<string | null> }
const bridge = () => (window as Window & { leadsGhrDesktop?: TrackingBridge }).leadsGhrDesktop

const setupSteps: { title: string; body: string }[] = [
  { title: 'Download and extract', body: 'Save the ZIP, then extract the folder.' },
  { title: 'Load it in Chrome', body: 'Turn on Developer mode and choose Load unpacked.' },
  { title: 'Connect', body: 'Save the endpoint and key, then reload Gmail.' },
]

const howItWorks: { icon: IconName; title: string; body: string }[] = [
  { icon: 'edit', title: 'You compose', body: 'Tracking shows above Send.' },
  { icon: 'mailSend', title: 'The email is tagged', body: 'Send adds a unique tracking image.' },
  { icon: 'mail', title: 'The recipient opens it', body: 'The image load is recorded.' },
  { icon: 'bell', title: 'You are notified', body: 'Ticks update in Gmail.' },
]

const needs: { icon: IconName; title: string; body: string }[] = [
  { icon: 'settings', title: 'Chrome', body: 'Tracker loaded as an unpacked extension.' },
  { icon: 'mailTracking', title: 'Endpoint', body: 'The tracking address saved in settings.' },
  { icon: 'shield', title: 'Registration key', body: 'Entered before the first tracked send.' },
  { icon: 'mail', title: 'Gmail', body: 'Reload Gmail after you connect.' },
]

const tickStates: { state: 'untracked' | 'sent' | 'loaded'; title: string; body: string }[] = [
  { state: 'untracked', title: 'Not tracked', body: 'Sent without tracking, or not confirmed.' },
  { state: 'sent', title: 'Sent with tracking', body: 'A tracking image was added. No load yet.' },
  { state: 'loaded', title: 'Opened', body: 'The tracking image loaded at least once.' },
]

/** Same double check the extension draws in Gmail. */
function Ticks({ state }: { state: 'untracked' | 'sent' | 'loaded' }) {
  return (
    <svg
      className={`la-tracking-ticks ${state}`}
      width="26"
      height="16"
      viewBox="0 0 20 12"
      aria-hidden="true"
    >
      <path className="la-tracking-tick-first" d="M1.5 6.3l3.3 3.3L11.4 3" />
      <path d="M8.6 8.1l1.5 1.5L16.6 3" />
    </svg>
  )
}

function FactPanel({
  id,
  title,
  items,
}: {
  id: string
  title: string
  items: { icon: IconName; title: string; body: string }[]
}) {
  return (
    <section className="la-mailer-panel" aria-labelledby={id}>
      <header className="la-mailer-panel-title">
        <h3 id={id}>{title}</h3>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item.title}>
            <span className="la-mailer-mark">
              <Icon name={item.icon} size={18} />
            </span>
            <div>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Email Tracking is the Tracker install guide. The download button stays in the page header. */
export function EmailTrackingPage({
  downloadRef,
}: {
  downloadRef?: MutableRefObject<(() => void) | null>
}) {
  const [message, setMessage] = useState('')

  async function downloadExtension() {
    try {
      const api = bridge()
      if (!api?.downloadTrackingExtension)
        throw new Error('Restart the desktop app to enable extension download.')
      const path = await api.downloadTrackingExtension()
      setMessage(path ? `Saved to ${path}` : 'Download cancelled')
    } catch (error) {
      setMessage(String(error))
    }
  }

  useEffect(() => {
    if (!downloadRef) return
    downloadRef.current = () => {
      void downloadExtension()
    }
    return () => {
      downloadRef.current = null
    }
  })

  return (
    <section className="la-mailer-guide">
      {message ? (
        <p className="la-mailer-status" role="status">
          {message}
        </p>
      ) : null}
      <section className="la-mailer-block" aria-labelledby="la-tracker-setup">
        <header>
          <h3 id="la-tracker-setup">Setup</h3>
        </header>
        <ol className="la-mailer-cards">
          {setupSteps.map((step, index) => (
            <li className="la-mailer-card" key={step.title}>
              <span className="la-mailer-index">{String(index + 1).padStart(2, '0')}</span>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="la-mailer-block" aria-labelledby="la-tracker-how">
        <header>
          <h3 id="la-tracker-how">How it works</h3>
        </header>
        <ol className="la-mailer-cards la-mailer-cards-wide">
          {howItWorks.map((item) => (
            <li className="la-mailer-card" key={item.title}>
              <span className="la-mailer-mark">
                <Icon name={item.icon} size={20} />
              </span>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <div className="la-mailer-facts">
        <FactPanel id="la-tracker-needs" title="What you need" items={needs} />
        <section className="la-mailer-panel" aria-labelledby="la-tracker-ticks">
          <header className="la-mailer-panel-title">
            <h3 id="la-tracker-ticks">Reading the ticks</h3>
          </header>
          <ul>
            {tickStates.map((item) => (
              <li key={item.state}>
                <span className="la-mailer-mark">
                  <Ticks state={item.state} />
                </span>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
