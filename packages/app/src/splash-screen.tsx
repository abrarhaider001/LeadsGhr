import { useEffect, useState } from 'react'
import { BrandLogo } from '@leadsghr/ui'
import { useAppVersion } from './updates'


/** The splash background (also shown behind the license screen): a dot grid in the brand colours,
 *  fading out behind the content and at the edges, with a soft glow. */
export function SplashBackground() {
  return <div className="la-splash__background la-splash__dots" aria-hidden="true" />
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

    // The logo is drawn from the design tokens, so only the fonts need to be ready.
    void Promise.allSettled([document.fonts.ready]).then(() => { if (!stopped) ready = true })
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
        <BrandLogo className="la-splash__logo" />
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
