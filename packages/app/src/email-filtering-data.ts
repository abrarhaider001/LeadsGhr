export type ImportTable = { sheet: string; rows: string[][] }
export type EmailColumn = { key: string; sheet: string; index: number; label: string; matches: number; selected: boolean }
export type FilteredEmail = { email: string; source: string; reason: string }
export type RejectedEmail = { value: string; reason: string; source: string }
export type FilterResult = { kept: FilteredEmail[]; rejected: RejectedEmail[]; duplicates: number; total: number }

const EMAIL_COLUMN = /(?:^|[\s_-])(?:e-?mails?(?:\s*address)?|contact\s*email|mail)(?:$|[\s_-])/i
const EMAIL_TOKEN = /[^\s,;<>()[\]"']+@[^\s,;<>()[\]"']+/g
const STRICT_EMAIL = /^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i
const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com'])
const PLACEHOLDER_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'test.com', 'test.org', 'invalid', 'localhost', 'domain.com', 'yourdomain.com'])
const PLACEHOLDER_LOCAL = /^(?:test|testing|example|sample|name|yourname|username|user|email|someone|abc|xxx|foo|bar)(?:\d+)?$/i
const NO_REPLY = /^(?:no[._-]?reply|do[._-]?not[._-]?reply)$/i
const COMMON_TLDS = new Set(['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'io', 'co', 'biz', 'info', 'us', 'uk', 'pk', 'ca', 'au', 'in', 'de', 'fr', 'nl', 'it', 'es', 'me', 'ai', 'app', 'dev', 'tech', 'store', 'site', 'online', 'agency', 'company', 'email', 'mail'])

export function parseCsv(text: string): string[][] {
  const content = text.replace(/^\uFEFF/, '')
  const first = content.split(/\r?\n/, 1)[0]
  const counts = new Map([[',', 0], [';', 0], ['\t', 0]])
  let inHeaderQuote = false
  for (const char of first) { if (char === '"') inHeaderQuote = !inHeaderQuote; else if (!inHeaderQuote && counts.has(char)) counts.set(char, counts.get(char)! + 1) }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') { if (quoted && content[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (ch === delimiter && !quoted) { row.push(cell); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && content[i + 1] === '\n') i++; row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function tokens(value: string): string[] { return value.match(EMAIL_TOKEN) ?? [] }
export function detectEmailColumns(tables: ImportTable[]): EmailColumn[] {
  const columns: EmailColumn[] = []
  tables.forEach((table, sheetIndex) => {
    const width = Math.max(0, ...table.rows.slice(0, 30).map((row) => row.length))
    for (let index = 0; index < width; index++) {
      const header = table.rows[0]?.[index]?.trim() ?? ''
      const named = EMAIL_COLUMN.test(header)
      const values = table.rows.slice(named ? 1 : 0, 101).map((row) => row[index] ?? '')
      const matches = values.reduce((count, value) => count + tokens(value).length, 0)
      if (!named && matches === 0) continue
      columns.push({ key: `${sheetIndex}:${index}`, sheet: table.sheet, index, label: named ? header : `Column ${index + 1}`, matches, selected: named || matches > 0 })
    }
  })
  return columns
}

export function collectEmailInputs(pasted: string, tables: ImportTable[], selectedColumns: Set<string>): { value: string; source: string }[] {
  const values = pasted.split(/[\r\n,;]+/).flatMap((line) => tokens(line).length ? tokens(line).map((value) => ({ value, source: 'Pasted text' })) : line.trim() ? [{ value: line.trim(), source: 'Pasted text' }] : [])
  tables.forEach((table, sheetIndex) => {
    const indices = [...selectedColumns].filter((key) => key.startsWith(`${sheetIndex}:`)).map((key) => Number(key.split(':')[1]))
    const hasHeader = indices.some((index) => EMAIL_COLUMN.test(table.rows[0]?.[index] ?? ''))
    table.rows.slice(hasHeader ? 1 : 0).forEach((row, rowIndex) => indices.forEach((index) => {
      const cell = row[index]?.trim()
      if (cell) for (const value of tokens(cell).length ? tokens(cell) : [cell]) values.push({ value, source: `${table.sheet}, row ${rowIndex + (hasHeader ? 2 : 1)}` })
    }))
  })
  return values
}

function gmailKey(email: string): string {
  const [local, domain] = email.split('@')
  return domain === 'gmail.com' || domain === 'googlemail.com' ? `${local.split('+')[0].replace(/\./g, '')}@gmail.com` : email
}

export function filterEmails(inputs: { value: string; source: string }[]): FilterResult {
  const kept: FilteredEmail[] = [], rejected: RejectedEmail[] = []
  const seen = new Set<string>()
  let duplicates = 0
  for (const input of inputs) {
    const email = input.value.trim().replace(/^mailto:/i, '').replace(/^[<\[("']+|[>\])"'.,;:!?]+$/g, '').toLowerCase()
    let reason = ''
    if (email.length > 254 || !STRICT_EMAIL.test(email)) reason = 'Malformed email address'
    else {
      const [local, domain] = email.split('@')
      const tld = domain.split('.').at(-1) ?? ''
      if (local.length > 64 || local.includes('..') || domain.includes('..')) reason = 'Invalid email structure'
      else if (/^(?:gmail|googlemail|yahoo|outlook|hotmail|icloud|aol)\.(?:com|co\.uk|fr|de|net)[a-z]{2,}$/.test(domain)) reason = 'Extra text attached to a mail domain'
      else if (PLACEHOLDER_DOMAINS.has(domain) || domain.endsWith('.invalid') || PLACEHOLDER_LOCAL.test(local)) reason = 'Placeholder address'
      else if (DISPOSABLE.has(domain)) reason = 'Known disposable email domain'
      else if (NO_REPLY.test(local)) reason = 'No-reply mailbox'
      else if (!COMMON_TLDS.has(tld)) reason = 'Unrecognized domain ending; review manually'
    }
    if (reason) { rejected.push({ value: input.value, reason, source: input.source }); continue }
    const key = gmailKey(email)
    if (seen.has(key)) { duplicates++; rejected.push({ value: input.value, reason: 'Duplicate address or Gmail alias', source: input.source }); continue }
    seen.add(key)
    kept.push({ email, source: input.source, reason: input.value.trim() === email ? 'Passed local checks' : 'Normalized case or punctuation' })
  }
  return { kept, rejected, duplicates, total: inputs.length }
}
