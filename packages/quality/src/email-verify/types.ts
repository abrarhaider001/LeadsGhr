export type EmailVerifyStatus = 'valid' | 'risky' | 'invalid' | 'unknown'

export type EmailVerifySmtpCheck =
  | 'accepted'
  | 'rejected'
  | 'temp'
  | 'blocked'
  | 'skipped'
  | 'unverifiable'

export type EmailVerifyChecks = {
  syntax: boolean
  domain: boolean
  mx: boolean
  smtp: EmailVerifySmtpCheck
  disposable: boolean
  roleBased: boolean
  catchAll: boolean
}

export type EmailVerifyResult = {
  email: string
  status: EmailVerifyStatus
  reason: string
  code?: string
  confidence: number
  checks: EmailVerifyChecks
  mxHost?: string
  smtpCode?: number
}
