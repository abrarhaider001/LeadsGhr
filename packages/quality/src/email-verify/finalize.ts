import type { EmailVerifyChecks, EmailVerifyResult, EmailVerifyStatus } from './types.ts'

export type EmailVerifyEnabledChecks = {
  syntax: boolean
  domain: boolean
  mx: boolean
  smtp: boolean
  disposable: boolean
  roleBased: boolean
  catchAll: boolean
}

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
  enabled?: EmailVerifyEnabledChecks
}

const ALL_CHECKS_ON: EmailVerifyEnabledChecks = {
  syntax: true,
  domain: true,
  mx: true,
  smtp: true,
  disposable: true,
  roleBased: true,
  catchAll: true,
}

const RETRYABLE = new Set(['greylist', 'temp_failure', 'timeout', 'unreachable', 'needs_tls'])

const SCORE_BAND: Record<EmailVerifyStatus, readonly [number, number]> = {
  valid: [85, 100],
  risky: [25, 60],
  invalid: [0, 20],
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function scoreChecks(
  checks: EmailVerifyChecks,
  status: EmailVerifyStatus,
  enabled: EmailVerifyEnabledChecks = ALL_CHECKS_ON,
): number {
  const [min, max] = SCORE_BAND[status]
  if (enabled.syntax && !checks.syntax) return clamp(0, min, max)
  if (enabled.domain && !checks.domain) return clamp(5, min, max)
  if (enabled.mx && !checks.mx) return clamp(10, min, max)

  let score = 45
  if (enabled.smtp) {
    if (checks.smtp === 'accepted') score += 40
    else if (checks.smtp === 'rejected') score = Math.min(score, 15)
    else if (checks.smtp === 'temp') score += 10
    else if (checks.smtp === 'blocked') score += 5
    else score += 8
  }

  if (enabled.disposable && checks.disposable) score -= 40
  if (enabled.catchAll && checks.catchAll) score -= 40
  if (enabled.roleBased && checks.roleBased) score -= 15

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

function classifyStatus(
  input: PipelineSignals,
  enabled: EmailVerifyEnabledChecks,
): Pick<EmailVerifyResult, 'status' | 'code' | 'reason'> {
  // Unusable address shape is always Invalid. Turning Syntax off only relaxes parsing, not this floor.
  if (!input.syntax) {
    return { status: 'invalid', code: 'bad_syntax', reason: 'Bad syntax' }
  }
  if (enabled.domain && !input.domain) {
    return { status: 'invalid', code: 'domain_not_found', reason: 'Domain not found' }
  }
  if (enabled.mx && !input.mx) {
    return { status: 'invalid', code: 'no_mx', reason: 'No MX' }
  }
  if (enabled.smtp && input.smtp === 'rejected') {
    return {
      status: 'invalid',
      code: input.code ?? 'mailbox_not_found',
      reason: input.reason ?? 'Mailbox not found',
    }
  }
  if (enabled.disposable && input.disposable) {
    return { status: 'risky', code: 'disposable', reason: 'Disposable domain' }
  }
  if (enabled.catchAll && input.catchAll) {
    return { status: 'risky', code: 'catch_all', reason: 'Catch-all domain' }
  }
  if (input.code === 'mailbox_full') {
    return { status: 'risky', code: 'mailbox_full', reason: input.reason ?? 'Mailbox full' }
  }
  if (enabled.smtp && input.smtp === 'accepted') {
    return { status: 'valid', code: 'accepted', reason: 'Accepted' }
  }
  if (
    enabled.smtp
    && (input.smtp === 'temp' || input.smtp === 'blocked' || input.smtp === 'unverifiable' || input.smtp === 'skipped')
  ) {
    return {
      status: 'valid',
      code: input.code ?? (
        input.smtp === 'temp' ? 'temp_failure'
          : input.smtp === 'blocked' ? 'policy_block'
            : input.smtp === 'skipped' ? 'smtp_skipped'
              : 'provider_unverifiable'
      ),
      reason: input.reason ?? (input.smtp === 'skipped' ? 'SMTP skipped' : 'Accepted without mailbox proof'),
    }
  }
  if (!enabled.smtp && input.smtp === 'skipped') {
    return {
      status: 'valid',
      code: input.code ?? 'smtp_disabled',
      reason: input.reason ?? 'SMTP check off',
    }
  }
  return {
    status: 'valid',
    code: input.code ?? 'unconfirmed',
    reason: input.reason ?? 'Accepted without mailbox proof',
  }
}

export function finalizeResult(input: PipelineSignals): EmailVerifyResult {
  const enabled = input.enabled ?? ALL_CHECKS_ON
  const checks: EmailVerifyChecks = {
    syntax: input.syntax,
    domain: input.domain,
    mx: input.mx,
    smtp: input.smtp,
    disposable: enabled.disposable ? input.disposable : false,
    roleBased: enabled.roleBased ? input.roleBased : false,
    catchAll: enabled.catchAll ? input.catchAll : false,
  }

  const { status, code, reason } = classifyStatus({ ...input, ...checks }, enabled)

  return {
    email: input.email,
    status,
    reason,
    code,
    confidence: scoreChecks(checks, status, enabled),
    checks,
    mxHost: input.mxHost,
    smtpCode: input.smtpCode,
  }
}

export function isRetryable(result: Pick<EmailVerifyResult, 'status' | 'code'>): boolean {
  return result.status === 'valid' && RETRYABLE.has(result.code ?? '')
}
