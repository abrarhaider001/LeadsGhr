import assert from 'node:assert/strict'
import { crawlRowsToCsv } from '../../packages/export/src/index'
import type { CrawlRow } from '../../packages/schemas/src/index'

const row: CrawlRow = {
  id: 'one',
  niche: 'General Contractors',
  name: 'Example Builders',
  website: 'https://example.org',
  phone: '',
  location: 'Austin, TX',
  address: '',
  mapsUrl: '',
  source: 'Maps + website',
  emails: ['hello@example.org', 'sales@example.org'],
  emailsScanned: true,
}
const csv = new TextDecoder().decode(
  crawlRowsToCsv([row], '2026-11-01T12:30:00.000Z', ['General Contractors']),
)
assert.match(csv, /"Emails"/)
assert.match(csv, /"hello@example.org; sales@example.org"/)
assert.match(csv, /"Maps \+ website"/)
console.log('Pipeline CSV includes crawled emails and source.')
