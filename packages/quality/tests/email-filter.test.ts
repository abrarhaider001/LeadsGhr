import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterEmails } from '../src/email-filter.ts'

test('pipeline filtering keeps valid addresses and removes junk before export', () => {
  const result = filterEmails([
    { value: 'Sales@Company.com', source: 'company' },
    { value: 'sales@company.com', source: 'company' },
    { value: 'yourname@example.com', source: 'company' },
    { value: 'no-reply@company.com', source: 'company' },
    { value: 'staff@mailinator.com', source: 'company' },
    { value: 'bad@@company.com', source: 'company' },
    { value: 'info@company.com', source: 'company' },
  ])
  assert.deepEqual(
    result.kept.map((item) => item.email),
    ['sales@company.com', 'info@company.com'],
  )
  assert.equal(result.rejected.length, 5)
  assert.equal(result.duplicates, 1)
})

test('error-reporting keys and placeholder addresses never reach the export', () => {
  const result = filterEmails([
    { value: '605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com', source: 'wix site' },
    { value: '8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com', source: 'wix site' },
    { value: 'abc123@o12345.ingest.sentry.io', source: 'site' },
    { value: 'you@email.com', source: 'template' },
    { value: 'john.doe@company.com', source: 'template' },
    { value: 'office@realbuilder.com', source: 'site' },
  ])
  assert.deepEqual(
    result.kept.map((item) => item.email),
    ['office@realbuilder.com'],
  )
  assert.equal(
    result.rejected.filter(
      (item) => item.reason === 'Error-reporting or tracking key, not a mailbox',
    ).length,
    3,
  )
  assert.equal(result.rejected.filter((item) => item.reason === 'Placeholder address').length, 2)
})
