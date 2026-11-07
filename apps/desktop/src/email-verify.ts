import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import dns from 'node:dns'
import { lookup, resolve4, resolveMx } from 'node:dns/promises'
import { connect, type Socket } from 'node:net'
import { hostname } from 'node:os'
import {
  classifySmtpRcptReply,
  normalizeVerifyEmail,
  noMxResult,
  probeBlockedResult,
  syntaxInvalidResult,
  type EmailVerifyResult,
} from '@leadsghr/quality'
import { emailVerifyJobIdSchema, emailVerifyRequestSchema } from '@leadsghr/schemas'

const SMTP_PORT = 25
const CONNECT_TIMEOUT_MS = 8_000
const COMMAND_TIMEOUT_MS = 10_000
const DELAY_BETWEEN_CHECKS_MS = 1_200
const FIXED_MAIL_FROM = 'verify@leadsghr.invalid'
/** Used when the OS stub resolver (often 127.0.0.1) refuses Node's direct DNS queries. */
const PUBLIC_DNS_SERVERS = ['8.8.8.8', '1.1.1.1']
const HELO_NAME = (() => {
  try {
    const name = hostname().trim() || 'leadsghr.desktop'
    return name.replace(/[^\w.-]/g, '').slice(0, 64) || 'leadsghr.desktop'
  } catch {
    return 'leadsghr.desktop'
  }
})()

type ActiveJob = { id: string; controller: AbortController }

let activeJob: ActiveJob | undefined

function requireOwner(event: Electron.IpcMainInvokeEvent) {
  if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Validation stopped')); return }
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve() }, ms)
    const onAbort = () => { clearTimeout(timer); reject(new Error('Validation stopped')) }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function publicResolver() {
  const resolver = new dns.promises.Resolver()
  resolver.setServers(PUBLIC_DNS_SERVERS)
  return resolver
}

function mxHosts(records: { exchange: string; priority: number }[]): string[] {
  return [...new Set(
    records
      .sort((a, b) => a.priority - b.priority)
      .map((record) => record.exchange.replace(/\.$/, ''))
      .filter(Boolean),
  )]
}

function isDnsTransportError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ESERVFAIL' || code === 'ETIME' || code === 'EOF'
}

async function resolveMxWithFallback(domain: string): Promise<string[]> {
  try {
    const hosts = mxHosts(await resolveMx(domain))
    if (hosts.length) return hosts
  } catch (error) {
    if (!isDnsTransportError(error)) {
      /* No MX / empty answer — still try public DNS in case the stub resolver lied. */
    }
  }
  try {
    return mxHosts(await publicResolver().resolveMx(domain))
  } catch {
    return []
  }
}

async function resolveAddressFallback(domain: string): Promise<string[]> {
  try {
    if ((await resolve4(domain)).length) return [domain]
  } catch {
    /* try public / OS lookup */
  }
  try {
    if ((await publicResolver().resolve4(domain)).length) return [domain]
  } catch {
    /* try OS getaddrinfo */
  }
  try {
    await lookup(domain, { family: 4 })
    return [domain]
  } catch {
    return []
  }
}

async function resolveMailHosts(domain: string): Promise<string[]> {
  const hosts = await resolveMxWithFallback(domain)
  if (hosts.length) return hosts
  return resolveAddressFallback(domain)
}

function readReply(socket: Socket, signal: AbortSignal): Promise<{ code: number; text: string }> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const onAbort = () => finish(new Error('Validation stopped'))
    const timer = setTimeout(() => finish(new Error('SMTP command timed out')), COMMAND_TIMEOUT_MS)

    function cleanup() {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      socket.off('data', onData)
      socket.off('error', onError)
      socket.off('close', onClose)
    }

    function finish(error?: Error, value?: { code: number; text: string }) {
      cleanup()
      if (error) reject(error)
      else resolve(value!)
    }

    function onError(error: Error) { finish(error) }
    function onClose() { finish(new Error('SMTP connection closed')) }
    function onData(chunk: Buffer) {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0)
      if (!lines.length) return
      const last = lines[lines.length - 1]
      if (!/^\d{3}[ -]/.test(last)) return
      if (last[3] === '-') return
      const code = Number(last.slice(0, 3))
      if (!Number.isFinite(code)) { finish(new Error('Invalid SMTP reply')); return }
      finish(undefined, { code, text: lines.join('\n') })
    }

    signal.addEventListener('abort', onAbort, { once: true })
    socket.on('data', onData)
    socket.on('error', onError)
    socket.on('close', onClose)
    if (signal.aborted) finish(new Error('Validation stopped'))
  })
}

async function openSmtp(host: string, signal: AbortSignal): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: SMTP_PORT, family: 4 })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`Timed out connecting to ${host}:${SMTP_PORT}`))
    }, CONNECT_TIMEOUT_MS)
    const onAbort = () => {
      clearTimeout(timer)
      socket.destroy()
      reject(new Error('Validation stopped'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    socket.once('connect', () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      socket.setKeepAlive(false)
      resolve(socket)
    })
    socket.once('error', (error) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(error)
    })
    if (signal.aborted) onAbort()
  })
}

async function sendCommand(socket: Socket, command: string, signal: AbortSignal) {
  socket.write(`${command}\r\n`)
  return readReply(socket, signal)
}

async function probeRcpt(email: string, hosts: string[], signal: AbortSignal): Promise<EmailVerifyResult> {
  let lastError = 'SMTP probe could not complete'
  for (const host of hosts.slice(0, 3)) {
    if (signal.aborted) throw new Error('Validation stopped')
    let socket: Socket | undefined
    try {
      socket = await openSmtp(host, signal)
      const banner = await readReply(socket, signal)
      if (banner.code >= 400) {
        lastError = `Mail server ${host} refused the connection (SMTP ${banner.code})`
        socket.destroy()
        continue
      }
      let reply = await sendCommand(socket, `EHLO ${HELO_NAME}`, signal)
      if (reply.code >= 500) reply = await sendCommand(socket, `HELO ${HELO_NAME}`, signal)
      if (reply.code >= 400) {
        lastError = `Mail server ${host} rejected the handshake (SMTP ${reply.code})`
        try { await sendCommand(socket, 'QUIT', signal) } catch { /* ignore */ }
        socket.destroy()
        continue
      }
      reply = await sendCommand(socket, `MAIL FROM:<${FIXED_MAIL_FROM}>`, signal)
      if (reply.code >= 400) {
        const classified = classifySmtpRcptReply(reply.code, reply.text)
        try { await sendCommand(socket, 'QUIT', signal) } catch { /* ignore */ }
        socket.destroy()
        return { email, status: classified.status === 'invalid' ? 'unknown' : classified.status, reason: `MAIL FROM was rejected before RCPT TO (SMTP ${reply.code}). Probe incomplete.`, mxHost: host, smtpCode: reply.code }
      }
      reply = await sendCommand(socket, `RCPT TO:<${email}>`, signal)
      const classified = classifySmtpRcptReply(reply.code, reply.text)
      try { await sendCommand(socket, 'QUIT', signal) } catch { /* ignore */ }
      socket.destroy()
      return { email, status: classified.status, reason: classified.reason, mxHost: host, smtpCode: reply.code }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      socket?.destroy()
      if (signal.aborted || /stopped/i.test(lastError)) throw error instanceof Error ? error : new Error(lastError)
    }
  }
  return probeBlockedResult(email, hosts[0], lastError)
}

async function verifyOne(value: string, mxCache: Map<string, string[]>, signal: AbortSignal): Promise<EmailVerifyResult> {
  const email = normalizeVerifyEmail(value)
  if (!email) return syntaxInvalidResult(value)
  const domain = email.split('@')[1]
  let hosts = mxCache.get(domain)
  if (!hosts) {
    hosts = await resolveMailHosts(domain)
    mxCache.set(domain, hosts)
  }
  if (!hosts.length) return noMxResult(email)
  return probeRcpt(email, hosts, signal)
}

export function abortActiveEmailVerify() {
  activeJob?.controller.abort()
  activeJob = undefined
}

export function registerEmailVerifyIpc() {
  ipcMain.handle('leadsghr:email-verify:start', async (event, input: unknown) => {
    requireOwner(event)
    const { emails } = emailVerifyRequestSchema.parse(input)
    activeJob?.controller.abort()
    const id = randomUUID()
    const controller = new AbortController()
    activeJob = { id, controller }
    const sender = event.sender
    const mxCache = new Map<string, string[]>()
    const results: EmailVerifyResult[] = []

    setTimeout(() => {
      void (async () => {
        try {
          for (let index = 0; index < emails.length; index++) {
            if (controller.signal.aborted) break
            if (index > 0) await delay(DELAY_BETWEEN_CHECKS_MS, controller.signal)
            const result = await verifyOne(emails[index], mxCache, controller.signal)
            results.push(result)
            if (!sender.isDestroyed() && activeJob?.id === id) {
              sender.send('leadsghr:email-verify:event', {
                id,
                index,
                total: emails.length,
                result,
                done: false,
              })
            }
          }
          if (!sender.isDestroyed() && activeJob?.id === id) {
            sender.send('leadsghr:email-verify:event', {
              id,
              index: results.length,
              total: emails.length,
              done: true,
              stopped: controller.signal.aborted,
              results,
            })
          }
        } catch (error) {
          if (!sender.isDestroyed() && activeJob?.id === id) {
            sender.send('leadsghr:email-verify:event', {
              id,
              index: results.length,
              total: emails.length,
              done: true,
              stopped: true,
              error: error instanceof Error ? error.message : String(error),
              results,
            })
          }
        } finally {
          if (activeJob?.id === id) activeJob = undefined
        }
      })()
    }, 0)

    return id
  })

  ipcMain.handle('leadsghr:email-verify:stop', (event, id: unknown) => {
    requireOwner(event)
    const jobId = emailVerifyJobIdSchema.parse(id)
    if (activeJob?.id === jobId) activeJob.controller.abort()
    return true
  })
}
