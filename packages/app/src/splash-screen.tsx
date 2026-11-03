import { useEffect, useState } from 'react'

const logoUrl = new URL('../../../public/leadsghr-logo-v1.svg', import.meta.url).href

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const minimumDuration = reducedMotion ? 100 : 1700
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
      const next = ready && fraction === 1 ? 100 : Math.min(92, Math.round((1 - (1 - fraction) ** 2) * 92))
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
      <div className="la-splash__content">
        <img className="la-splash__logo" src={logoUrl} alt="LeadsGhr" />
        <div className="la-splash__track" role="progressbar" aria-label="Loading LeadsGhr" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="la-splash__fill" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      </div>
    </div>
  )
}
