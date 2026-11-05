import Database from 'better-sqlite3'
import { request, Agent, buildConnector } from 'undici'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'
import { app } from 'electron'
import { leadSchema } from '@leadsghr/schemas'
import type { PlatformAdapters, HttpResponse } from '@leadsghr/platform'

export function publicIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19].includes(b)))
  }
  if (isIP(address) !== 6) return false
  const s = address.toLowerCase()
  if (s.includes('.')) return publicIp(s.slice(s.lastIndexOf(':') + 1))
  return s !== '::' && s !== '::1' && !/^f[cd]/.test(s) && !/^fe[89ab]/.test(s) && !s.startsWith('2001:db8:')
}

async function getPublic(url: string, options: { maxBytes?: number; timeoutMs?: number } = {}, redirects = 0): Promise<HttpResponse> {
  if (redirects > 5) throw new Error('Too many redirects')
  const target = new URL(url)
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Only public HTTP(S) URLs are allowed')
  const addresses = await lookup(target.hostname, { all: true })
  if (!addresses.length || addresses.some(({ address }) => !publicIp(address))) throw new Error('Private or local network target blocked')
  const pinned = addresses[0]
  const dispatcher = new Agent({ connect: buildConnector({ lookup: (_host, opts, cb) => {
    if (opts.all) cb(null, [pinned])
    else cb(null, pinned.address, pinned.family)
  } }) })
  try {
    const response = await request(target.toString(), {
      dispatcher, headersTimeout: options.timeoutMs ?? 15000, bodyTimeout: options.timeoutMs ?? 15000,
      headers: { 'user-agent': app.userAgentFallback || 'Mozilla/5.0', accept: 'text/html,text/plain;q=0.9,*/*;q=0.1' },
    })
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      await response.body.dump()
      return getPublic(new URL(String(response.headers.location), target).toString(), options, redirects + 1)
    }
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > (options.maxBytes ?? 2_000_000)) throw new Error('Page exceeds size limit')
      chunks.push(chunk)
    }
    const encoded = Buffer.concat(chunks)
    const encoding = String(response.headers['content-encoding'] ?? '').toLowerCase().trim()
    const limit = options.maxBytes ?? 2_000_000
    const decoded = encoding === 'gzip' || encoding === 'x-gzip' ? gunzipSync(encoded, { maxOutputLength: limit })
      : encoding === 'deflate' ? inflateSync(encoded, { maxOutputLength: limit })
      : encoding === 'br' ? brotliDecompressSync(encoded, { maxOutputLength: limit })
      : encoded
    return { url: target.toString(), status: response.statusCode, contentType: String(response.headers['content-type'] ?? ''), body: decoded.toString('utf8') }
  } finally { await dispatcher.close() }
}

export const desktopHttp = { get: getPublic }

export function createDesktopAdapters(db: Database.Database, dataDirectory: string): PlatformAdapters {
  db.pragma('journal_mode = WAL')
  db.exec(`CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS leads_org_idx ON leads(org_id, updated_at);
    CREATE TABLE IF NOT EXISTS scan_runs (id TEXT PRIMARY KEY, url TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, result_json TEXT, error TEXT);
    CREATE TABLE IF NOT EXISTS local_jobs (id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);`)
  return {
    kind: 'desktop',
    storage: {
      async saveLead(input) {
        const lead = leadSchema.parse({ ...input, id: input.id ?? randomUUID() })
        db.prepare('INSERT INTO leads (id,org_id,payload,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').run(lead.id, lead.orgId, JSON.stringify(lead), new Date().toISOString())
        return lead
      },
      async getLead(orgId, id) {
        const row = db.prepare('SELECT payload FROM leads WHERE org_id=? AND id=?').get(orgId, id) as { payload: string } | undefined
        return row ? leadSchema.parse(JSON.parse(row.payload)) : null
      },
      async listLeads(orgId, limit) {
        const rows = db.prepare('SELECT payload FROM leads WHERE org_id=? ORDER BY updated_at DESC LIMIT ?').all(orgId, Math.max(1, Math.min(limit, 1000))) as { payload: string }[]
        return rows.map(row => leadSchema.parse(JSON.parse(row.payload)))
      },
    },
    http: desktopHttp,
    queue: { async enqueue(name, payload) {
      const id = randomUUID()
      db.prepare('INSERT INTO local_jobs VALUES (?,?,?,?,?)').run(id, name, JSON.stringify(payload), 'queued', new Date().toISOString())
      return id
    } },
    files: { async save(name, bytes) {
      const directory = join(dataDirectory, 'exports')
      await mkdir(directory, { recursive: true })
      const path = join(directory, basename(name))
      await writeFile(path, bytes)
      return path
    } },
  }
}




