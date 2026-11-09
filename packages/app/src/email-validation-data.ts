import type { EmailVerifyResult } from '@leadsghr/schemas'

export { collectEmailInputs, detectEmailColumns, parseCsv, type EmailColumn, type ImportTable } from './email-filtering-data'
export {
  EMAIL_VERIFY_CONCURRENCY_DEFAULT,
  EMAIL_VERIFY_CONCURRENCY_MAX,
  EMAIL_VERIFY_CONCURRENCY_MIN,
} from '@leadsghr/schemas'
export { isRetryable } from '@leadsghr/quality'

export const EMAIL_VERIFY_MAX = 500

export function statusLabel(status: string): string {
  switch (status) {
    case 'valid': return 'Valid'
    case 'risky': return 'Risky'
    case 'invalid': return 'Invalid'
    default: return 'Unknown'
  }
}

export function statusClass(status: string): string {
  switch (status) {
    case 'valid': return 'la-email-verify-valid'
    case 'risky': return 'la-email-verify-risky'
    case 'invalid': return 'la-email-verify-invalid'
    default: return 'la-email-verify-unknown'
  }
}

export function smtpLabel(value: string): string {
  switch (value) {
    case 'accepted': return 'Accepted'
    case 'rejected': return 'Rejected'
    case 'temp': return 'Temporary'
    case 'blocked': return 'Blocked'
    case 'skipped': return 'Skipped'
    default: return 'Unverifiable'
  }
}

export function checkSummary(item: EmailVerifyResult): string {
  const checks = item.checks
  if (!checks) return `${item.reason} · Score ${item.confidence}`
  return [
    `Syntax ${checks.syntax ? 'Passed' : 'Failed'}`,
    `Domain ${checks.domain ? 'Passed' : 'Failed'}`,
    `MX ${checks.mx ? 'Found' : 'Missing'}`,
    `SMTP ${smtpLabel(checks.smtp)}`,
    `Disposable ${checks.disposable ? 'Yes' : 'No'}`,
    `Role-based ${checks.roleBased ? 'Yes' : 'No'}`,
    `Catch-all ${checks.catchAll ? 'Yes' : 'No'}`,
    `Deliverability ${item.confidence}`,
  ].join(' · ')
}
