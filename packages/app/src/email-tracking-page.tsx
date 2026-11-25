import { useEffect, useState, type MutableRefObject } from 'react'
import { BentoFloat, BentoGrid, BentoTile, BentoToast } from '@leadsghr/ui'
import { ExtensionInstallSteps } from './extension-install-steps'

type TrackingBridge = { downloadTrackingExtension(): Promise<string | null> }
const bridge = () => (window as Window & { leadsGhrDesktop?: TrackingBridge }).leadsGhrDesktop

type TickState = 'untracked' | 'sent' | 'loaded'

/** Same double check the extension draws next to sent emails in Gmail. */
function Ticks({ state }: { state: TickState }) {
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

/** A small picture of Gmail's Sent list with the Tracker's ticks. */
function SentListPreview() {
  const rows: { subject: string; to: string; state: TickState }[] = [
    { subject: 'Spring offer', to: 'to mike@…', state: 'loaded' },
    { subject: 'Quote follow-up', to: 'to anna@…', state: 'sent' },
    { subject: 'Free inspection', to: 'to joe@…', state: 'loaded' },
  ]
  return (
    <BentoFloat className="la-ext-gmail">
      {rows.map((row) => (
        <div className="la-ext-gmail-row" key={row.subject}>
          <strong>{row.subject}</strong>
          <span>{row.to}</span>
          <Ticks state={row.state} />
        </div>
      ))}
    </BentoFloat>
  )
}

/**
 * LeadsGhr Tracker (Extensions): a bento page. What it does (with Gmail's Sent list and ticks), how to read the ticks,
 * how to install and connect it, and that the sender's own views are not counted. The download button stays in the
 * page header.
 */
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
    <section className="la-ext-page">
      {message ? (
        <p className="la-mailer-status" role="status">
          {message}
        </p>
      ) : null}
      <BentoGrid>
        <BentoTile
          tone="brand"
          title="Know when your email is opened"
          art={
            <>
              <SentListPreview />
              <BentoToast
                className="la-ext-toast-main"
                icon={<Ticks state="loaded" />}
                title="Spring offer was opened"
                subtitle="Just now · 2nd time"
              />
            </>
          }
        >
          LeadsGhr Tracker adds a tiny tracking image when you press Send in Gmail and shows ticks
          next to every sent email.
        </BentoTile>
        <BentoTile
          title="Read the ticks"
          art={
            <div className="la-ext-legend">
              <span>
                <Ticks state="untracked" /> Not tracked
              </span>
              <span>
                <Ticks state="sent" /> Sent with tracking
              </span>
              <span>
                <Ticks state="loaded" /> Opened
              </span>
            </div>
          }
        >
          One green tick: sent with tracking, no open yet. Two green ticks: the tracking image loaded
          at least once.
        </BentoTile>
        <BentoTile
          className="la-ext-install"
          title="Install in two minutes"
          art={<ExtensionInstallSteps lastStep="Save the endpoint and key in its settings, then reload Gmail" />}
        >
          Download the ZIP above and load it in Chrome. To update, download again and press Reload
          in chrome://extensions.
        </BentoTile>
        <BentoTile
          tone="brand"
          title="Your own views do not count"
          art={
            <BentoToast
              className="la-ext-toast-corner"
              icon={<Ticks state="sent" />}
              title="Own view ignored"
              subtitle="Opened in your Sent folder · not counted"
            />
          }
        >
          Opening the email in your own Gmail is not counted as an open; only the recipient&apos;s
          are. Tracking needs the image to load, so some opens are never reported.
        </BentoTile>
      </BentoGrid>
    </section>
  )
}
