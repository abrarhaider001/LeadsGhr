import { connect, type Socket } from 'node:net'
import { connect as tlsConnect } from 'node:tls'

export type Reply = { code: number; text: string }

export class SmtpError extends Error {
  constructor(
    readonly kind: 'timeout' | 'closed' | 'connect' | 'stopped',
    message: string,
  ) {
    super(message)
  }
}

export const isStop = (error: unknown) => error instanceof SmtpError && error.kind === 'stopped'

export class SmtpConn {
  extensions = new Set<string>()
  secure = false
  private buf = ''
  private partial: string[] = []
  private ready: Reply[] = []
  private waiter?: {
    ok: (reply: Reply) => void
    bad: (error: Error) => void
    timer: NodeJS.Timeout
  }
  private failure?: SmtpError

  private constructor(
    private sock: Socket,
    readonly host: string,
    private signal: AbortSignal,
  ) {
    this.attach(sock)
    signal.addEventListener('abort', this.onAbort, { once: true })
  }

  static open(host: string, signal: AbortSignal, ms = 8000): Promise<SmtpConn> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new SmtpError('stopped', 'Validation stopped'))
      const sock = connect({ host, port: 25, family: 4 })
      const timer = setTimeout(() => {
        sock.destroy()
        reject(new SmtpError('connect', `Timed out connecting to ${host}`))
      }, ms)
      sock.once('connect', () => {
        clearTimeout(timer)
        sock.removeAllListeners('error')
        resolve(new SmtpConn(sock, host, signal))
      })
      sock.once('error', (error) => {
        clearTimeout(timer)
        reject(new SmtpError('connect', error.message))
      })
    })
  }

  static async connect(host: string, helo: string, signal: AbortSignal): Promise<SmtpConn> {
    const conn = await SmtpConn.open(host, signal)
    try {
      const banner = await conn.read(8000)
      if (banner.code !== 220) throw new SmtpError('closed', `Refused (${banner.code})`)
      const hello = await conn.hello(helo)
      if (hello.code >= 400) throw new SmtpError('closed', `Handshake failed (${hello.code})`)
      if (conn.extensions.has('STARTTLS') && !conn.secure) await conn.startTls(helo)
      return conn
    } catch (error) {
      conn.close()
      throw error
    }
  }

  private attach(sock: Socket) {
    sock.on('data', this.onData)
    sock.on('error', this.onErr)
    sock.on('close', this.onClose)
  }

  private detach(sock: Socket) {
    sock.off('data', this.onData)
    sock.off('error', this.onErr)
    sock.off('close', this.onClose)
  }

  private onData = (chunk: Buffer) => {
    this.buf += chunk.toString('latin1')
    let nl: number
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl).replace(/\r$/, '')
      this.buf = this.buf.slice(nl + 1)
      this.partial.push(line)
      if (/^\d{3}(?: |$)/.test(line)) {
        this.ready.push({ code: Number(line.slice(0, 3)), text: this.partial.join('\n') })
        this.partial = []
      }
    }
    if (this.waiter && this.ready.length) {
      const waiter = this.waiter
      this.waiter = undefined
      clearTimeout(waiter.timer)
      waiter.ok(this.ready.shift()!)
    }
  }

  private onErr = (error: Error) => this.fail(new SmtpError('closed', error.message))
  private onClose = () => this.fail(new SmtpError('closed', 'SMTP connection closed'))
  private onAbort = () => {
    this.fail(new SmtpError('stopped', 'Validation stopped'))
    this.sock.destroy()
  }

  private fail(error: SmtpError) {
    this.failure ??= error
    if (this.waiter) {
      const waiter = this.waiter
      this.waiter = undefined
      clearTimeout(waiter.timer)
      waiter.bad(this.failure)
    }
  }

  get alive() {
    return !this.failure && !this.sock.destroyed
  }

  read(ms = 10_000): Promise<Reply> {
    if (this.ready.length) return Promise.resolve(this.ready.shift()!)
    if (this.failure) return Promise.reject(this.failure)
    return new Promise((ok, bad) => {
      const timer = setTimeout(() => {
        this.fail(new SmtpError('timeout', 'SMTP command timed out'))
        this.sock.destroy()
      }, ms)
      this.waiter = { ok, bad, timer }
    })
  }

  async cmd(line: string, ms?: number): Promise<Reply> {
    if (this.failure) throw this.failure
    this.sock.write(`${line}\r\n`)
    return this.read(ms)
  }

  async hello(name: string): Promise<Reply> {
    let reply = await this.cmd(`EHLO ${name}`)
    if (reply.code >= 500) reply = await this.cmd(`HELO ${name}`)
    this.extensions = new Set(
      reply.text
        .split('\n')
        .map((line) =>
          line
            .replace(/^\d{3}[ -]/, '')
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    )
    return reply
  }

  async startTls(name: string): Promise<Reply> {
    const reply = await this.cmd('STARTTLS')
    if (reply.code !== 220) return reply
    this.detach(this.sock)
    const secure = tlsConnect({
      socket: this.sock,
      servername: this.host,
      rejectUnauthorized: false,
    })
    this.sock = secure
    this.buf = ''
    this.partial = []
    this.ready = []
    this.failure = undefined
    this.attach(secure)
    await new Promise<void>((ok, bad) => {
      const timer = setTimeout(() => bad(new SmtpError('timeout', 'TLS handshake timed out')), 8000)
      secure.once('secureConnect', () => {
        clearTimeout(timer)
        ok()
      })
      secure.once('error', (error) => {
        clearTimeout(timer)
        bad(new SmtpError('closed', error.message))
      })
    })
    this.secure = true
    return this.hello(name)
  }

  async quit() {
    try {
      await this.cmd('QUIT', 3000)
    } catch {}
    this.close()
  }

  close() {
    this.signal.removeEventListener('abort', this.onAbort)
    this.detach(this.sock)
    this.sock.destroy()
  }
}
