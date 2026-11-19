import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activateLicense, checkStoredLicense, normalizeLicenseKey, type LicenseResponse, type StoredLicense } from '../src/index.ts'

const answer = (body: LicenseResponse, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
const offline = (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch
const stored = (lastCheckedAt: string, expiresAt = '2099-01-01T00:00:00Z'): StoredLicense => ({ key: 'LGHR-7F3K-9QX2-M4TP', expiresAt, last4: 'M4TP', products: { desktop: 'used' }, activatedAt: '2026-11-20T00:00:00Z', lastCheckedAt })

test('license keys are normalized from any typing', () => {
  assert.equal(normalizeLicenseKey('lghr-7f3k-9qx2-m4tp'), 'LGHR-7F3K-9QX2-M4TP')
  assert.equal(normalizeLicenseKey(' LGHR 7F3K 9QX2 M4TP '), 'LGHR-7F3K-9QX2-M4TP')
  assert.equal(normalizeLicenseKey('7F3K9QX2M4TP'), 'LGHR-7F3K-9QX2-M4TP')
  assert.equal(normalizeLicenseKey('LGHR-7F3K'), null)
})

test('activation stores the license only when the service says active', async () => {
  const ok = await activateLicense('lghr7f3k9qx2m4tp', 'desktop', 'install-1', answer({ status: 'active', expiresAt: '2099-01-01T00:00:00Z', last4: 'M4TP', products: { desktop: 'used', mailer: 'available' } }))
  assert.equal(ok.view.state, 'active')
  assert.equal(ok.stored?.key, 'LGHR-7F3K-9QX2-M4TP')
  const used = await activateLicense('LGHR-7F3K-9QX2-M4TP', 'mailer', 'install-2', answer({ status: 'used' }))
  assert.equal(used.stored, null)
  assert.equal(used.view.state === 'locked' && used.view.reason, 'used')
  const bad = await activateLicense('nope', 'desktop', 'install-1', answer({ status: 'active' }))
  assert.equal(bad.view.state === 'locked' && bad.view.reason, 'invalid')
})

test('start-up check removes expired keys and allows 7 offline days', async () => {
  const expired = await checkStoredLicense(stored(new Date().toISOString()), 'desktop', 'install-1', answer({ status: 'expired', expiresAt: '2026-11-18T00:00:00Z' }))
  assert.equal(expired.stored, null)
  assert.equal(expired.view.state === 'locked' && expired.view.reason, 'expired')
  const recent = await checkStoredLicense(stored(new Date(Date.now() - 2 * 86400000).toISOString()), 'desktop', 'install-1', offline)
  assert.equal(recent.view.state === 'active' && recent.view.offline, true)
  const old = await checkStoredLicense(stored(new Date(Date.now() - 8 * 86400000).toISOString()), 'desktop', 'install-1', offline)
  assert.equal(old.view.state === 'locked' && old.view.reason, 'offline')
  const missing = await checkStoredLicense(null, 'tracker', 'install-1', offline)
  assert.equal(missing.view.state === 'locked' && missing.view.reason, 'missing')
})
