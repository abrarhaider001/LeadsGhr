import { useState } from 'react'
import { ExtensionInstallPage } from './extension-install-page'

type ScraperBridge = {
  downloadScraperExtension(): Promise<string | null>
}

const bridge = () => (window as Window & { leadsGhrDesktop?: ScraperBridge }).leadsGhrDesktop

/** LeadsGhr Scraper is the extension download page, laid out like Email Sending (the Mailer). */
export function ScraperExtensionPage() {
  const [message, setMessage] = useState('')

  async function downloadExtension() {
    try {
      const api = bridge()
      if (!api?.downloadScraperExtension)
        throw new Error('Restart the desktop app to enable extension download.')
      const path = await api.downloadScraperExtension()
      setMessage(path ? `Saved to ${path}` : 'Download cancelled')
    } catch (error) {
      setMessage(String(error))
    }
  }

  return (
    <ExtensionInstallPage
      onDownload={() => {
        void downloadExtension()
      }}
      message={message}
      eyebrow="LEADSGHR SCRAPER"
      finalStep={
        <>
          Open the Scraper's settings with the gear button and choose its <code>data</code> folder.
          Then, in <strong>New Search</strong>, pick the niche, state, and locations and select{' '}
          <strong>Send to LeadsGhr Scraper</strong>. Press <strong>Start scraping</strong> in the
          Scraper; the businesses it finds appear in <strong>Scraper Results</strong>.
        </>
      }
      requirement={
        <>
          <strong>Use a Chrome profile that is not signed in to Google.</strong> The Scraper reads
          Google Search's business list one location at a time with polite pauses, and stops if
          Google shows its check page. Keep its settings tab open while it runs.
        </>
      }
    />
  )
}
