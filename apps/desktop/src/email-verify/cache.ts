import type Database from 'better-sqlite3'
import { checksComplete, scoreChecks, type EmailVerifyResult } from '@leadsghr/quality'

const TTL_MS = 7 * 24 * 60 * 60 * 1000

export type ResultCache = {
  get(email: string): EmailVerifyResult | undefined
  set(result: EmailVerifyResult): void
}

export function createEmailVerifyCache(db: Database.Database): ResultCache {
  db.exec(`CREATE TABLE IF NOT EXISTS email_verify_cache (
    email TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    code TEXT,
    reason TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    checks_json TEXT NOT NULL,
    mx_host TEXT,
    smtp_code INTEGER,
    checked_at TEXT NOT NULL
  )`)

  try { db.exec('ALTER TABLE email_verify_cache ADD COLUMN confidence INTEGER NOT NULL DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE email_verify_cache ADD COLUMN checks_json TEXT NOT NULL DEFAULT "{}"') } catch {}

  db.prepare(`DELETE FROM email_verify_cache
    WHERE checks_json IS NULL OR checks_json = '{}' OR checks_json = '' OR confidence IS NULL`).run()

  const select = db.prepare(`SELECT email, status, code, reason, confidence, checks_json AS checksJson, mx_host AS mxHost, smtp_code AS smtpCode, checked_at AS checkedAt
    FROM email_verify_cache WHERE email = ?`)
  const remove = db.prepare('DELETE FROM email_verify_cache WHERE email = ?')
  const upsert = db.prepare(`INSERT INTO email_verify_cache (email, status, code, reason, confidence, checks_json, mx_host, smtp_code, checked_at)
    VALUES (@email, @status, @code, @reason, @confidence, @checksJson, @mxHost, @smtpCode, @checkedAt)
    ON CONFLICT(email) DO UPDATE SET
      status = excluded.status,
      code = excluded.code,
      reason = excluded.reason,
      confidence = excluded.confidence,
      checks_json = excluded.checks_json,
      mx_host = excluded.mx_host,
      smtp_code = excluded.smtp_code,
      checked_at = excluded.checked_at`)

  return {
    get(email) {
      const row = select.get(email) as {
        email: string
        status: EmailVerifyResult['status']
        code: string | null
        reason: string
        confidence: number
        checksJson: string
        mxHost: string | null
        smtpCode: number | null
        checkedAt: string
      } | undefined
      if (!row) return undefined
      if (Date.now() - Date.parse(row.checkedAt) > TTL_MS) {
        remove.run(email)
        return undefined
      }
      if (row.status !== 'valid' && row.status !== 'invalid') {
        remove.run(email)
        return undefined
      }
      try {
        const checks = JSON.parse(row.checksJson)
        if (!checksComplete(checks)) {
          remove.run(email)
          return undefined
        }
        if (row.status === 'valid' && (!checks.syntax || !checks.domain || !checks.mx || checks.smtp !== 'accepted' || checks.catchAll || checks.disposable)) {
          remove.run(email)
          return undefined
        }
        return {
          email: row.email,
          status: row.status,
          reason: row.reason,
          code: row.code ?? undefined,
          confidence: scoreChecks(checks, row.status),
          checks,
          mxHost: row.mxHost ?? undefined,
          smtpCode: row.smtpCode ?? undefined,
        }
      } catch {
        remove.run(email)
        return undefined
      }
    },
    set(result) {
      if (result.status !== 'valid' && result.status !== 'invalid') return
      if (!checksComplete(result.checks)) return
      // Only cache mailbox-proven Valid rows; soft Valid (provider hide / block / temp) must re-check.
      if (result.status === 'valid' && result.checks.smtp !== 'accepted') return
      if (result.status === 'valid' && result.confidence < 85) return
      upsert.run({
        email: result.email,
        status: result.status,
        code: result.code ?? null,
        reason: result.reason,
        confidence: result.confidence,
        checksJson: JSON.stringify(result.checks),
        mxHost: result.mxHost ?? null,
        smtpCode: result.smtpCode ?? null,
        checkedAt: new Date().toISOString(),
      })
    },
  }
}
