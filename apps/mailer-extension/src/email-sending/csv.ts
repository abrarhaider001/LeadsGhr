import type { Recipient } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
const EMAIL_HEADER = /(?:^|[\s_-])(?:e-?mails?(?:\s*address)?|contact\s*email|mail)(?:$|[\s_-])/i
const EMAIL_TOKEN = /[^\s,;<>()[\]"']+@[^\s,;<>()[\]"']+/g

export function parseCsv(text: string): string[][] {
  const content = text.replace(/^\uFEFF/, '')
  const first = content.split(/\r?\n/, 1)[0] ?? ''
  const counts = new Map([[',', 0], [';', 0], ['\t', 0]])
  let inHeaderQuote = false
  for (const char of first) {
    if (char === '"') inHeaderQuote = !inHeaderQuote
    else if (!inHeaderQuote && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1)
  }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && content[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function normalizeHeader(value: string, index: number): string {
  const trimmed = value.trim()
  return trimmed || `column_${index + 1}`
}

function pickEmailColumn(headers: string[], sample: string[][]): number {
  const named = headers.findIndex((header) => EMAIL_HEADER.test(header))
  if (named >= 0) return named
  let best = 0
  let bestCount = -1
  for (let index = 0; index < headers.length; index++) {
    const count = sample.reduce((total, row) => total + ((row[index] ?? '').match(EMAIL_TOKEN)?.length ?? 0), 0)
    if (count > bestCount) { best = index; bestCount = count }
  }
  return best
}

function firstEmail(value: string): string | null {
  const token = value.match(EMAIL_TOKEN)?.[0]?.trim()
  if (!token) return null
  return EMAIL_RE.test(token) ? token.toLowerCase() : null
}

export function recipientsFromCsv(text: string): Recipient[] {
  return recipientsFromRows(parseCsv(text))
}

/** Detects the email column (by header name, else by content) and returns unique recipients with every column as a template field. */
export function recipientsFromRows(rows: string[][]): Recipient[] {
  if (!rows.length) return []
  const namedHeader = rows[0].some((cell) => EMAIL_HEADER.test(cell))
  const firstRowHasEmail = rows[0].some((cell) => !!firstEmail(cell))
  const hasHeader = namedHeader || !firstRowHasEmail
  const headerRow = hasHeader ? rows[0] : rows[0].map((_, index) => `column_${index + 1}`)
  const data = hasHeader ? rows.slice(1) : rows
  const headers = headerRow.map(normalizeHeader)
  const emailColumn = pickEmailColumn(headers, data.slice(0, 40))
  const seen = new Set<string>()
  const recipients: Recipient[] = []
  for (const row of data) {
    const email = firstEmail(row[emailColumn] ?? '')
    if (!email || seen.has(email)) continue
    seen.add(email)
    const fields: Record<string, string> = { email }
    headers.forEach((header, index) => {
      fields[header] = (row[index] ?? '').trim()
      fields[header.toLowerCase()] = fields[header]
    })
    recipients.push({ index: recipients.length + 1, email, fields })
  }
  return recipients
}
