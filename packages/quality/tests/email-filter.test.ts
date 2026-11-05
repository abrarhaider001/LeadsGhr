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
  assert.deepEqual(result.kept.map((item) => item.email), ['sales@company.com', 'info@company.com'])
  assert.equal(result.rejected.length, 5)
  assert.equal(result.duplicates, 1)
})
