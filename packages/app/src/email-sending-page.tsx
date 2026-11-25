import { useEffect, useState, type MutableRefObject } from 'react'
import { Icon, type IconName } from '@leadsghr/ui'

type SendingBridge = {
  downloadMailerExtension(): Promise<string | null>
}

const bridge = () => (window as Window & { leadsGhrDesktop?: SendingBridge }).leadsGhrDesktop

const setupSteps: { title: string; body: string }[] = [
  { title: 'Download and extract', body: 'Save the ZIP, then extract the folder.' },
  { title: 'Load it in Chrome', body: 'Turn on Developer mode and choose Load unpacked.' },
  { title: 'Pin the toolbar icon', body: 'Pin LeadsGhr Mailer, then save a template.' },
]

const howItWorks: { icon: IconName; title: string; body: string }[] = [
  { icon: 'mail', title: 'Choose a template', body: 'Pick a saved message.' },
  { icon: 'leads', title: 'Add recipients', body: 'Upload a CSV or Excel file.' },
  { icon: 'runs', title: 'Set the range and delay', body: 'Choose the rows and the wait between sends.' },
  { icon: 'mailSend', title: 'Send from Gmail', body: 'Start, pause, or stop from Gmail.' },
]

const needs: { icon: IconName; title: string; body: string }[] = [
  { icon: 'settings', title: 'Chrome', body: 'Mailer loaded as an unpacked extension.' },
  { icon: 'mail', title: 'Template', body: 'A message saved on Email Templates.' },
  { icon: 'leads', title: 'Recipients', body: 'A CSV or Excel file of addresses.' },
  { icon: 'mailSend', title: 'Gmail', body: 'Stay signed in on the send tab.' },
]

const duringSend: { icon: IconName; title: string; body: string }[] = [
  { icon: 'mailCheck', title: 'One at a time', body: 'Each message waits its turn.' },
  { icon: 'runs', title: 'Polite delay', body: '5–120 seconds between sends.' },
  { icon: 'pause', title: 'You stay in control', body: 'Pause, resume, or stop anytime.' },
  { icon: 'shield', title: 'Stays on this computer', body: 'Recipients and messages are not uploaded.' },
]

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

/** Email Sending is the Mailer install guide. The download button stays in the page header. */
export function EmailSendingPage({
  downloadRef,
}: {
  downloadRef?: MutableRefObject<(() => void) | null>
}) {
  const [message, setMessage] = useState('')

  async function downloadExtension() {
    try {
      const api = bridge()
      if (!api?.downloadMailerExtension)
        throw new Error('Restart the desktop app to enable extension download.')
      const path = await api.downloadMailerExtension()
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
      <section className="la-mailer-block" aria-labelledby="la-mailer-setup">
        <header>
          <h3 id="la-mailer-setup">Setup</h3>
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
      <section className="la-mailer-block" aria-labelledby="la-mailer-how">
        <header>
          <h3 id="la-mailer-how">How it works</h3>
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
        <FactPanel id="la-mailer-needs" title="What you need" items={needs} />
        <FactPanel id="la-mailer-during" title="During a send" items={duringSend} />
      </div>
    </section>
  )
}
