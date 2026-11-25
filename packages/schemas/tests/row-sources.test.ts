import assert from 'node:assert/strict'
import { test } from 'node:test'
import { combineSources, CRAWL_ROW_SOURCES, crawlRowSchema, withWebsiteSource } from '../src/index'

test('a checked website adds "website" and keeps where the listing came from', () => {
  assert.equal(withWebsiteSource('Maps'), 'Maps + website')
  assert.equal(withWebsiteSource('Google Search'), 'Google Search + website')
  assert.equal(withWebsiteSource('Maps + Google Search'), 'Maps + Google Search + website')
  assert.equal(withWebsiteSource('Maps + website'), 'Maps + website')
  assert.equal(withWebsiteSource('Website'), 'Website')
})

test('a business found in both sources keeps both, in a fixed order', () => {
  assert.equal(combineSources('Maps', 'Google Search'), 'Maps + Google Search')
  assert.equal(combineSources('Google Search', 'Maps'), 'Maps + Google Search')
  assert.equal(combineSources('Maps + website', 'Google Search'), 'Maps + Google Search + website')
  assert.equal(combineSources('Google Search + website', 'Maps'), 'Maps + Google Search + website')
})

test('every combination is an allowed row source', () => {
  for (const a of CRAWL_ROW_SOURCES)
    for (const b of CRAWL_ROW_SOURCES) {
      assert.ok(CRAWL_ROW_SOURCES.includes(combineSources(a, b)), `${a} + ${b}`)
      assert.ok(CRAWL_ROW_SOURCES.includes(withWebsiteSource(combineSources(a, b))))
    }
})

test('rows saved by older versions still read', () => {
  const row = { id: 'x', name: 'A', website: '', phone: '', location: '', address: '', mapsUrl: '', emails: [], emailsScanned: false }
  for (const source of ['Maps', 'Website', 'Maps + website']) assert.ok(crawlRowSchema.safeParse({ ...row, source }).success)
})
