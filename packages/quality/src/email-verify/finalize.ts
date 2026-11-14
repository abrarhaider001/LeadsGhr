import type { EmailVerifyChecks, EmailVerifyResult, EmailVerifyStatus } from './types.ts'

export type PipelineSignals = {
  email: string
  syntax: boolean
  domain: boolean
  mx: boolean
  disposable: boolean
  roleBased: boolean
  catchAll: boolean
  smtp: EmailVerifyChecks['smtp']
  code?: string
  reason?: string
  mxHost?: string
  smtpCode?: number
}

const RETRYABLE = new Set(['greylist', 'temp_failure', 'timeout', 'unreachable', 'needs_tls'])

const SCORE_BAND: Record<EmailVerifyStatus, readonly [number, number]> = {
  valid: [85, 100],
  risky: [25, 60],
  unknown: [10, 55],
  invalid: [0, 20],
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function scoreChecks(checks: EmailVerifyChecks, status: EmailVerifyStatus): number {
  const [min, max] = SCORE_BAND[status]
  if (!checks.syntax) return clamp(0, min, max)
  if (!checks.domain) return clamp(5, min, max)
  if (!checks.mx) return clamp(10, min, max)

  let score = 45
  if (checks.smtp === 'accepted') score += 40
  else if (checks.smtp === 'rejected') score = Math.min(score, 15)
  else if (checks.smtp === 'temp') score += 10
  else if (checks.smtp === 'blocked') score += 5
  else score += 8

  if (checks.disposable) score -= 40
  if (checks.catchAll) score -= 40
  if (checks.roleBased) score -= 15

  return clamp(score, min, max)
}

export function checksComplete(checks: unknown): checks is EmailVerifyChecks {
  if (!checks || typeof checks !== 'object') return false
  const value = checks as EmailVerifyChecks
  return typeof value.syntax === 'boolean'
    && typeof value.domain === 'boolean'
    && typeof value.mx === 'boolean'
    && typeof value.smtp === 'string'
    && typeof value.disposable === 'boolean'
    && typeof value.roleBased === 'boolean'
    && typeof value.catchAll === 'boolean'
}

function classifyStatus(input: PipelineSignals): Pick<EmailVerifyResult, 'status' | 'code' | 'reason'> {
  if (!input.syntax) {
    return { status: 'invalid', code: 'bad_syntax', reason: 'Bad syntax' }
  }
  if (!input.domain) {
    return { status: 'invalid', code: 'domain_not_found', reason: 'Domain not found' }
  }
  if (!input.mx) {
    return { status: 'invalid', code: 'no_mx', reason: 'No MX' }
  }
  if (input.smtp === 'rejected') {
    return {
      status: 'invalid',
      code: input.code ?? 'mailbox_not_found',
      reason: input.reason ?? 'Mailbox not found',
    }
  }
  if (input.disposable) {
    return { status: 'risky', code: 'disposable', reason: 'Disposable domain' }
  }
  if (input.catchAll) {
    return { status: 'risky', code: 'catch_all', reason: 'Catch-all domain' }
  }
  if (input.code === 'mailbox_full') {
    return { status: 'risky', code: 'mailbox_full', reason: input.reason ?? 'Mailbox full' }
  }
  if (input.smtp === 'accepted') {
    return { status: 'valid', code: 'accepted', reason: 'Accepted' }
  }
  if (input.smtp === 'temp' || input.smtp === 'blocked' || input.smtp === 'unverifiable' || input.smtp === 'skipped') {
    return {
      status: 'unknown',
      code: input.code ?? (
        input.smtp === 'temp' ? 'temp_failure'
          : input.smtp === 'blocked' ? 'policy_block'
            : input.smtp === 'skipped' ? 'smtp_skipped'
              : 'provider_unverifiable'
      ),
      reason: input.reason ?? (input.smtp === 'skipped' ? 'SMTP skipped' : 'Unconfirmed'),
    }
  }
  return {
    status: 'unknown',
    code: input.code ?? 'unconfirmed',
    reason: input.reason ?? 'Unconfirmed',
  }
}

export function finalizeResult(input: PipelineSignals): EmailVerifyResult {
  const checks: EmailVerifyChecks = {
    syntax: input.syntax,
    domain: input.domain,
    mx: input.mx,
    smtp: input.smtp,
    disposable: input.disposable,
    roleBased: input.roleBased,
    catchAll: input.catchAll,
  }

  let { status, code, reason } = classifyStatus(input)

  if (
    status === 'valid'
    && (!checks.syntax || !checks.domain || !checks.mx || checks.smtp !== 'accepted' || checks.catchAll || checks.disposable)
  ) {
    status = 'unknown'
    code = 'inconsistent'
    reason = 'Incomplete verification'
  }

  return {
    email: input.email,
    status,
    reason,
    code,
    confidence: scoreChecks(checks, status),
    checks,
    mxHost: input.mxHost,
    smtpCode: input.smtpCode,
  }
}

export function isRetryable(result: Pick<EmailVerifyResult, 'status' | 'code'>): boolean {
  return result.status === 'unknown' && RETRYABLE.has(result.code ?? '')
}
