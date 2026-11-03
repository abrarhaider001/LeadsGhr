import type { CrawlRow, Lead } from '@leadsghr/schemas'

const columns = ['name', 'domain', 'website', 'niche', 'country', 'city', 'emails', 'phones', 'sourceUrl', 'seenAt'] as const
const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`

export function leadsToCsv(leads: Lead[]): Uint8Array {
  const rows = [columns.join(','), ...leads.map((lead) => columns.map((column) => {
    const value = lead[column]
    const text = Array.isArray(value) ? value.join('; ') : String(value ?? '')
    // Prevent spreadsheet formula execution on untrusted scraped values.
    return escapeCell(/^[=+\-@]/.test(text) ? `'${text}` : text)
  }).join(','))]
  return new TextEncoder().encode(rows.join('\r\n'))
}

const crawlColumns = ['Niche', 'Run date (UTC)', 'Run time (UTC)', 'Business', 'Website URL', 'Phone', 'Location', 'Address', 'Maps URL', 'Source', 'Emails'] as const
export function crawlRowsToCsv(rows: CrawlRow[], startedAt: string, niches: string[]): Uint8Array {
  const safe = (value: string) => escapeCell(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value)
  const [runDate, runTime] = startedAt.split('T')
  const lines = [crawlColumns.map(safe).join(','), ...rows.map((row) => [row.niche ?? niches.join('; '), runDate ?? '', runTime?.slice(0, 8) ?? '', row.name, row.website, row.phone, row.location, row.address, row.mapsUrl, row.source, row.emails.join('; ')].map(safe).join(','))]
  return new TextEncoder().encode('\uFEFF' + lines.join('\r\n') + '\r\n')
}
