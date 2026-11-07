export { collectEmailInputs, detectEmailColumns, parseCsv, type EmailColumn, type ImportTable } from './email-filtering-data'
export type { EmailVerifyResult, EmailVerifyStatus } from '@leadsghr/schemas'

export const EMAIL_VERIFY_MAX = 50

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
