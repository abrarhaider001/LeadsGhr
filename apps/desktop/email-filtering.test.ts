import assert from 'node:assert/strict'
import {
  collectEmailInputs,
  detectEmailColumns,
  filterEmails,
  parseCsv,
} from '../../packages/app/src/email-filtering-data'

const sample = [
  'abrarhaider157@gmail.com',
  '0668945emailabrarhaider157@gmail.comfirst',
  '0668945abrarhaider157@gmail.comgithub',
  'AbrarHaider157@GMAIL.COM',
  'example@example.com',
  'person@mailinator.com',
]
const result = filterEmails(sample.map((value) => ({ value, source: 'test' })))
assert.deepEqual(
  result.kept.map((item) => item.email),
  ['abrarhaider157@gmail.com'],
)
assert.equal(result.duplicates, 1)
assert.equal(result.rejected.length, 5)
assert.equal(
  result.rejected.filter((item) => item.reason === 'Extra text attached to a mail domain').length,
  2,
)

const table = {
  sheet: 'Contacts',
  rows: parseCsv(
    'Company,Email,Notes\n"Acme, Inc.",hello@acme.com,"call, later"\nOther,second@example.org,none',
  ),
}
assert.equal(table.rows[1][0], 'Acme, Inc.')
const columns = detectEmailColumns([table])
assert.deepEqual(
  columns.map((column) => column.index),
  [1],
)
assert.deepEqual(
  collectEmailInputs('', [table], new Set(['0:1'])).map((item) => item.value),
  ['hello@acme.com', 'second@example.org'],
)
const semicolon = parseCsv('\uFEFFEmail;Notes\r\nhello@acme.com;"call, later"')
assert.equal(semicolon[0][0], 'Email')
assert.equal(semicolon[1][0], 'hello@acme.com')
assert.equal(semicolon[1][1], 'call, later')
const aliases = filterEmails(
  ['first.last+sales@gmail.com', 'firstlast@gmail.com'].map((value) => ({ value, source: 'test' })),
)
assert.equal(aliases.kept.length, 1)
assert.equal(aliases.duplicates, 1)
console.log('Email filtering checks passed')
