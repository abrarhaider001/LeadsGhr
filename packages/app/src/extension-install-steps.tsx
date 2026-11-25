import { useState } from 'react'

const EXTENSIONS_PAGE = 'chrome://extensions'

const glyph = (path: string) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
)
const COPY_ICON = glyph('M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2zM5 15V5a2 2 0 0 1 2-2h8')
const CHECK_ICON = glyph('m5 12 5 5 9-10')

/**
 * The three install steps shown in the install tile of the LeadsGhr Mailer and Tracker pages. Chrome does not let
 * other programs open chrome:// pages, so the address is copied for the user to paste into Chrome.
 */
export function ExtensionInstallSteps({ lastStep }: { lastStep: string }) {
  const [copied, setCopied] = useState(false)

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(EXTENSIONS_PAGE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="la-ext-steps">
      <div className="la-ext-step">
        <b>1</b>Extract the ZIP to a folder you keep
      </div>
      <div className="la-ext-step">
        <b>2</b>Open <code>{EXTENSIONS_PAGE}</code>, then Load unpacked
        <button type="button" onClick={() => void copyAddress()}>
          {copied ? CHECK_ICON : COPY_ICON}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="la-ext-step">
        <b>3</b>
        {lastStep}
      </div>
    </div>
  )
}
