import { useEffect, useRef, useState, type ReactNode } from 'react'
import Avatar, { genConfig } from 'react-nice-avatar'
import {
  PREFERENCE_SECTIONS,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  DISPLAY_SIZE_STEP,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  clampDisplaySize,
  clampFontSize,
  applyEmailVerifyChecksToPreferences,
  matchingSearchSpeed,
  minutesPerLocation,
  SEARCH_TIMING_LIMITS,
  SEARCH_TIMING_PRESETS,
  searchTimingFrom,
  searchTimingPreferences,
  type DesktopPreferences,
  type SearchSpeed,
  type SearchTiming,
} from '@leadsghr/schemas'
import { saveLocalAccount, type LocalAccount } from './account-data'
import { UpdatesPanel, type UpdateState } from './updates'

type SettingsBridge = {
  exportPreferences(keys?: string[]): Promise<string>
  importPreferences(): Promise<{
    preferences: DesktopPreferences
    path: string
    applied: number
    skipped: number
    ignored: number
  } | null>
  showSettingsExport(path: string): Promise<void>
}
const settingsBridge = () =>
  (window as Window & { leadsGhrDesktop?: Partial<SettingsBridge> }).leadsGhrDesktop

type SettingsNotice =
  | { kind: 'exported'; path: string; count: number }
  | { kind: 'imported'; path: string; applied: number; skipped: number; ignored: number }
  | { kind: 'error'; message: string }

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "12 settings updated", plus what was left unchanged when the file came from another version. */
function importSummary(notice: { applied: number; skipped: number; ignored: number }): string {
  const parts = [`${plural(notice.applied, 'setting')} updated`]
  if (notice.skipped)
    parts.push(`${plural(notice.skipped, 'setting')} kept as before (value not supported)`)
  if (notice.ignored)
    parts.push(`${plural(notice.ignored, 'setting')} from another version ignored`)
  return parts.join('; ')
}

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path

type PreferenceKeyName = keyof DesktopPreferences

/** Current value shown next to each setting in "Choose what to export". */
function describeValue(
  key: PreferenceKeyName,
  value: DesktopPreferences[PreferenceKeyName] | undefined,
): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (key === 'crawlerEmailSource')
    return value === 'email-hunter' ? 'Email Hunter-style' : 'Our behavior'
  if (key === 'crawlerFetchMethod')
    return value === 'http' ? 'Lightweight HTTP' : 'Browser rendering'
  if (key === 'emailVerifyPaceMs') return `${value} ms`
  if (key === 'theme')
    return value === 'dark' ? 'Dark' : value === 'system' ? 'Match Windows' : 'Light'
  if (key === 'displaySize' || key === 'fontSize') return `${value}%`
  if (key === 'searchSpeed') return String(value).charAt(0).toUpperCase() + String(value).slice(1)
  if (key === 'searchBreakEvery') return value ? `Every ${value} locations` : 'Off'
  if (key === 'searchBreakMinutes') return `${value} min`
  if (/^search.*Sec$/.test(key)) return `${value} s`
  return String(value)
}

/** Checkbox that also shows a mixed state, for a section with only some settings chosen. */
function MixedCheckbox({
  checked,
  mixed,
  label,
  onChange,
}: {
  checked: boolean
  mixed: boolean
  label: string
  onChange(next: boolean): void
}) {
  const box = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (box.current) box.current.indeterminate = mixed
  }, [mixed])
  return (
    <input
      ref={box}
      type="checkbox"
      checked={checked}
      aria-label={label}
      aria-checked={mixed ? 'mixed' : checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

/** "Choose what to export": whole sections or single settings. */
function ExportChooser({
  preferences,
  busy,
  onCancel,
  onExport,
}: {
  preferences: DesktopPreferences
  busy: boolean
  onCancel(): void
  onExport(keys: string[]): void
}) {
  const [chosen, setChosen] = useState<Set<string>>(
    () =>
      new Set(
        PREFERENCE_SECTIONS.flatMap((section) => section.settings.map((setting) => setting.key)),
      ),
  )
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(PREFERENCE_SECTIONS.map((section) => section.id)),
  )
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef(onCancel)
  cancel.current = onCancel
  // Focus the dialog once when it opens, and close it with Escape.
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggle = (keys: string[], on: boolean) =>
    setChosen((current) => {
      const next = new Set(current)
      for (const key of keys) {
        if (on) next.add(key)
        else next.delete(key)
      }
      return next
    })
  const total = PREFERENCE_SECTIONS.reduce((sum, section) => sum + section.settings.length, 0)

  return (
    <div
      className="la-export-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialog}
        className="la-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="la-export-title"
      >
        <div className="la-export-head">
          <div>
            <h2 id="la-export-title">Choose what to export</h2>
            <p>Tick a whole section, or open it and pick single settings.</p>
          </div>
          <div className="la-export-quick">
            <button
              type="button"
              onClick={() =>
                toggle(
                  PREFERENCE_SECTIONS.flatMap((section) =>
                    section.settings.map((setting) => setting.key),
                  ),
                  true,
                )
              }
            >
              Select all
            </button>
            <button type="button" onClick={() => setChosen(new Set())}>
              Clear
            </button>
          </div>
        </div>
        <div className="la-export-sections">
          {PREFERENCE_SECTIONS.map((section) => {
            const keys = section.settings.map((setting) => setting.key as string)
            const count = keys.filter((key) => chosen.has(key)).length
            const expanded = open.has(section.id)
            return (
              <section key={section.id} className="la-export-section">
                <div className="la-export-section-head">
                  <label className="la-export-check">
                    <MixedCheckbox
                      checked={count === keys.length}
                      mixed={count > 0 && count < keys.length}
                      label={`Export all ${section.title} settings`}
                      onChange={(on) => toggle(keys, on)}
                    />
                    <span>
                      <strong>{section.title}</strong>
                      <small>
                        {count} of {keys.length} settings
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="la-export-expand"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Hide' : 'Show'} ${section.title} settings`}
                    onClick={() =>
                      setOpen((current) => {
                        const next = new Set(current)
                        if (next.has(section.id)) next.delete(section.id)
                        else next.add(section.id)
                        return next
                      })
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                    </svg>
                  </button>
                </div>
                {expanded && (
                  <ul className="la-export-settings">
                    {section.settings.map((setting) => (
                      <li key={setting.key}>
                        <label className="la-export-check">
                          <input
                            type="checkbox"
                            checked={chosen.has(setting.key)}
                            onChange={(event) => toggle([setting.key], event.target.checked)}
                          />
                          <span>{setting.label}</span>
                          <em>{describeValue(setting.key, preferences[setting.key])}</em>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
        <div className="la-export-foot">
          <span>
            {chosen.size} of {total} settings selected
          </span>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!chosen.size || busy}
            onClick={() => onExport([...chosen])}
          >
            {busy ? 'Exporting…' : `Export ${chosen.size} setting${chosen.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Export (chosen settings) and import of preferences as a JSON file, with a notice after each action. */
function SettingsTransfer({
  preferences,
  onImported,
}: {
  preferences: DesktopPreferences
  onImported(next: DesktopPreferences): void
}) {
  const [choosing, setChoosing] = useState(false)
  const [notice, setNotice] = useState<SettingsNotice | null>(null)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)

  async function exportSettings(keys: string[]) {
    const api = settingsBridge()
    if (!api?.exportPreferences) {
      setNotice({ kind: 'error', message: 'Restart the desktop app to enable settings export.' })
      setChoosing(false)
      return
    }
    setBusy('export')
    try {
      setNotice({ kind: 'exported', path: await api.exportPreferences(keys), count: keys.length })
      setChoosing(false)
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
            : String(error),
      })
    } finally {
      setBusy(null)
    }
  }

  async function importSettings() {
    const api = settingsBridge()
    if (!api?.importPreferences) {
      setNotice({ kind: 'error', message: 'Restart the desktop app to enable settings import.' })
      return
    }
    setBusy('import')
    try {
      const result = await api.importPreferences()
      if (!result) return
      onImported(result.preferences)
      setNotice({
        kind: 'imported',
        path: result.path,
        applied: result.applied ?? 0,
        skipped: result.skipped ?? 0,
        ignored: result.ignored ?? 0,
      })
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
            : String(error),
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="la-settings-transfer">
      <div className="la-settings-transfer-bar">
        <div>
          <h2>Set up in one click</h2>
          <p>
            Import a teammate's settings instead of choosing every option again, or export yours to
            share.
          </p>
        </div>
        <div className="la-settings-transfer-actions">
          <button type="button" disabled={busy !== null} onClick={() => void importSettings()}>
            {busy === 'import' ? 'Importing…' : 'Import settings'}
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy !== null}
            onClick={() => {
              setNotice(null)
              setChoosing(true)
            }}
          >
            Export settings
          </button>
        </div>
      </div>
      {notice && (
        <div
          className={`la-settings-notice ${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          <span className="la-settings-notice-icon" aria-hidden="true">
            {notice.kind === 'error' ? '!' : '✓'}
          </span>
          <div className="la-settings-notice-text">
            {notice.kind === 'exported' && (
              <>
                <strong>Settings exported</strong>
                <span>
                  {plural(notice.count, 'setting')} saved as {fileName(notice.path)} in
                  C:\LeadsGhr\settings. Send this file to share them.
                </span>
              </>
            )}
            {notice.kind === 'imported' && (
              <>
                <strong>Settings imported successfully</strong>
                <span>
                  {importSummary(notice)} from {fileName(notice.path)}.
                </span>
              </>
            )}
            {notice.kind === 'error' && (
              <>
                <strong>Settings not changed</strong>
                <span>{notice.message}</span>
              </>
            )}
          </div>
          {notice.kind === 'exported' && (
            <button
              type="button"
              onClick={() => void settingsBridge()?.showSettingsExport?.(notice.path)}
            >
              Show in folder
            </button>
          )}
          <button
            type="button"
            className="la-settings-notice-close"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
      {choosing && (
        <ExportChooser
          preferences={preferences}
          busy={busy === 'export'}
          onCancel={() => setChoosing(false)}
          onExport={(keys) => void exportSettings(keys)}
        />
      )}
    </div>
  )
}

type EmailVerifyCheckKey =
  | 'emailVerifyCheckSyntax'
  | 'emailVerifyCheckDomain'
  | 'emailVerifyCheckMx'
  | 'emailVerifyCheckSmtp'
  | 'emailVerifyCheckDisposable'
  | 'emailVerifyCheckRoleBased'
  | 'emailVerifyCheckCatchAll'

type PreferenceKey = Exclude<
  keyof DesktopPreferences,
  | 'crawlerEmailSource'
  | 'crawlerFetchMethod'
  | 'crawlerConcurrentPages'
  | EmailVerifyCheckKey
  | 'emailVerifyMailFrom'
  | 'emailVerifyEhlo'
  | 'emailVerifyPerSession'
  | 'emailVerifyPaceMs'
  | 'theme'
  | 'displaySize'
  | 'fontSize'
  | 'searchSpeed'
  | 'searchScrollPauseSec'
  | 'searchMorePlacesPauseSec'
  | 'searchScrollRounds'
  | 'searchPagePauseMinSec'
  | 'searchPagePauseMaxSec'
  | 'searchPagesPerLocation'
  | 'searchLocationPauseSec'
  | 'searchBreakEvery'
  | 'searchBreakMinutes'
>

const emailVerifyCheckOptions: { key: EmailVerifyCheckKey; title: string; detail: string }[] = [
  {
    key: 'emailVerifyCheckSyntax',
    title: 'Syntax',
    detail: 'Strict local format check. Used for confidence when the address shape is wrong.',
  },
  { key: 'emailVerifyCheckDomain', title: 'Domain', detail: 'Confirm the domain resolves in DNS.' },
  { key: 'emailVerifyCheckMx', title: 'MX', detail: 'Confirm the domain has mail exchange hosts.' },
  {
    key: 'emailVerifyCheckSmtp',
    title: 'SMTP',
    detail: 'Probe mailbox acceptance with a local RCPT TO check. Nothing is sent.',
  },
  {
    key: 'emailVerifyCheckDisposable',
    title: 'Disposable',
    detail: 'Flag throwaway mailbox providers from the local list (−40 confidence).',
  },
  {
    key: 'emailVerifyCheckRoleBased',
    title: 'Role-based',
    detail: 'Flag shared roles such as info@ or sales@ (−15 confidence).',
  },
  {
    key: 'emailVerifyCheckCatchAll',
    title: 'Catch-all',
    detail: 'Detect domains that accept any mailbox (−40 confidence). Needs SMTP.',
  },
]
const groups: {
  title: string
  description: string
  options: { key: PreferenceKey; title: string; detail: string }[]
}[] = [
  {
    title: 'Crawler',
    description: 'Control the public webpage test view.',
    options: [
      {
        key: 'showCrawlerPreview',
        title: 'Show webpage in Crawler',
        detail: 'Display the live page while the crawler scrolls and extracts emails.',
      },
      {
        key: 'crawlerContactOnly',
        title: 'Crawl homepage and contact page only',
        detail:
          'On: inspect the homepage and contact page. Off: Crawler and Pipeline queue new same-site links found on crawled pages, up to their page limits.',
      },
    ],
  },
  {
    title: 'Search window',
    description: 'Choose whether the separate Chrome window is visible.',
    options: [
      {
        key: 'showChromeDuringSearch',
        title: 'Show Chrome while searching',
        detail: 'Watch each location search in Chrome. Turn off to run it in the background.',
      },
    ],
  },
  {
    title: 'Search sources',
    description:
      'Choose where each search looks for businesses. With both on, Google Maps is searched first, then Google Search, and both appear in one results table.',
    options: [
      {
        key: 'searchGoogleMaps',
        title: 'Show Google Maps listings',
        detail: 'Show public business rows found in Maps.',
      },
      {
        key: 'searchGooglePlaces',
        title: 'Show Google Search business listings',
        detail:
          'Also read the business list behind "More businesses" in Google Search (all of its pages). It often finds businesses Maps misses. Slower, and Google may show a captcha sooner.',
      },
    ],
  },
  {
    title: 'Search breadth',
    description: 'Control how many searches are made for each selected niche and location.',
    options: [
      {
        key: 'useNicheKeywords',
        title: 'Use Niche Library search terms',
        detail:
          'Off: search the niche name once per location (faster). On: search every term in its pack (broader, slower).',
      },
    ],
  },
  {
    title: 'Search result filters',
    description: 'Choose which public business listings appear in the temporary table.',
    options: [
      {
        key: 'showListingsWithoutWebsite',
        title: 'Show businesses without a website',
        detail: 'Off by default. Hide listings whose website URL is not shown.',
      },
    ],
  },
  {
    title: 'Search result fields',
    description: 'Keep and display these fields in the temporary contractor results table.',
    options: [
      {
        key: 'includeCompanyName',
        title: 'Company name',
        detail: 'Include the business name when it is available.',
      },
      {
        key: 'includeWebsite',
        title: 'Website URL',
        detail: 'Include a clickable public business website link.',
      },
      {
        key: 'includePhone',
        title: 'Phone number',
        detail: 'Include a publicly displayed phone number.',
      },
      {
        key: 'includeAddress',
        title: 'Street address',
        detail: 'Include an address shown on the public result card.',
      },
      {
        key: 'includeLocation',
        title: 'Searched location',
        detail: 'Include the location used for this search.',
      },
    ],
  },
  {
    title: 'Automatic updates',
    description:
      'Applies to the installed app. A downloaded update installs when you restart or close LeadsGhr.',
    options: [
      {
        key: 'autoUpdate',
        title: 'Download updates automatically',
        detail:
          'On: new versions download in the background, then LeadsGhr asks to restart. Off: LeadsGhr only shows that a new version is available; select Update now to download it.',
      },
    ],
  },
]

const THEME_OPTIONS: { value: DesktopPreferences['theme']; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'White cards on a soft grey canvas.' },
  { value: 'dark', label: 'Dark', hint: 'Charcoal surfaces, easier on the eyes at night.' },
  { value: 'system', label: 'Match Windows', hint: 'Follows the Windows light or dark setting.' },
]
/** A small picture of the app in one theme, drawn with that theme's tokens (data-theme on the element). */
function ThemePreview({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <span className="la-theme-mini" data-theme={theme} aria-hidden="true">
      <span className="la-theme-mini-side">
        <i />
        <i className="is-on" />
        <i />
        <i />
      </span>
      <span className="la-theme-mini-main">
        <i className="la-theme-mini-title" />
        <span className="la-theme-mini-cards">
          <i />
          <i />
          <i />
        </span>
        <span className="la-theme-mini-panel">
          <i className="la-theme-mini-line" />
          <i className="la-theme-mini-button" />
        </span>
      </span>
    </span>
  )
}
const SPEED_OPTIONS: { value: SearchSpeed; label: string; hint: string }[] = [
  {
    value: 'careful',
    label: 'Careful',
    hint: 'Longest pauses. For big jobs or after Google has shown its check page.',
  },
  { value: 'normal', label: 'Normal', hint: 'Balanced pauses for everyday jobs. The default.' },
  {
    value: 'faster',
    label: 'Faster',
    hint: 'Shortest allowed pauses. Google may show its check page sooner.',
  },
  { value: 'custom', label: 'Custom', hint: 'Chosen automatically when you change a pause below.' },
]
type TimingKey = keyof SearchTiming

/** A number field that accepts typing freely and saves only values inside the allowed range (clamped on leaving). */
function TimingField({
  value,
  limit,
  step,
  unit,
  label,
  onCommit,
}: {
  value: number
  limit: readonly [number, number]
  step: number
  unit: string
  label: string
  onCommit(next: number): void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const valid = (raw: string) => {
    const number = Number(raw)
    return raw.trim() !== '' && Number.isFinite(number) && number >= limit[0] && number <= limit[1]
  }
  return (
    <span className="la-timing-field">
      <input
        type="number"
        inputMode="decimal"
        min={limit[0]}
        max={limit[1]}
        step={step}
        value={text}
        aria-label={label}
        aria-invalid={!valid(text)}
        onChange={(event) => {
          const raw = event.currentTarget.value
          setText(raw)
          if (valid(raw)) onCommit(Number(raw))
        }}
        onBlur={() => {
          const number = Number(text)
          const next =
            text.trim() !== '' && Number.isFinite(number)
              ? Math.min(limit[1], Math.max(limit[0], number))
              : value
          setText(String(next))
          if (next !== value) onCommit(next)
        }}
      />
      {unit && <em>{unit}</em>}
    </span>
  )
}

/**
 * Search timing (at the end of Preferences → Search): presets and the pauses used by LeadsGhr Scraper and the Google
 * Search business list (packages/schemas/src/search-timing.ts). Picking a preset fills in its pauses; changing a
 * pause picks Custom (or the preset it now matches).
 */
function SearchTimingSettings({
  preferences,
  onChange,
}: {
  preferences: DesktopPreferences
  onChange(next: DesktopPreferences): void
}) {
  const timing = searchTimingFrom(preferences)
  const update = (key: TimingKey, value: number) => {
    const next = { ...timing, [key]: value }
    if (key === 'pagePauseMinSec' && next.pagePauseMaxSec < value) next.pagePauseMaxSec = value
    if (key === 'pagePauseMaxSec' && next.pagePauseMinSec > value) next.pagePauseMinSec = value
    onChange({
      ...preferences,
      ...searchTimingPreferences(next),
      searchSpeed: matchingSearchSpeed(next),
    })
  }
  const pick = (speed: SearchSpeed) =>
    onChange(
      speed === 'custom'
        ? { ...preferences, searchSpeed: 'custom' }
        : {
            ...preferences,
            ...searchTimingPreferences(SEARCH_TIMING_PRESETS[speed]),
            searchSpeed: speed,
          },
    )
  const field = (key: TimingKey, unit: string, label: string, step = 1) => (
    <TimingField
      value={timing[key]}
      limit={SEARCH_TIMING_LIMITS[key]}
      step={step}
      unit={unit}
      label={label}
      onCommit={(next) => update(key, next)}
    />
  )
  const row = (title: string, hint: string, control: ReactNode) => (
    <div className="la-profile-option la-timing-row">
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
      {control}
    </div>
  )
  const range = (key: TimingKey) =>
    `${SEARCH_TIMING_LIMITS[key][0]} to ${SEARCH_TIMING_LIMITS[key][1]}`
  return (
    <div className="la-timing">
      <div className="la-timing-head">
        <h2>Search timing</h2>
        <p>
          How long Google searches wait between steps, so Google is less likely to stop them. Used
          by LeadsGhr Scraper and the Google Search business list.
        </p>
      </div>
      <section className="la-profile-preference-group">
        <div>
          <h2>Speed</h2>
          <p>
            Start from a preset, then fine-tune the pauses below. Slower is less likely to be
            stopped by Google's check page.
          </p>
        </div>
        <div className="la-timing-presets" role="radiogroup" aria-label="Search speed">
          {SPEED_OPTIONS.map((option) => {
            const preset = option.value === 'custom' ? timing : SEARCH_TIMING_PRESETS[option.value]
            const minutes = minutesPerLocation(preset)
            return (
              <label
                key={option.value}
                className={`la-timing-preset${preferences.searchSpeed === option.value ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="search-speed"
                  checked={preferences.searchSpeed === option.value}
                  onChange={() => pick(option.value)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                  <b>
                    ~{minutes < 1.95 ? minutes.toFixed(1) : Math.round(minutes)} min per location
                  </b>
                </span>
              </label>
            )
          })}
        </div>
      </section>
      <section className="la-profile-preference-group">
        <div>
          <h2>Scrolling</h2>
          <p>Each results page is scrolled to the bottom until no new businesses load.</p>
        </div>
        <div className="la-profile-option-list">
          {row(
            'Pause after each scroll',
            `${range('scrollPauseSec')} seconds. Time for Google to load more businesses before the next scroll.`,
            field('scrollPauseSec', 's', 'Pause after each scroll', 0.1),
          )}
          {row(
            'Pause after "More places"',
            `${range('morePlacesPauseSec')} seconds. Used when the Scraper presses Google's More places button.`,
            field('morePlacesPauseSec', 's', 'Pause after More places', 0.5),
          )}
          {row(
            'Scrolls per page',
            `${range('scrollRounds')}. Stops earlier when two scrolls in a row find nothing new.`,
            field('scrollRounds', 'max', 'Scrolls per page'),
          )}
        </div>
      </section>
      <section className="la-profile-preference-group">
        <div>
          <h2>Pages</h2>
          <p>After a page is read, the next-page arrow is followed.</p>
        </div>
        <div className="la-profile-option-list">
          {row(
            'Pause before the next page',
            `${range('pagePauseMinSec')} seconds. A random time between the two values, so the timing is not mechanical.`,
            <span className="la-timing-range">
              {field('pagePauseMinSec', 's', 'Shortest pause before the next page', 0.5)}
              <i>to</i>
              {field('pagePauseMaxSec', 's', 'Longest pause before the next page', 0.5)}
            </span>,
          )}
          {row(
            'Pages per location',
            `${range('pagesPerLocation')}. Google rarely shows useful results after page 5.`,
            field('pagesPerLocation', 'pages', 'Pages per location'),
          )}
        </div>
      </section>
      <section className="la-profile-preference-group">
        <div>
          <h2>Locations</h2>
          <p>Each location opens in a new tab after the previous one is finished.</p>
        </div>
        <div className="la-profile-option-list">
          {row(
            'Pause between locations',
            `${range('locationPauseSec')} seconds. Counted from the start of the previous location.`,
            field('locationPauseSec', 's', 'Pause between locations', 5),
          )}
          {row(
            'Longer break',
            'Every few locations, rest longer. Set locations to 0 to turn it off.',
            <span className="la-timing-range">
              {field('breakEvery', 'locations', 'Longer break every how many locations')}
              <i>rest</i>
              {field('breakMinutes', 'min', 'Longer break minutes')}
            </span>,
          )}
        </div>
      </section>
      <div className="la-timing-note">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5m0-8h.01" />
        </svg>
        <p>
          <strong>Applies to LeadsGhr Scraper and the Google Search business list.</strong> A
          Scraper job keeps the pauses it was sent with; change them here before you select Send to
          LeadsGhr Scraper. The lower limits keep searches polite and cannot be set lower.{' '}
          <button type="button" className="la-timing-link" onClick={() => pick('normal')}>
            Reset to Normal
          </button>
        </p>
      </div>
    </div>
  )
}

const ZOOM_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', '+'], label: 'Larger' },
  { keys: ['Ctrl', '−'], label: 'Smaller' },
  { keys: ['Ctrl', '0'], label: 'Reset to 100%' },
]
const minusIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
  </svg>
)
const plusIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M12 5v14" />
  </svg>
)
/** Appearance → Font size. Scales type only; spacing, buttons, and the window zoom stay as they are. */
function FontSizeSetting({ value, onChange }: { value: number; onChange(next: number): void }) {
  const set = (next: number) => {
    const size = clampFontSize(next)
    if (size !== value) onChange(size)
  }
  return (
    <section className="la-profile-preference-group">
      <div>
        <h2>Font size</h2>
        <p>Make the type larger or smaller. Spacing and controls stay the same.</p>
      </div>
      <div className="la-profile-option-list">
        <div className="la-profile-option la-size-row">
          <span>
            <strong>Type</strong>
            <small>
              Default is 100%. Range {FONT_SIZE_MIN}–{FONT_SIZE_MAX}%.
            </small>
          </span>
          <span className="la-size-row-controls">
            <span className="la-size-stepper" role="group" aria-label="Font size">
              <button
                type="button"
                onClick={() => set(value - FONT_SIZE_STEP)}
                disabled={value <= FONT_SIZE_MIN}
                aria-label="Smaller type"
              >
                {minusIcon}
              </button>
              <output aria-live="polite">{value}%</output>
              <button
                type="button"
                onClick={() => set(value + FONT_SIZE_STEP)}
                disabled={value >= FONT_SIZE_MAX}
                aria-label="Larger type"
              >
                {plusIcon}
              </button>
            </span>
            <button
              type="button"
              className="la-size-reset"
              onClick={() => set(100)}
              disabled={value === 100}
            >
              Reset
            </button>
          </span>
        </div>
      </div>
    </section>
  )
}
/** Appearance → Display size, in the settings-row style (owner-chosen 2026-11-22): the window zoom in percent, the same setting Ctrl + / Ctrl - / Ctrl 0 change. */
function DisplaySizeSetting({ value, onChange }: { value: number; onChange(next: number): void }) {
  const set = (next: number) => {
    const size = clampDisplaySize(next)
    if (size !== value) onChange(size)
  }
  return (
    <section className="la-profile-preference-group">
      <div>
        <h2>Display size</h2>
        <p>Make text and controls larger or smaller.</p>
      </div>
      <div className="la-profile-option-list">
        <div className="la-profile-option la-size-row">
          <span>
            <strong>Zoom</strong>
            <small>
              Default is 100%. Range {DISPLAY_SIZE_MIN}–{DISPLAY_SIZE_MAX}%.
            </small>
          </span>
          <span className="la-size-row-controls">
            <span className="la-size-stepper" role="group" aria-label="Display size">
              <button
                type="button"
                onClick={() => set(value - DISPLAY_SIZE_STEP)}
                disabled={value <= DISPLAY_SIZE_MIN}
                aria-label="Smaller"
              >
                {minusIcon}
              </button>
              <output aria-live="polite">{value}%</output>
              <button
                type="button"
                onClick={() => set(value + DISPLAY_SIZE_STEP)}
                disabled={value >= DISPLAY_SIZE_MAX}
                aria-label="Larger"
              >
                {plusIcon}
              </button>
            </span>
            <button
              type="button"
              className="la-size-reset"
              onClick={() => set(100)}
              disabled={value === 100}
            >
              Reset
            </button>
          </span>
        </div>
        <div className="la-profile-option la-size-row">
          <span>
            <strong>Keyboard shortcuts</strong>
            <small>Work anywhere in LeadsGhr and change this same setting.</small>
          </span>
          <ul className="la-size-shortcuts" aria-label="Keyboard shortcuts">
            {ZOOM_SHORTCUTS.map((shortcut) => (
              <li key={shortcut.label} title={shortcut.label}>
                <span className="la-kbd-group">
                  {shortcut.keys.map((key, index) => (
                    <span key={key}>
                      {index > 0 && <span className="la-kbd-plus">+</span>}
                      <kbd className="la-kbd">{key}</kbd>
                    </span>
                  ))}
                </span>
                <span className="la-size-shortcut-label">{shortcut.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
type PreferenceCategory = 'Appearance' | 'Crawler' | 'Search' | 'Email Validation' | 'Updates'
const PREFERENCE_CATEGORIES: { name: PreferenceCategory; description: string }[] = [
  { name: 'Appearance', description: 'How LeadsGhr looks on this computer.' },
  { name: 'Crawler', description: 'How Crawler and Pipeline read public websites.' },
  { name: 'Search', description: 'What searches and pipelines collect.' },
  { name: 'Email Validation', description: 'How LeadsGhr checks email addresses.' },
  { name: 'Updates', description: 'How LeadsGhr finds and installs new versions.' },
]
const gearIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const chevronIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)
const groupCategory = (title: string): PreferenceCategory =>
  title === 'Crawler' ? 'Crawler' : title === 'Automatic updates' ? 'Updates' : 'Search'

export function ProfilePage({
  section,
  updateState,
  preferences,
  onPreferencesChange,
  onPreferencesImported,
  saveMessage,
  account,
  onAccountChange,
  avatarSeed,
  onRegenerateAvatar,
}: {
  section: 'account' | 'preferences'
  updateState: UpdateState
  preferences: DesktopPreferences
  onPreferencesChange(next: DesktopPreferences): void
  onPreferencesImported(next: DesktopPreferences): void
  saveMessage: string
  account: LocalAccount
  onAccountChange(next: LocalAccount): void
  avatarSeed: string
  onRegenerateAvatar(): void
}) {
  const [preferenceCategory, setPreferenceCategory] = useState<PreferenceCategory>('Appearance')
  const [draft, setDraft] = useState(account)
  const [accountMessage, setAccountMessage] = useState('')
  function saveAccount(event: React.FormEvent) {
    event.preventDefault()
    const next = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
    }
    if (!next.firstName || !next.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
      setAccountMessage('Enter a first name, last name, and valid email.')
      return
    }
    try {
      saveLocalAccount(next)
      onAccountChange(next)
      setAccountMessage('Profile details saved on this computer.')
    } catch {
      setAccountMessage('Could not save profile details.')
    }
  }
  return (
    <div className="la-profile">
      {section === 'account' ? (
        <div className="la-profile-account-content" aria-label="Profile">
          <section className="la-profile-account">
            <div className="la-profile-identity">
              <div className="la-profile-avatar">
                <Avatar style={{ width: 76, height: 76 }} {...genConfig(avatarSeed)} />
              </div>
              <div>
                <h2>
                  {account.firstName} {account.lastName}
                </h2>
                <p>Local workspace profile</p>
              </div>
              <button type="button" onClick={onRegenerateAvatar}>
                Generate new
              </button>
            </div>
            <form className="la-account-form" onSubmit={saveAccount}>
              <div className="la-account-fields">
                <label>
                  First Name
                  <input
                    type="text"
                    value={draft.firstName}
                    maxLength={80}
                    onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Last Name
                  <input
                    type="text"
                    value={draft.lastName}
                    maxLength={80}
                    onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
                    required
                  />
                </label>
                <label className="la-account-email">
                  Email
                  <input
                    type="email"
                    value={draft.email}
                    maxLength={254}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="la-account-actions">
                <span role="status">{accountMessage}</span>
                <button type="submit">Save profile</button>
              </div>
            </form>
            <p className="la-profile-note">
              These details are stored on this computer. Supabase authentication is not connected
              yet.
            </p>
          </section>
          <section className="la-profile-account la-password-section">
            <div>
              <h2>Reset Password</h2>
              <p>Account password changes will be available when Supabase sign-in is connected.</p>
            </div>
            <div className="la-account-fields">
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  disabled
                  placeholder="Authentication required"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled
                  placeholder="Authentication required"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled
                  placeholder="Authentication required"
                />
              </label>
            </div>
            <button type="button" disabled>
              Reset password
            </button>
          </section>
        </div>
      ) : (
        <div className="la-pref-layout">
          <nav className="la-pref-nav" aria-label="Preference categories">
            <p className="la-pref-nav-title">{gearIcon}Settings</p>
            {PREFERENCE_CATEGORIES.map(({ name }) => (
              <button
                type="button"
                key={name}
                aria-current={preferenceCategory === name ? 'page' : undefined}
                onClick={() => setPreferenceCategory(name)}
              >
                <span>{name}</span>
                {preferenceCategory === name && chevronIcon}
              </button>
            ))}
          </nav>
          <div className="la-pref-main">
            <header className="la-pref-head">
              <h1>{preferenceCategory}</h1>
              <p>
                {PREFERENCE_CATEGORIES.find(({ name }) => name === preferenceCategory)?.description}
              </p>
            </header>
            <div className="la-pref-body la-profile-preferences" aria-label="Preferences">
              <SettingsTransfer preferences={preferences} onImported={onPreferencesImported} />
              <div
                className="la-preference-content"
                id="la-preference-panel"
                aria-label={`${preferenceCategory} preferences`}
              >
                {preferenceCategory === 'Appearance' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>Theme</h2>
                      <p>Choose a light or dark look, or match the Windows setting.</p>
                    </div>
                    <div className="la-theme-options" role="radiogroup" aria-label="Theme">
                      {THEME_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`la-theme-option${preferences.theme === option.value ? ' is-selected' : ''}`}
                        >
                          <span className="la-theme-preview">
                            {option.value === 'system' ? (
                              <>
                                <ThemePreview theme="light" />
                                <ThemePreview theme="dark" />
                              </>
                            ) : (
                              <ThemePreview theme={option.value} />
                            )}
                          </span>
                          <span className="la-theme-label">
                            <input
                              type="radio"
                              name="theme"
                              checked={preferences.theme === option.value}
                              onChange={() =>
                                onPreferencesChange({ ...preferences, theme: option.value })
                              }
                            />
                            <span>
                              <strong>{option.label}</strong>
                              <small>{option.hint}</small>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Appearance' && (
                  <FontSizeSetting
                    value={preferences.fontSize}
                    onChange={(fontSize) => onPreferencesChange({ ...preferences, fontSize })}
                  />
                )}
                {preferenceCategory === 'Appearance' && (
                  <DisplaySizeSetting
                    value={preferences.displaySize}
                    onChange={(displaySize) => onPreferencesChange({ ...preferences, displaySize })}
                  />
                )}
                {preferenceCategory === 'Crawler' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>Crawler email source</h2>
                      <p>Choose how the Crawler test finds addresses on public pages.</p>
                    </div>
                    <div className="la-profile-option-list">
                      <label className="la-profile-option">
                        <span>
                          <strong>Our behavior</strong>
                          <small>Use the existing LeadsGhr page extraction and URL queue.</small>
                        </span>
                        <input
                          type="radio"
                          name="crawler-email-source"
                          checked={preferences.crawlerEmailSource === 'leadsghr'}
                          onChange={() =>
                            onPreferencesChange({ ...preferences, crawlerEmailSource: 'leadsghr' })
                          }
                        />
                      </label>
                      <label className="la-profile-option">
                        <span>
                          <strong>Email Hunter-style</strong>
                          <small>
                            Scan the complete rendered HTML, including scripts and attributes. This
                            can include placeholders and false matches; it does not access the
                            installed Chrome extension or its saved results.
                          </small>
                        </span>
                        <input
                          type="radio"
                          name="crawler-email-source"
                          checked={preferences.crawlerEmailSource === 'email-hunter'}
                          onChange={() =>
                            onPreferencesChange({
                              ...preferences,
                              crawlerEmailSource: 'email-hunter',
                            })
                          }
                        />
                      </label>
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Crawler' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>Page fetch method</h2>
                      <p>
                        Choose how Crawler and Pipeline inspect public websites. Search listings
                        still use their existing browser flow.
                      </p>
                    </div>
                    <div className="la-profile-option-list">
                      <label className="la-profile-option">
                        <span>
                          <strong>Browser rendering</strong>
                          <small>
                            Open each page in an isolated Electron browser and scroll it. Slower,
                            but can find content added by JavaScript.
                          </small>
                        </span>
                        <input
                          type="radio"
                          name="crawler-fetch-method"
                          checked={preferences.crawlerFetchMethod === 'browser'}
                          onChange={() =>
                            onPreferencesChange({ ...preferences, crawlerFetchMethod: 'browser' })
                          }
                        />
                      </label>
                      <label className="la-profile-option">
                        <span>
                          <strong>Direct HTTP</strong>
                          <small>
                            Inspect the public HTML response without loading a browser. Faster, but
                            JavaScript-added content will be missed.
                          </small>
                        </span>
                        <input
                          type="radio"
                          name="crawler-fetch-method"
                          checked={preferences.crawlerFetchMethod === 'http'}
                          onChange={() =>
                            onPreferencesChange({ ...preferences, crawlerFetchMethod: 'http' })
                          }
                        />
                      </label>
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Crawler' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>Concurrent pages</h2>
                      <p>
                        Maximum pages inspected at once in Crawler and Pipeline. Same-site requests
                        still respect robots.txt and crawl delays.
                      </p>
                    </div>
                    <div className="la-profile-option-list">
                      <label className="la-profile-option la-profile-concurrency-option">
                        <span>
                          <strong>Workers</strong>
                          <small>Choose 1 to 8 pages to process at once.</small>
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          step="1"
                          value={preferences.crawlerConcurrentPages}
                          onChange={(event) => {
                            const value = Number(event.currentTarget.value)
                            if (Number.isInteger(value) && value >= 1 && value <= 8)
                              onPreferencesChange({ ...preferences, crawlerConcurrentPages: value })
                          }}
                          aria-label="Concurrent pages"
                        />
                      </label>
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Email Validation' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>Validation checks</h2>
                      <p>
                        Choose every signal used for status and confidence. Catch-all needs SMTP;
                        SMTP needs MX; MX needs Domain.
                      </p>
                    </div>
                    <div className="la-profile-option-list">
                      {emailVerifyCheckOptions.map((option) => (
                        <label className="la-profile-option" key={option.key}>
                          <span>
                            <strong>{option.title}</strong>
                            <small>{option.detail}</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={preferences[option.key]}
                            onChange={(event) =>
                              onPreferencesChange(
                                applyEmailVerifyChecksToPreferences(preferences, {
                                  [option.key]: event.target.checked,
                                }),
                              )
                            }
                            aria-label={`Email validation ${option.title} check`}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Email Validation' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>SMTP identity</h2>
                      <p>
                        Use a routable mailbox. Addresses like verify@localhost are rejected by
                        gateways before the recipient is checked.
                      </p>
                    </div>
                    <div className="la-profile-option-list">
                      <label className="la-profile-option la-profile-text-option">
                        <span>
                          <strong>MAIL FROM</strong>
                          <small>
                            Routable mailbox for the local RCPT probe. Nothing is sent. Default
                            verify@example.com works with many gateways.
                          </small>
                        </span>
                        <input
                          type="text"
                          value={preferences.emailVerifyMailFrom}
                          maxLength={254}
                          onChange={(event) =>
                            onPreferencesChange({
                              ...preferences,
                              emailVerifyMailFrom: event.currentTarget.value,
                            })
                          }
                          aria-label="Email validation MAIL FROM"
                        />
                      </label>
                      <label className="la-profile-option la-profile-text-option">
                        <span>
                          <strong>EHLO hostname</strong>
                          <small>FQDN presented during the SMTP handshake.</small>
                        </span>
                        <input
                          type="text"
                          value={preferences.emailVerifyEhlo}
                          maxLength={255}
                          onChange={(event) =>
                            onPreferencesChange({
                              ...preferences,
                              emailVerifyEhlo: event.currentTarget.value,
                            })
                          }
                          aria-label="Email validation EHLO hostname"
                        />
                      </label>
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Email Validation' && (
                  <section className="la-profile-preference-group">
                    <div>
                      <h2>Session pacing</h2>
                      <p>
                        How many recipients share one SMTP session, and how long to wait before
                        opening another session to the same mail server.
                      </p>
                    </div>
                    <div className="la-profile-option-list">
                      <label className="la-profile-option la-profile-concurrency-option">
                        <span>
                          <strong>Recipients per session</strong>
                          <small>1 to 40. Google hosts use 3 regardless of this value.</small>
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          step="1"
                          value={preferences.emailVerifyPerSession}
                          onChange={(event) => {
                            const value = Number(event.currentTarget.value)
                            if (Number.isInteger(value) && value >= 1 && value <= 40)
                              onPreferencesChange({ ...preferences, emailVerifyPerSession: value })
                          }}
                          aria-label="Email validation recipients per session"
                        />
                      </label>
                      <label className="la-profile-option la-profile-concurrency-option">
                        <span>
                          <strong>Pace (ms)</strong>
                          <small>Base delay before a new session to the same host.</small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="5000"
                          step="50"
                          value={preferences.emailVerifyPaceMs}
                          onChange={(event) => {
                            const value = Number(event.currentTarget.value)
                            if (Number.isInteger(value) && value >= 0 && value <= 5000)
                              onPreferencesChange({ ...preferences, emailVerifyPaceMs: value })
                          }}
                          aria-label="Email validation pace milliseconds"
                        />
                      </label>
                    </div>
                  </section>
                )}
                {preferenceCategory === 'Updates' && <UpdatesPanel state={updateState} />}
                {groups
                  .filter((group) => groupCategory(group.title) === preferenceCategory)
                  .map((group) => (
                    <section className="la-profile-preference-group" key={group.title}>
                      <div>
                        <h2>{group.title}</h2>
                        <p>{group.description}</p>
                      </div>
                      <div className="la-profile-option-list">
                        {group.options.map((option) => (
                          <label className="la-profile-option" key={option.key}>
                            <span>
                              <strong>{option.title}</strong>
                              <small>{option.detail}</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={preferences[option.key]}
                              onChange={(event) =>
                                onPreferencesChange({
                                  ...preferences,
                                  [option.key]: event.target.checked,
                                })
                              }
                              aria-label={option.title}
                            />
                          </label>
                        ))}
                      </div>
                    </section>
                  ))}
                {preferenceCategory === 'Search' && (
                  <SearchTimingSettings preferences={preferences} onChange={onPreferencesChange} />
                )}
                <p className="la-profile-note">Preference settings are saved on this computer.</p>
                <p className="la-profile-save-status" role="status">
                  {saveMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
