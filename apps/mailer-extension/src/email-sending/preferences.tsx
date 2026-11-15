import { useEffect, useState } from 'react'
import { defaultSendingPreferences, loadSendingPreferences, saveSendingPreferences } from './storage'
import { COMPOSE_STEPS, type DelayMode, type SendingPreferences } from './types'

const OPTIONS: { value: DelayMode; title: string; detail: string }[] = [
  {
    value: 'between',
    title: 'Wait between emails',
    detail: 'Each email is opened, filled, and sent right away. The delay is the wait after one email is sent before the next one starts. Example with 10 s: sent at 0:03, next starts at 0:13.',
  },
  {
    value: 'steps',
    title: 'Spread across steps',
    detail: `The delay is the total time for one email, split evenly over its ${COMPOSE_STEPS} steps. Example with 10 s: open compose at 0:00, fill the email address at 0:02.5, fill the template at 0:05, click Send at 0:07.5, next email at 0:10.`,
  },
]

/** Settings section: how the popup's Delay (s) value is used. Saved immediately; applies to the next run. */
export function SendingPreferencesPanel() {
  const [preferences, setPreferences] = useState<SendingPreferences>(defaultSendingPreferences)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { void loadSendingPreferences().then(setPreferences) }, [])

  async function choose(delayMode: DelayMode) {
    const previous = preferences
    const next = { ...preferences, delayMode }
    setPreferences(next)
    setError('')
    try {
      await saveSendingPreferences(next)
      setSaved(true)
    } catch (problem) {
      setPreferences(previous)
      if (!(problem instanceof DOMException && problem.name === 'AbortError')) setError(problem instanceof Error ? problem.message : String(problem))
    }
  }

  return <section aria-labelledby="preferences-title">
    <h2 id="preferences-title">Preferences</h2>
    <fieldset className="choice-group">
      <legend>Delay type</legend>
      {OPTIONS.map((option) => <label key={option.value} className={`choice ${preferences.delayMode === option.value ? 'selected' : ''}`}>
        <input type="radio" name="delay-mode" value={option.value} checked={preferences.delayMode === option.value} onChange={() => void choose(option.value)}/>
        <span><strong>{option.title}</strong><small>{option.detail}</small></span>
      </label>)}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <p className="muted" role="status">{saved ? 'Saved. Applies to the next run you start.' : 'Applies to the next run you start. A run that is already sending keeps its delay type.'}</p>
  </section>
}
