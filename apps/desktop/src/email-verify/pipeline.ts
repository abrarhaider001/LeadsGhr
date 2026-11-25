import { randomBytes } from 'node:crypto'
import {
  checkDisposable,
  checkRoleBased,
  classifyMailFrom,
  classifyRcpt,
  finalizeResult,
  looseVerifyEmail,
  normalizeVerifyEmail,
  type EmailVerifyEnabledChecks,
  type EmailVerifyResult,
  type SmtpClassified,
} from '@leadsghr/quality'
import { resolveDomain } from './dns'
import type { ResultCache } from './cache'
import { SmtpConn, SmtpError, isStop } from './smtp'

type Opts = {
  mailFrom: string
  ehlo: string
  perSession: number
  paceMs: number
  workers: number
  checkSyntax: boolean
  checkDomain: boolean
  checkMx: boolean
  checkSmtp: boolean
  checkDisposable: boolean
  checkRoleBased: boolean
  checkCatchAll: boolean
}

function enabledChecks(opts: Opts): EmailVerifyEnabledChecks {
  return {
    syntax: opts.checkSyntax,
    domain: opts.checkDomain,
    mx: opts.checkMx,
    smtp: opts.checkSmtp,
    disposable: opts.checkDisposable,
    roleBased: opts.checkRoleBased,
    catchAll: opts.checkCatchAll,
  }
}

type Item = { index: number; email: string; disposable: boolean; roleBased: boolean }
type DomainGroup = { hosts: string[]; items: Item[]; exists: boolean; nullMx: boolean }
type Emit = (result: EmailVerifyResult, index: number) => void
type Provider = 'google' | 'microsoft' | 'yahoo' | 'generic'
const NO_PROBE = new Set<Provider>(['microsoft', 'yahoo'])

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new SmtpError('stopped', 'Validation stopped'))
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new SmtpError('stopped', 'Validation stopped'))
      },
      { once: true },
    )
  })

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>, signal: AbortSignal) {
  let next = 0
  const width = Math.max(1, Math.min(n, items.length || 1))
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (!signal.aborted) {
        const index = next++
        if (index >= items.length) return
        await fn(items[index])
      }
    }),
  )
}

function detectProvider(mx: string): Provider {
  const host = mx.toLowerCase()
  if (/(^|\.)(google|googlemail)\.com$/.test(host)) return 'google'
  if (/\.outlook\.com$/.test(host)) return 'microsoft'
  if (/yahoodns\.net$|\.yahoo\.com$/.test(host)) return 'yahoo'
  return 'generic'
}

export async function preflight(signal: AbortSignal): Promise<boolean> {
  for (const host of ['gmail-smtp-in.l.google.com', 'mx01.mail.icloud.com']) {
    try {
      const conn = await SmtpConn.open(host, signal, 6000)
      const banner = await conn.read(6000).catch(() => undefined)
      conn.close()
      if (banner) return true
    } catch (error) {
      if (isStop(error)) throw error
    }
  }
  return false
}

async function probe(conn: SmtpConn, email: string, opts: Opts): Promise<SmtpClassified> {
  const from = await conn.cmd(`MAIL FROM:<${opts.mailFrom}>`)
  if (from.code >= 400) {
    await conn.cmd('RSET').catch(() => undefined)
    return classifyMailFrom(from.code, from.text)
  }
  const rcpt = await conn.cmd(`RCPT TO:<${email}>`)
  await conn.cmd('RSET').catch(() => undefined)
  return classifyRcpt(rcpt.code, rcpt.text)
}

function mapSmtp(signal: SmtpClassified['signal']): EmailVerifyResult['checks']['smtp'] {
  if (signal === 'accepted') return 'accepted'
  if (signal === 'rejected') return 'rejected'
  if (signal === 'temp' || signal === 'needs_tls') return 'temp'
  if (signal === 'blocked') return 'blocked'
  return 'unverifiable'
}

function emitAll(
  domains: Map<string, DomainGroup>,
  host: string,
  patch: Partial<Parameters<typeof finalizeResult>[0]> &
    Pick<Parameters<typeof finalizeResult>[0], 'smtp' | 'code' | 'reason'>,
  emit: Emit,
  enabled: EmailVerifyEnabledChecks,
) {
  for (const group of domains.values()) {
    for (const item of group.items) {
      emit(
        finalizeResult({
          email: item.email,
          syntax: true,
          domain: true,
          mx: true,
          disposable: item.disposable,
          roleBased: item.roleBased,
          catchAll: false,
          mxHost: host,
          enabled,
          ...patch,
        }),
        item.index,
      )
    }
  }
}

async function runHost(
  host: string,
  domains: Map<string, DomainGroup>,
  opts: Opts,
  signal: AbortSignal,
  emit: Emit,
) {
  const enabled = enabledChecks(opts)
  const provider = detectProvider(host)
  if (NO_PROBE.has(provider)) {
    emitAll(
      domains,
      host,
      {
        smtp: 'unverifiable',
        code: 'provider_unverifiable',
        reason: 'Provider hides mailboxes',
      },
      emit,
      enabled,
    )
    return
  }

  const perSession = provider === 'google' ? 3 : opts.perSession
  let conn: SmtpConn | undefined
  let used = 0
  let fails = 0
  let lastKind: 'timeout' | 'other' = 'other'
  let first = true

  const ensure = async (hosts: string[]) => {
    if (conn?.alive && used < perSession) return
    await conn?.quit().catch(() => undefined)
    conn = undefined
    for (const candidate of hosts.slice(0, 3)) {
      try {
        if (!first) await sleep(opts.paceMs + Math.random() * 400, signal)
        first = false
        conn = await SmtpConn.connect(candidate, opts.ehlo, signal)
        used = 0
        return
      } catch (error) {
        if (isStop(error)) throw error
        lastKind = error instanceof SmtpError && error.kind === 'timeout' ? 'timeout' : 'other'
      }
    }
    throw new SmtpError('connect', 'Unreachable')
  }

  const safe = async (hosts: string[], email: string): Promise<SmtpClassified> => {
    if (fails >= 4) {
      return lastKind === 'timeout'
        ? { signal: 'temp', code: 'timeout', reason: 'Timed out' }
        : { signal: 'blocked', code: 'unreachable', reason: 'Unreachable' }
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await ensure(hosts)
        used += 1
        let result = await probe(conn!, email, opts)
        if (result.signal === 'needs_tls' && conn!.extensions.has('STARTTLS') && !conn!.secure) {
          await conn!.startTls(opts.ehlo)
          result = await probe(conn!, email, opts)
        }
        if (result.code !== 'sender_blocked') fails = 0
        return result
      } catch (error) {
        if (isStop(error)) throw error
        if (error instanceof SmtpError && error.kind === 'timeout') lastKind = 'timeout'
        conn?.close()
        conn = undefined
        fails += 1
      }
    }
    return lastKind === 'timeout'
      ? { signal: 'temp', code: 'timeout', reason: 'Timed out' }
      : { signal: 'blocked', code: 'unreachable', reason: 'Unreachable' }
  }

  try {
    for (const [domain, group] of domains) {
      const probeItems = group.items.filter((item) => !item.disposable)
      let catchAll = false

      if (probeItems.length && (opts.checkCatchAll || provider === 'google')) {
        const probeEmail =
          provider === 'google' || !opts.checkCatchAll
            ? probeItems[0].email
            : `zz${randomBytes(6).toString('hex')}@${domain}`
        const sample = await safe(group.hosts, probeEmail)
        if (sample.code === 'sender_blocked') {
          emitAll(
            domains,
            host,
            {
              smtp: 'blocked',
              code: 'sender_blocked',
              reason: 'MAIL FROM rejected — set a routable address in Preferences',
              smtpCode: sample.smtpCode,
            },
            emit,
            enabled,
          )
          return
        }
        if (opts.checkCatchAll && provider !== 'google') catchAll = sample.signal === 'accepted'
      }

      for (const item of group.items) {
        if (signal.aborted) throw new SmtpError('stopped', 'Validation stopped')
        if (item.disposable) {
          emit(
            finalizeResult({
              email: item.email,
              syntax: true,
              domain: true,
              mx: true,
              disposable: true,
              roleBased: item.roleBased,
              catchAll: false,
              smtp: 'skipped',
              code: 'disposable',
              reason: 'Disposable domain',
              mxHost: host,
              enabled,
            }),
            item.index,
          )
          continue
        }

        const smtp =
          provider !== 'google' && catchAll
            ? {
                signal: 'accepted' as const,
                code: 'catch_all',
                reason: 'Catch-all domain',
                smtpCode: 250,
              }
            : await safe(group.hosts, item.email)

        if (smtp.code === 'sender_blocked') {
          emitAll(
            domains,
            host,
            {
              smtp: 'blocked',
              code: 'sender_blocked',
              reason: 'MAIL FROM rejected — set a routable address in Preferences',
              smtpCode: smtp.smtpCode,
            },
            emit,
            enabled,
          )
          return
        }

        emit(
          finalizeResult({
            email: item.email,
            syntax: true,
            domain: true,
            mx: true,
            disposable: false,
            roleBased: item.roleBased,
            catchAll,
            smtp: mapSmtp(smtp.signal),
            code: catchAll ? 'catch_all' : smtp.code,
            reason: catchAll ? 'Catch-all domain' : smtp.reason,
            mxHost: host,
            smtpCode: smtp.smtpCode,
            enabled,
          }),
          item.index,
        )
      }
    }
  } finally {
    await conn?.quit().catch(() => undefined)
  }
}

export async function verifyPipeline(
  raw: string[],
  opts: Opts,
  signal: AbortSignal,
  emit: Emit,
  cache?: ResultCache,
) {
  const enabled = enabledChecks(opts)
  const needsDns = opts.checkDomain || opts.checkMx || opts.checkSmtp
  const out: Emit = (result, index) => {
    if (cache && (result.status === 'valid' || result.status === 'invalid')) cache.set(result)
    emit(result, index)
  }

  const byDomain = new Map<string, Item[]>()

  raw.forEach((value, index) => {
    const strict = normalizeVerifyEmail(value)
    const email = strict ?? (opts.checkSyntax ? null : looseVerifyEmail(value))
    if (!email) {
      out(
        finalizeResult({
          email: value.trim() || value,
          syntax: false,
          domain: false,
          mx: false,
          disposable: false,
          roleBased: false,
          catchAll: false,
          smtp: 'skipped',
          code: 'bad_syntax',
          reason: opts.checkSyntax ? 'Bad syntax' : 'Could not parse address',
          enabled,
        }),
        index,
      )
      return
    }
    const hit = cache?.get(email)
    if (hit) {
      emit(hit, index)
      return
    }
    const domain = email.split('@')[1]
    const disposable = opts.checkDisposable ? checkDisposable(domain) : false
    const roleBased = opts.checkRoleBased ? checkRoleBased(email) : false
    if (!needsDns) {
      out(
        finalizeResult({
          email,
          syntax: true,
          domain: true,
          mx: true,
          disposable,
          roleBased,
          catchAll: false,
          smtp: 'skipped',
          code: disposable ? 'disposable' : 'checks_limited',
          reason: disposable ? 'Disposable domain' : 'Domain, MX, and SMTP checks off',
          enabled,
        }),
        index,
      )
      return
    }
    const list = byDomain.get(domain) ?? []
    list.push({ index, email, disposable, roleBased })
    byDomain.set(domain, list)
  })

  if (!byDomain.size) return

  const resolved = new Map<string, DomainGroup>()
  await pool(
    [...byDomain.keys()],
    10,
    async (domain) => {
      const dns = await resolveDomain(domain).catch(() => ({
        exists: false,
        hosts: [] as string[],
        nullMx: false,
      }))
      resolved.set(domain, {
        hosts: dns.hosts,
        items: byDomain.get(domain) ?? [],
        exists: dns.exists,
        nullMx: dns.nullMx,
      })
    },
    signal,
  )

  const smtpUnits = new Map<string, Map<string, DomainGroup>>()

  for (const [domain, group] of resolved) {
    const hasMx = !group.nullMx && group.hosts.length > 0
    if (!group.exists) {
      for (const item of group.items) {
        out(
          finalizeResult({
            email: item.email,
            syntax: true,
            domain: false,
            mx: false,
            disposable: item.disposable,
            roleBased: item.roleBased,
            catchAll: false,
            smtp: 'skipped',
            code: 'domain_not_found',
            reason: 'Domain not found',
            enabled,
          }),
          item.index,
        )
      }
      continue
    }

    if (opts.checkMx && !hasMx) {
      for (const item of group.items) {
        out(
          finalizeResult({
            email: item.email,
            syntax: true,
            domain: true,
            mx: false,
            disposable: item.disposable,
            roleBased: item.roleBased,
            catchAll: false,
            smtp: 'skipped',
            code: 'no_mx',
            reason: 'No MX',
            enabled,
          }),
          item.index,
        )
      }
      continue
    }

    if (!opts.checkSmtp) {
      for (const item of group.items) {
        out(
          finalizeResult({
            email: item.email,
            syntax: true,
            domain: true,
            mx: hasMx || !opts.checkMx,
            disposable: item.disposable,
            roleBased: item.roleBased,
            catchAll: false,
            smtp: 'skipped',
            code: item.disposable ? 'disposable' : 'smtp_disabled',
            reason: item.disposable ? 'Disposable domain' : 'SMTP check off',
            mxHost: group.hosts[0],
            enabled,
          }),
          item.index,
        )
      }
      continue
    }

    if (!hasMx) {
      for (const item of group.items) {
        out(
          finalizeResult({
            email: item.email,
            syntax: true,
            domain: true,
            mx: false,
            disposable: item.disposable,
            roleBased: item.roleBased,
            catchAll: false,
            smtp: 'skipped',
            code: 'no_mx',
            reason: 'No MX',
            enabled,
          }),
          item.index,
        )
      }
      continue
    }

    if (group.items.every((item) => item.disposable)) {
      for (const item of group.items) {
        out(
          finalizeResult({
            email: item.email,
            syntax: true,
            domain: true,
            mx: true,
            disposable: true,
            roleBased: item.roleBased,
            catchAll: false,
            smtp: 'skipped',
            code: 'disposable',
            reason: 'Disposable domain',
            mxHost: group.hosts[0],
            enabled,
          }),
          item.index,
        )
      }
      continue
    }

    const key = group.hosts[0].toLowerCase()
    const unit = smtpUnits.get(key) ?? new Map<string, DomainGroup>()
    unit.set(domain, group)
    smtpUnits.set(key, unit)
  }

  if (!smtpUnits.size) return

  const size = (unit: Map<string, DomainGroup>) =>
    [...unit.values()].reduce((count, group) => count + group.items.length, 0)
  const ordered = [...smtpUnits.entries()].sort((a, b) => size(b[1]) - size(a[1]))
  await pool(
    ordered,
    opts.workers,
    ([mxHost, domains]) => runHost(mxHost, domains, opts, signal, out),
    signal,
  )
}
