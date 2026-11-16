import { desktopPreferencesSchema, type DesktopPreferences } from './index'

/*
 * The JSON file used by Settings → Preferences → Export settings / Import settings.
 *
 * Keep this in step with `desktopPreferencesSchema` (see AGENTS.md, "Preferences file"):
 * - Adding a preference needs nothing here: export includes it, import applies it when present.
 * - Renaming a preference: add `oldName: 'newName'` to PREFERENCE_RENAMES so older files still import.
 * - Removing a preference: older files that contain it are ignored for that key automatically.
 * - Changing a preference's allowed values: older values are skipped for that key; add a conversion in
 *   PREFERENCE_VALUE_UPGRADES when an old value has a clear new equivalent.
 * - Bump PREFERENCES_FILE_VERSION whenever the file structure (not just the list of preferences) changes.
 */
export const PREFERENCES_FILE_VERSION = 1

/** Old preference names → current names, so settings exported by older versions still import. */
export const PREFERENCE_RENAMES: Readonly<Record<string, keyof DesktopPreferences>> = {}

/** Converts an old value of a preference to its current form; return undefined to skip it. */
export const PREFERENCE_VALUE_UPGRADES: Readonly<Partial<Record<keyof DesktopPreferences, (value: unknown) => unknown>>> = {}

/**
 * Preferences offered in "Choose what to export", grouped like Settings → Preferences.
 * Every preference except `scanPublicWebsites` (always off) must appear exactly once; the test checks this.
 */
export const PREFERENCE_SECTIONS: readonly { id: 'crawler' | 'search' | 'email-validation'; title: string; settings: readonly { key: keyof DesktopPreferences; label: string }[] }[] = [
  { id: 'crawler', title: 'Crawler', settings: [
    { key: 'crawlerEmailSource', label: 'Crawler email source' },
    { key: 'crawlerFetchMethod', label: 'Page fetch method' },
    { key: 'crawlerConcurrentPages', label: 'Concurrent pages' },
    { key: 'showCrawlerPreview', label: 'Show webpage in Crawler' },
    { key: 'crawlerContactOnly', label: 'Crawl homepage and contact page only' },
  ] },
  { id: 'search', title: 'Search', settings: [
    { key: 'showChromeDuringSearch', label: 'Show Chrome while searching' },
    { key: 'searchGoogleMaps', label: 'Show Google Maps listings' },
    { key: 'useNicheKeywords', label: 'Use Niche Library search terms' },
    { key: 'showListingsWithoutWebsite', label: 'Show businesses without a website' },
    { key: 'includeCompanyName', label: 'Result field: Company name' },
    { key: 'includeWebsite', label: 'Result field: Website URL' },
    { key: 'includePhone', label: 'Result field: Phone number' },
    { key: 'includeAddress', label: 'Result field: Street address' },
    { key: 'includeLocation', label: 'Result field: Searched location' },
  ] },
  { id: 'email-validation', title: 'Email Validation', settings: [
    { key: 'emailVerifyMailFrom', label: 'SMTP mail-from address' },
    { key: 'emailVerifyEhlo', label: 'SMTP EHLO name' },
    { key: 'emailVerifyPerSession', label: 'Recipients per SMTP session' },
    { key: 'emailVerifyPaceMs', label: 'Wait between recipients' },
  ] },
]

/** Preferences that can be exported (all except those that never leave this computer's defaults). */
export const EXPORTABLE_PREFERENCE_KEYS: readonly (keyof DesktopPreferences)[] = PREFERENCE_SECTIONS.flatMap((section) => section.settings.map((setting) => setting.key))

export type PreferencesFile = {
  app: 'LeadsGhr'
  kind: 'preferences'
  version: number
  appVersion?: string
  exportedAt: string
  preferences: Partial<DesktopPreferences>
}

export type PreferencesImport = {
  preferences: DesktopPreferences
  /** Preferences taken from the file. */
  applied: string[]
  /** Preferences in the file that this version knows but whose value it cannot use (kept as before). */
  skipped: string[]
  /** Entries in the file this version does not have (for example from a newer version); ignored. */
  ignored: string[]
}

/**
 * Builds the export file. With `keys`, only those preferences are written (the sender's choice in
 * "Choose what to export"); without it, every exportable preference is written.
 */
export function buildPreferencesFile(preferences: DesktopPreferences, appVersion?: string, keys: readonly string[] = EXPORTABLE_PREFERENCE_KEYS): PreferencesFile {
  const chosen = keys.filter((key): key is keyof DesktopPreferences => (EXPORTABLE_PREFERENCE_KEYS as readonly string[]).includes(key))
  if (!chosen.length) throw new Error('Choose at least one setting to export.')
  const picked: Partial<Record<keyof DesktopPreferences, unknown>> = {}
  for (const key of chosen) picked[key] = preferences[key]
  return { app: 'LeadsGhr', kind: 'preferences', version: PREFERENCES_FILE_VERSION, appVersion, exportedAt: new Date().toISOString(), preferences: picked as Partial<DesktopPreferences> }
}

/**
 * Applies an imported settings file on top of the current preferences, one preference at a time:
 * every preference the file contains and this version accepts is updated; everything else keeps its
 * current value. Files from older or newer versions therefore import as far as both versions agree.
 */
export function applyPreferencesFile(file: unknown, current: DesktopPreferences): PreferencesImport {
  // Accept an exported file ({ kind: 'preferences', preferences }) or a bare preferences object.
  const body = file && typeof file === 'object' && !Array.isArray(file) && 'preferences' in file ? (file as { preferences: unknown }).preferences : file
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('That file does not contain LeadsGhr settings.')
  const shape = desktopPreferencesSchema.shape as Record<string, { safeParse(value: unknown): { success: boolean; data?: unknown } }>
  const next: Record<string, unknown> = { ...current }
  const applied: string[] = []
  const skipped: string[] = []
  const ignored: string[] = []
  for (const [rawKey, rawValue] of Object.entries(body as Record<string, unknown>)) {
    const key = (PREFERENCE_RENAMES[rawKey] ?? rawKey) as keyof DesktopPreferences
    const field = shape[key]
    if (!field) { ignored.push(rawKey); continue }
    const upgrade = PREFERENCE_VALUE_UPGRADES[key]
    const value = upgrade ? upgrade(rawValue) : rawValue
    const checked = value === undefined ? { success: false } : field.safeParse(value)
    if (checked.success) { next[key] = checked.data; applied.push(key) } else skipped.push(key)
  }
  if (!applied.length) throw new Error(ignored.length || skipped.length ? 'None of the settings in that file can be used by this version of LeadsGhr.' : 'That file does not contain LeadsGhr settings.')
  // Final check of the combined preferences (also covers rules that span several preferences).
  const combined = desktopPreferencesSchema.safeParse(next)
  if (!combined.success) throw new Error('Some settings in that file conflict with each other, so nothing was imported.')
  return { preferences: combined.data, applied, skipped, ignored }
}
