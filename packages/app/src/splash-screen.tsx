import { useEffect, useState } from 'react'
import { useAppVersion } from './updates'

const logoUrl = new URL('../../../public/leadsghr-logo-v1.svg', import.meta.url).href
const fanLines = Array.from({ length: 17 }, (_, index) => -80 + index * 53)

/** The splash screen's fan lines; also shown behind the license screen. */
export function SplashBackground() {
  return <svg className="la-splash__background" viewBox="0 0 1600 700" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="la-splash-fan-left" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#5B12C9" stopOpacity=".55"/><stop offset="1" stopColor="#5B12C9" stopOpacity="0"/></linearGradient>
      <linearGradient id="la-splash-fan-right" x1="1" y1="0" x2="0" y2="0"><stop stopColor="#5B12C9" stopOpacity=".55"/><stop offset="1" stopColor="#5B12C9" stopOpacity="0"/></linearGradient>
    </defs>
    {fanLines.map((y) => <g key={y} fill="none" strokeWidth="1.3" vectorEffect="non-scaling-stroke">
      <path d={`M 0 ${y} Q 320 ${350 + (y - 350) * .16} 700 350`} stroke="url(#la-splash-fan-left)"/>
      <path d={`M 1600 ${y} Q 1280 ${350 + (y - 350) * .16} 900 350`} stroke="url(#la-splash-fan-right)"/>
    </g>)}
  </svg>
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const version = useAppVersion()

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const minimumDuration = 10_000
    const start = performance.now()
    let ready = false
    let frame = 0
    let finishTimer = 0
    let stopped = false

    const logo = new Image()
    const logoReady = new Promise<void>((resolve) => {
      logo.onload = () => resolve()
      logo.onerror = () => resolve()
      logo.src = logoUrl
    })
    void Promise.allSettled([document.fonts.ready, logoReady]).then(() => { if (!stopped) ready = true })
    const fallbackTimer = window.setTimeout(() => { ready = true }, 5000)

    const tick = (now: number) => {
      const elapsed = now - start
      const fraction = Math.min(elapsed / minimumDuration, 1)
      const next = ready && fraction === 1 ? 100 : reducedMotion ? 0 : Math.min(92, Math.round((1 - (1 - fraction) ** 2) * 92))
      setProgress(next)
      if (next === 100) {
        setLeaving(true)
        finishTimer = window.setTimeout(onComplete, reducedMotion ? 0 : 360)
      } else {
        frame = window.requestAnimationFrame(tick)
      }
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      stopped = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(finishTimer)
      window.clearTimeout(fallbackTimer)
    }
  }, [onComplete])

  return (
    <div className={`la-splash${leaving ? ' la-splash--leaving' : ''}`} aria-label="Opening LeadsGhr">
      <SplashBackground />
      <div className="la-splash__content">
        <img className="la-splash__logo" src={logoUrl} alt="LeadsGhr" />
        <h1 className="la-splash__headline">Discover businesses. Build leads.</h1>
        <p className="la-splash__description">Discover public business information and build a useful local lead list.</p>
        <div className="la-splash__track" role="progressbar" aria-label="Loading LeadsGhr" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="la-splash__fill" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span className="la-splash__loading">Opening workspace</span>
      </div>
      {version && <span className="la-splash__version">Version {version}</span>}
    </div>
  )
}
