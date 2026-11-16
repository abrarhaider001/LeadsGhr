import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyPreferencesFile, buildPreferencesFile, defaultDesktopPreferences, PREFERENCES_FILE_VERSION } from '../src/index.ts'

const current = { ...defaultDesktopPreferences }
const someKey = 'crawlerEmailSource' as const

test('export file carries every preference and the file version', () => {
  const file = buildPreferencesFile(current, '0.1.5')
  assert.equal(file.kind, 'preferences')
  assert.equal(file.version, PREFERENCES_FILE_VERSION)
  assert.equal(file.appVersion, '0.1.5')
  assert.deepEqual(file.preferences, current)
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
  const result = applyPreferencesFile({ kind: 'preferences', version: 1, preferences: { [someKey]: 'email-hunter' } }, changed)
  assert.deepEqual(result.applied, [someKey])
  assert.equal(result.preferences.crawlerEmailSource, 'email-hunter')
  for (const key of Object.keys(current) as (keyof typeof current)[]) {
    if (key !== someKey) assert.deepEqual(result.preferences[key], changed[key], `${key} must keep its current value`)
  }
})

test('newer file (unknown preferences): unknown entries are ignored, known ones applied', () => {
  const result = applyPreferencesFile({ preferences: { [someKey]: 'email-hunter', someFuturePreference: true } }, current)
  assert.deepEqual(result.ignored, ['someFuturePreference'])
  assert.equal(result.preferences.crawlerEmailSource, 'email-hunter')
  assert.equal('someFuturePreference' in result.preferences, false)
})

test('a value this version does not accept is skipped, the rest still imports', () => {
  const result = applyPreferencesFile({ preferences: { [someKey]: 'a-removed-option', showCrawlerPreview: !current.showCrawlerPreview } }, current)
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
  assert.throws(() => applyPreferencesFile({ hello: 'world' }, current), /can be used by this version/)
  assert.throws(() => applyPreferencesFile({ preferences: {} }, current), /does not contain LeadsGhr settings/)
})
