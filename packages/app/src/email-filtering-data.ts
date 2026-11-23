export { filterEmails } from '@leadsghr/quality'
export type { FilterResult, FilteredEmail, RejectedEmail } from '@leadsghr/quality'

export type ImportTable = { sheet: string; rows: string[][] }
export type EmailColumn = {
  key: string
  sheet: string
  index: number
  label: string
  matches: number
  selected: boolean
}

const EMAIL_COLUMN = /(?:^|[\s_-])(?:e-?mails?(?:\s*address)?|contact\s*email|mail)(?:$|[\s_-])/i
const EMAIL_TOKEN = /[^\s,;<>()[\]"']+@[^\s,;<>()[\]"']+/g

export function parseCsv(text: string): string[][] {
  const content = text.replace(/^\uFEFF/, '')
  const first = content.split(/\r?\n/, 1)[0]
  const counts = new Map([
    [',', 0],
    [';', 0],
    ['\t', 0],
  ])
  let inHeaderQuote = false
  for (const char of first) {
    if (char === '"') inHeaderQuote = !inHeaderQuote
    else if (!inHeaderQuote && counts.has(char)) counts.set(char, counts.get(char)! + 1)
  }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') {
      if (quoted && content[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
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

function tokens(value: string): string[] {
  return value.match(EMAIL_TOKEN) ?? []
}
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
      columns.push({
        key: `${sheetIndex}:${index}`,
        sheet: table.sheet,
        index,
        label: named ? header : `Column ${index + 1}`,
        matches,
        selected: named || matches > 0,
      })
    }
  })
  return columns
}

export function collectEmailInputs(
  pasted: string,
  tables: ImportTable[],
  selectedColumns: Set<string>,
): { value: string; source: string }[] {
  const values = pasted
    .split(/[\r\n,;]+/)
    .flatMap((line) =>
      tokens(line).length
        ? tokens(line).map((value) => ({ value, source: 'Pasted text' }))
        : line.trim()
          ? [{ value: line.trim(), source: 'Pasted text' }]
          : [],
    )
  tables.forEach((table, sheetIndex) => {
    const indices = [...selectedColumns]
      .filter((key) => key.startsWith(`${sheetIndex}:`))
      .map((key) => Number(key.split(':')[1]))
    const hasHeader = indices.some((index) => EMAIL_COLUMN.test(table.rows[0]?.[index] ?? ''))
    table.rows.slice(hasHeader ? 1 : 0).forEach((row, rowIndex) =>
      indices.forEach((index) => {
        const cell = row[index]?.trim()
        if (cell)
          for (const value of tokens(cell).length ? tokens(cell) : [cell])
            values.push({ value, source: `${table.sheet}, row ${rowIndex + (hasHeader ? 2 : 1)}` })
      }),
    )
  })
  return values
}
