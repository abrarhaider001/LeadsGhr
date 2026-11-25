import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyPreferencesFile,
  buildPreferencesFile,
  clampSearchTiming,
  matchingSearchSpeed,
  SEARCH_TIMING_PRESETS,
  searchTimingFrom,
  searchTimingPreferences,
  defaultDesktopPreferences,
  desktopPreferencesSchema,
  EXPORTABLE_PREFERENCE_KEYS,
  PREFERENCES_FILE_VERSION,
} from '../src/index.ts'

const current = { ...defaultDesktopPreferences }
const someKey = 'crawlerEmailSource' as const

test('export file carries every preference and the file version', () => {
  const file = buildPreferencesFile(current, '0.1.5')
  assert.equal(file.kind, 'preferences')
  assert.equal(file.version, PREFERENCES_FILE_VERSION)
  assert.equal(file.appVersion, '0.1.5')
  const { scanPublicWebsites: _alwaysOff, ...exportable } = current
  assert.deepEqual(file.preferences, exportable)
})

test('every preference is offered in Choose what to export exactly once', () => {
  const schemaKeys = Object.keys(desktopPreferencesSchema.shape)
    .filter((key) => key !== 'scanPublicWebsites')
    .sort()
  assert.deepEqual([...EXPORTABLE_PREFERENCE_KEYS].sort(), schemaKeys)
  assert.equal(new Set(EXPORTABLE_PREFERENCE_KEYS).size, EXPORTABLE_PREFERENCE_KEYS.length)
})

test('export writes only the chosen preferences', () => {
  const file = buildPreferencesFile(current, undefined, [
    'crawlerFetchMethod',
    'crawlerConcurrentPages',
    'notAPreference',
  ])
  assert.deepEqual(Object.keys(file.preferences).sort(), [
    'crawlerConcurrentPages',
    'crawlerFetchMethod',
  ])
  assert.throws(() => buildPreferencesFile(current, undefined, []), /at least one setting/)
})

test('round trip: importing an export restores the same preferences', () => {
  const exported = buildPreferencesFile({ ...current, crawlerEmailSource: 'email-hunter' })
  const result = applyPreferencesFile(JSON.parse(JSON.stringify(exported)), current)
  assert.equal(result.preferences.crawlerEmailSource, 'email-hunter')
  assert.equal(result.skipped.length, 0)
  assert.equal(result.ignored.length, 0)
})

test('older file (fewer preferences): only the preferences it contains change', () => {
  const changed = { ...current, crawlerEmailSource: 'leadsghr' as const }
  const result = applyPreferencesFile(
    { kind: 'preferences', version: 1, preferences: { [someKey]: 'email-hunter' } },
    changed,
  )
  assert.deepEqual(result.applied, [someKey])
  assert.equal(result.preferences.crawlerEmailSource, 'email-hunter')
  for (const key of Object.keys(current) as (keyof typeof current)[]) {
    if (key !== someKey)
      assert.deepEqual(result.preferences[key], changed[key], `${key} must keep its current value`)
  }
})

test('newer file (unknown preferences): unknown entries are ignored, known ones applied', () => {
  const result = applyPreferencesFile(
    { preferences: { [someKey]: 'email-hunter', someFuturePreference: true } },
    current,
  )
  assert.deepEqual(result.ignored, ['someFuturePreference'])
  assert.equal(result.preferences.crawlerEmailSource, 'email-hunter')
  assert.equal('someFuturePreference' in result.preferences, false)
})

test('a value this version does not accept is skipped, the rest still imports', () => {
  const result = applyPreferencesFile(
    {
      preferences: {
        [someKey]: 'a-removed-option',
        showCrawlerPreview: !current.showCrawlerPreview,
      },
    },
    current,
  )
  assert.deepEqual(result.skipped, [someKey])
  assert.equal(result.preferences.crawlerEmailSource, current.crawlerEmailSource)
  assert.equal(result.preferences.showCrawlerPreview, !current.showCrawlerPreview)
})

test('a bare preferences object (no wrapper) is accepted', () => {
  const result = applyPreferencesFile({ [someKey]: 'email-hunter' }, current)
  assert.equal(result.preferences.crawlerEmailSource, 'email-hunter')
})

test('files without usable LeadsGhr preferences are rejected', () => {
  assert.throws(() => applyPreferencesFile([1, 2], current), /does not contain LeadsGhr settings/)
  assert.throws(
    () => applyPreferencesFile({ hello: 'world' }, current),
    /can be used by this version/,
  )
  assert.throws(
    () => applyPreferencesFile({ preferences: {} }, current),
    /does not contain LeadsGhr settings/,
  )
})

test('search timing settings export and import, and out-of-range values are skipped', () => {
  const careful = {
    ...current,
    ...searchTimingPreferences(SEARCH_TIMING_PRESETS.careful),
    searchSpeed: 'careful' as const,
  }
  const file = JSON.parse(JSON.stringify(buildPreferencesFile(careful, '0.1.0')))
  for (const key of [
    'searchSpeed',
    'searchScrollPauseSec',
    'searchPagePauseMinSec',
    'searchPagePauseMaxSec',
    'searchLocationPauseSec',
    'searchBreakEvery',
    'searchBreakMinutes',
  ])
    assert.ok(key in file.preferences, key)
  const imported = applyPreferencesFile(file, defaultDesktopPreferences).preferences
  assert.equal(imported.searchSpeed, 'careful')
  assert.deepEqual(searchTimingFrom(imported), SEARCH_TIMING_PRESETS.careful)
  // Faster than the allowed minimum is not imported; the current value stays.
  const tooFast = applyPreferencesFile(
    { preferences: { searchLocationPauseSec: 5, searchScrollPauseSec: 2 } },
    defaultDesktopPreferences,
  )
  assert.deepEqual(tooFast.skipped, ['searchLocationPauseSec'])
  assert.equal(tooFast.preferences.searchLocationPauseSec, 45)
  assert.equal(tooFast.preferences.searchScrollPauseSec, 2)
})

test('search timing presets are recognised and kept inside the limits', () => {
  assert.equal(matchingSearchSpeed(SEARCH_TIMING_PRESETS.normal), 'normal')
  assert.equal(matchingSearchSpeed({ ...SEARCH_TIMING_PRESETS.normal, locationPauseSec: 50 }), 'custom')
  assert.deepEqual(searchTimingFrom(defaultDesktopPreferences), SEARCH_TIMING_PRESETS.normal)
  const clamped = clampSearchTiming({
    ...SEARCH_TIMING_PRESETS.faster,
    locationPauseSec: 1,
    pagePauseMinSec: 20,
    pagePauseMaxSec: 10,
  })
  assert.equal(clamped.locationPauseSec, 30)
  assert.equal(clamped.pagePauseMaxSec, 20)
})
