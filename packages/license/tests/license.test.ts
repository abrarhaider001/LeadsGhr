import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activateLicense,
  applyMaskedKeyEdit,
  checkStoredLicense,
  localLicenseView,
  maskKeyForDisplay,
  maskLicenseKey,
  normalizeLicenseKey,
  isLocalMode,
  modeFromEnvFile,
  type LicenseResponse,
  type StoredLicense,
} from '../src/index.ts'

const KEY = 'Kp7#vQ2m!Xe9$Rt4&Wz8*Hn3?Bc6@Jd5'
const OLD_KEY = '9f3a0c2b7d41e85f6a1b3c9d0e2f4a6b8c1d3e5f7a9b0c2d4e6f8a1b3c5d7e9f'
const answer = (body: LicenseResponse, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
const offline = (async () => {
  throw new TypeError('fetch failed')
}) as unknown as typeof fetch
const stored = (lastCheckedAt: string, expiresAt = '2099-01-01T00:00:00Z'): StoredLicense => ({
  key: KEY,
  expiresAt,
  keyEnd: KEY.slice(-8),
  products: { desktop: 'used' },
  activatedAt: '2026-11-20T00:00:00Z',
  lastCheckedAt,
})

test('32-character keys with special characters are read from pasted text', () => {
  assert.equal(normalizeLicenseKey(KEY), KEY)
  assert.equal(normalizeLicenseKey(` ${KEY.slice(0, 16)}\n${KEY.slice(16)} `), KEY)
  assert.equal(normalizeLicenseKey(KEY.toLowerCase()), KEY.toLowerCase()) // case is kept: keys are case-sensitive
  assert.equal(normalizeLicenseKey(KEY.slice(0, 31)), null)
  assert.equal(normalizeLicenseKey(`${KEY.slice(0, 31)}'`), null) // quote is not in the alphabet
  assert.equal(normalizeLicenseKey(`${KEY.slice(0, 31)}O`), null) // look-alike letters are left out
  assert.equal(normalizeLicenseKey(OLD_KEY.toUpperCase()), OLD_KEY) // older 64-character keys still work
  assert.equal(maskLicenseKey(KEY.slice(-8)), '•'.repeat(24) + KEY.slice(-8)) // same length as the key
  assert.equal(maskLicenseKey(OLD_KEY.slice(-8), 64).length, 64)
})

test('activation stores the license only when the service says active', async () => {
  const ok = await activateLicense(
    ` ${KEY} `,
    'desktop',
    'install-1',
    answer({
      status: 'active',
      expiresAt: '2099-01-01T00:00:00Z',
      keyEnd: KEY.slice(-8),
      products: { desktop: 'used', mailer: 'available' },
    }),
  )
  assert.equal(ok.view.state, 'active')
  assert.equal(ok.stored?.key, KEY)
  const used = await activateLicense(KEY, 'mailer', 'install-2', answer({ status: 'used' }))
  assert.equal(used.stored, null)
  assert.equal(used.view.state === 'locked' && used.view.reason, 'used')
  const bad = await activateLicense(
    'not-a-key',
    'desktop',
    'install-1',
    answer({ status: 'active' }),
  )
  assert.equal(bad.view.state === 'locked' && bad.view.reason, 'invalid')
})

test('start-up check removes expired keys and allows 7 offline days', async () => {
  const expired = await checkStoredLicense(
    stored(new Date().toISOString()),
    'desktop',
    'install-1',
    answer({ status: 'expired', expiresAt: '2026-11-18T00:00:00Z' }),
  )
  assert.equal(expired.stored, null)
  assert.equal(expired.view.state === 'locked' && expired.view.reason, 'expired')
  const recent = await checkStoredLicense(
    stored(new Date(Date.now() - 2 * 86400000).toISOString()),
    'desktop',
    'install-1',
    offline,
  )
  assert.equal(recent.view.state === 'active' && recent.view.offline, true)
  const old = await checkStoredLicense(
    stored(new Date(Date.now() - 8 * 86400000).toISOString()),
    'desktop',
    'install-1',
    offline,
  )
  assert.equal(old.view.state === 'locked' && old.view.reason, 'offline')
  const missing = await checkStoredLicense(null, 'tracker', 'install-1', offline)
  assert.equal(missing.view.state === 'locked' && missing.view.reason, 'missing')
})

test('the key field shows only the character just typed', () => {
  let key = ''
  let reveal = -1
  const type = (shownAfter: (shown: string) => string) => {
    const shown = maskKeyForDisplay(key, reveal)
    ;({ key, reveal } = applyMaskedKeyEdit(key, shown, shownAfter(shown)))
  }
  type((shown) => shown + 'a')
  type((shown) => shown + 'b')
  assert.equal(key, 'ab')
  assert.equal(maskKeyForDisplay(key, reveal), '•b')
  reveal = -1 // one second later
  type((shown) => shown.slice(0, 1) + 'X' + shown.slice(1)) // typed in the middle
  assert.equal(key, 'aXb')
  assert.equal(maskKeyForDisplay(key, reveal), '•X•')
  type((shown) => shown.slice(0, 2)) // Backspace at the end
  assert.equal(key, 'aX')
  assert.equal(reveal, -1)
  type(() => KEY) // select all, then paste
  assert.equal(key, KEY)
  assert.equal(maskKeyForDisplay(key, reveal), '•'.repeat(32))
  assert.equal(normalizeLicenseKey(key), KEY)
})

test('only LEADSGHR_MODE=local turns license keys off; everything else is production', () => {
  for (const value of ['local', 'LOCAL', ' local ']) assert.equal(isLocalMode(value), true, value)
  for (const value of [undefined, null, '', 'production', 'prod', 'true', 'locall', 'dev'])
    assert.equal(isLocalMode(value), false, String(value))
})

test('the mode is read from a .env file line', () => {
  assert.equal(modeFromEnvFile('A=1\nLEADSGHR_MODE=local\nB=2'), 'local')
  assert.equal(modeFromEnvFile('LEADSGHR_MODE = "local"  # dev only'), 'local')
  assert.equal(modeFromEnvFile("LEADSGHR_MODE='production'"), 'production')
  assert.equal(modeFromEnvFile('# LEADSGHR_MODE=local\nOTHER=1'), undefined)
  assert.equal(modeFromEnvFile('LEADSGHR_LOCAL_MODE=true'), undefined)
})

test('the local mode view is active and never expires', () => {
  const view = localLicenseView(new Date('2026-11-24T00:00:00Z'))
  assert.equal(view.state, 'active')
  assert.ok(view.state === 'active' && view.local && new Date(view.expiresAt).getFullYear() === 9999)
})

