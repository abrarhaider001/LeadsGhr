import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  SCRAPER_FORMAT_VERSION,
  scraperJobSchema,
  scraperPlacesUrl,
  scraperProgressSchema,
  scraperResultFile,
  scraperResultSchema,
  scraperJobTitle,
  visibleScraperJobs,
} from '../src/index'

const job = {
  version: SCRAPER_FORMAT_VERSION,
  id: '6f1d2c4e-1111-4a2b-9c3d-123456789abc',
  runId: '7a2b3c4d-2222-4b3c-8d4e-abcdef123456',
  createdAt: '2026-11-24T10:00:00.000Z',
  niches: ['General Contractors'],
  states: ['Florida'],
  searches: [
    { index: 0, niche: 'General Contractors', term: 'General Contractors', place: 'Acacia Villas CDP, Florida', query: 'General Contractors in Acacia Villas CDP, Florida' },
  ],
}

test('a job written by the desktop app is read back by the same schema', () => {
  assert.deepEqual(scraperJobSchema.parse(JSON.parse(JSON.stringify(job))), job)
  assert.equal(scraperJobSchema.safeParse({ ...job, searches: [] }).success, false)
  assert.equal(scraperJobSchema.safeParse({ ...job, version: 2 }).success, false)
})

test('a result file is valid while incomplete and after it is finished', () => {
  const result = {
    version: SCRAPER_FORMAT_VERSION,
    jobId: job.id,
    index: 0,
    place: 'Acacia Villas CDP, Florida',
    query: job.searches[0].query,
    complete: false,
    pages: 1,
    updatedAt: '2026-11-24T10:01:00.000Z',
    businesses: [{ name: 'Carrigan Construction', websiteLink: 'https://www.google.com/goto?url=abc', phone: '(352) 672-1606', address: '', page: 1 }],
  }
  assert.ok(scraperResultSchema.safeParse(result).success)
  assert.ok(scraperResultSchema.safeParse({ ...result, complete: true, stoppedReason: 'Google showed its check page' }).success)
})

test('progress states cover running, waiting, and stopping by Google', () => {
  for (const state of ['running', 'waiting', 'paused', 'stopped', 'blocked', 'finished'])
    assert.ok(scraperProgressSchema.safeParse({ version: 1, jobId: job.id, state, current: 0, total: 1, message: '', updatedAt: job.createdAt }).success, state)
})

test('places address and result file names', () => {
  assert.equal(
    scraperPlacesUrl('General Contractors in Alachua city, Florida'),
    'https://www.google.com/search?q=General%20Contractors%20in%20Alachua%20city%2C%20Florida&udm=local&hl=en',
  )
  assert.equal(scraperResultFile(0), '0000.json')
  assert.equal(scraperResultFile(12), '0012.json')
})

test('the job list shows saved jobs newest first, adds an older job.json, and hides removed jobs', () => {
  const older = { ...job, id: '11111111-aaaa-4aaa-8aaa-111111111111', createdAt: '2026-11-20T10:00:00.000Z' }
  const newer = { ...job, id: '22222222-bbbb-4bbb-8bbb-222222222222', createdAt: '2026-11-25T10:00:00.000Z' }
  const list = { version: SCRAPER_FORMAT_VERSION, jobs: [older, newer] }
  assert.deepEqual(visibleScraperJobs(list, job, null).map((item) => item.id), [newer.id, job.id, older.id])
  // A job.json already in the list is not shown twice.
  assert.equal(visibleScraperJobs(list, newer, null).length, 2)
  // Removed jobs are hidden; missing or broken files count as empty.
  const removed = { version: SCRAPER_FORMAT_VERSION, ids: [newer.id] }
  assert.deepEqual(visibleScraperJobs(list, null, removed).map((item) => item.id), [older.id])
  assert.deepEqual(visibleScraperJobs(null, 'broken', { ids: 'x' }), [])
})

test('a job title names the niche, state, and number of locations', () => {
  assert.equal(scraperJobTitle(job), 'General Contractors · Florida · 1 location')
  const many = { ...job, niches: ['A', 'B', 'C'], states: ['Florida', 'Texas'], searches: [...job.searches, { ...job.searches[0], index: 1 }] }
  assert.equal(scraperJobTitle(many), 'A, B +1 · Florida, Texas · 2 locations')
})
