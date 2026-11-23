import { useState } from 'react'
import { ExtensionInstallPage } from './extension-install-page'

type SendingBridge = {
  downloadMailerExtension(): Promise<string | null>
}

const bridge = () => (window as Window & { leadsGhrDesktop?: SendingBridge }).leadsGhrDesktop

/** Email Sending is the extension download page itself; campaigns run in the extension's Sending tab. */
export function EmailSendingPage() {
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

  return (
    <ExtensionInstallPage
      onDownload={() => {
        void downloadExtension()
      }}
      message={message}
      eyebrow="LEADSGHR MAILER"
      finalStep={
        <>
          Click the LeadsGhr Mailer toolbar icon, open settings with the gear button, and save a
          template. Then open Gmail, click the LeadsGhr Mailer toolbar icon, pick the template,
          upload a CSV or Excel file, set Start, End, and Delay, and press{' '}
          <strong>Start sending</strong>.
        </>
      }
      requirement={
        <>
          <strong>Sending uses your Gmail session.</strong> Messages go out one at a time with a
          polite delay. Keep the Gmail tab open, stay signed in, and start with a small range while
          you verify delivery. Campaign recipients and bodies stay in the Chrome profile.
        </>
      }
    />
  )
}
