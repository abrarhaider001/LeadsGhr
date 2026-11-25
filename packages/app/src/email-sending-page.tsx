import { useEffect, useState, type MutableRefObject } from 'react'
import {
  BentoCursor,
  BentoFloat,
  BentoGrid,
  BentoPill,
  BentoTile,
  BentoToast,
  Icon,
  MailerMark,
  NavIcon,
} from '@leadsghr/ui'
import { ExtensionInstallSteps } from './extension-install-steps'

type SendingBridge = {
  downloadMailerExtension(): Promise<string | null>
}

const bridge = () => (window as Window & { leadsGhrDesktop?: SendingBridge }).leadsGhrDesktop

/** A small, faithful picture of the Mailer popup in Gmail (template, Start, End, Delay, Send). */
function MailerPopupPreview() {
  return (
    <BentoFloat className="la-ext-popup">
      <div className="la-ext-popup-head">
        <MailerMark size={16} />
        LeadsGhr Mailer
      </div>
      <div className="la-ext-popup-field">
        Spring offer — contractors <span>▾</span>
      </div>
      <div className="la-ext-popup-row">
        <div className="la-ext-popup-field">1</div>
        <div className="la-ext-popup-field">50</div>
        <div className="la-ext-popup-field">30 s</div>
      </div>
      <div className="la-ext-popup-send">Send 50 emails</div>
    </BentoFloat>
  )
}

/**
 * LeadsGhr Mailer (Extensions): a bento page. What it does (with the popup as it looks in Gmail), where templates and
 * lists come from, how to install it, and the sending limits. The download button stays in the page header.
 */
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
    <section className="la-ext-page">
      {message ? (
        <p className="la-mailer-status" role="status">
          {message}
        </p>
      ) : null}
      <BentoGrid>
        <BentoTile
          tone="brand"
          title="Send from your own Gmail"
          art={
            <>
              <MailerPopupPreview />
              <BentoToast
                className="la-ext-toast-main"
                icon={<Icon name="mail" size={20} />}
                title="Email 12 of 50 sent"
                subtitle="Next one in 30 seconds"
              />
              <BentoCursor className="la-ext-cursor" />
            </>
          }
        >
          Pick a template, add a CSV or Excel list, and LeadsGhr Mailer sends each email from your
          Gmail, one at a time.
        </BentoTile>
        <BentoTile
          title="Your lists, your templates"
          art={
            <>
              <BentoPill className="la-ext-pill-1">@ templates</BentoPill>
              <BentoPill tone="ink" className="la-ext-pill-2">
                CSV
              </BentoPill>
              <BentoPill tone="accent" className="la-ext-pill-3">
                Excel
              </BentoPill>
              <BentoPill tone="plain" className="la-ext-pill-4">
                Start → End rows
              </BentoPill>
            </>
          }
        >
          Templates come from Email Templates; lists from any CSV or Excel file. Choose which rows to
          send.
        </BentoTile>
        <BentoTile
          className="la-ext-install"
          title="Install in two minutes"
          art={<ExtensionInstallSteps lastStep="Pin the icon, then choose its data folder in settings" />}
        >
          Download the ZIP above and load it in Chrome. To update, download again and press Reload
          in chrome://extensions; your templates are kept.
        </BentoTile>
        <BentoTile
          tone="brand"
          title="You stay in control"
          art={
            <BentoToast
              className="la-ext-toast-corner"
              icon={<NavIcon name="emailSending" size={20} />}
              title="Sending paused"
              subtitle="38 of 50 sent · Resume when ready"
            />
          }
        >
          A delay of 5 to 120 seconds between emails. Pause, resume, or stop at any time; keep the
          Gmail tab open. Recipients never leave your Chrome profile.
        </BentoTile>
      </BentoGrid>
    </section>
  )
}
