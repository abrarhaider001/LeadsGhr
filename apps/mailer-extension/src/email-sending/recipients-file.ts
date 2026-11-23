import readXlsxFile from 'read-excel-file/browser'
import { parseCsv, recipientsFromRows } from './csv'
import type { Recipient } from './types'

const MAX_BYTES = 10_000_000

/** Reads recipients from a .csv or .xlsx file. For workbooks, the sheet with the most recipients is used. */
export async function readRecipientsFile(file: File): Promise<Recipient[]> {
  if (file.size > MAX_BYTES) throw new Error('Choose a file smaller than 10 MB.')
  const name = file.name.toLowerCase()
  let recipients: Recipient[]
  if (name.endsWith('.xlsx')) {
    const sheets = await readXlsxFile(file)
    recipients =
      sheets
        .map(({ data }) =>
          recipientsFromRows(
            data.map((row) => row.map((cell) => (cell == null ? '' : String(cell)))),
          ),
        )
        .sort((a, b) => b.length - a.length)[0] ?? []
  } else if (name.endsWith('.csv') || file.type === 'text/csv') {
    recipients = recipientsFromRows(parseCsv(await file.text()))
  } else throw new Error('Choose a .csv or .xlsx file.')
  if (!recipients.length) throw new Error('No valid email addresses found in that file.')
  return recipients
}
