import { BrowserWindow, ipcMain, shell } from 'electron'
import { createServer, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { localTrackingCreateSchema, localTrackingIdSchema, type LocalTrackingRecord } from '@leadsghr/schemas'

const pixel = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64')
let server: Server | undefined
let port = 0

function requireWindow(event: Electron.IpcMainInvokeEvent) {
  if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
}

export async function registerLocalEmailTracking(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS local_email_tracking (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    created_at TEXT NOT NULL,
    first_opened_at TEXT,
    last_opened_at TEXT,
    open_count INTEGER NOT NULL DEFAULT 0
  )`)

  server = createServer((request, response) => {
    const preview = /^\/preview\/([a-f0-9-]{36})$/.exec(request.url ?? '')
    if (preview && request.method === 'GET') {
      const html = previews.get(preview[1])
      if (!html) { response.writeHead(404).end(); return }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html)
      return
    }
    const match = /^\/pixel\/([a-f0-9-]{36})\.gif$/.exec(request.url ?? '')
    if (!match || request.method !== 'GET') {
      response.writeHead(404).end()
      return
    }
    const updatedAt = new Date().toISOString()
    const changed = db.prepare(`UPDATE local_email_tracking
      SET first_opened_at = COALESCE(first_opened_at, ?), last_opened_at = ?, open_count = open_count + 1
      WHERE token = ?`).run(updatedAt, updatedAt, match[1])
    response.writeHead(changed.changes ? 200 : 404, {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, max-age=0',
      'Content-Length': changed.changes ? pixel.length : 0,
    }).end(changed.changes ? pixel : undefined)
  })
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject)
    server!.listen(0, '127.0.0.1', () => {
      server!.off('error', reject)
      const address = server!.address()
      if (!address || typeof address === 'string') return reject(new Error('Local tracking listener did not start'))
      port = address.port
      resolve()
    })
  })

  ipcMain.handle('leadsghr:tracking:create', (event, input: unknown) => {
    requireWindow(event)
    const { recipient, subject } = localTrackingCreateSchema.parse(input)
    const id = randomUUID()
    db.prepare('INSERT INTO local_email_tracking (id, token, recipient, subject, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, randomUUID(), recipient, subject, new Date().toISOString())
    return id
  })
  ipcMain.handle('leadsghr:tracking:list', (event): LocalTrackingRecord[] => {
    requireWindow(event)
    return db.prepare(`SELECT id, recipient, subject, created_at AS createdAt,
      first_opened_at AS firstOpenedAt, last_opened_at AS lastOpenedAt, open_count AS openCount
      FROM local_email_tracking ORDER BY created_at DESC LIMIT 200`).all() as LocalTrackingRecord[]
  })
  ipcMain.handle('leadsghr:tracking:preview', async (event, input: unknown) => {
    requireWindow(event)
    const id = localTrackingIdSchema.parse(input)
    const row = db.prepare('SELECT token FROM local_email_tracking WHERE id = ?').get(id) as { token: string } | undefined
    if (!row) throw new Error('Tracking record not found')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>LeadsGhr tracking test</title></head><body><h1>Local tracking preview</h1><p>Opening this page requests the test pixel.</p><img src="/pixel/${row.token}.gif" width="1" height="1" alt=""></body></html>`
    // Serve the preview on the same loopback listener, with the opaque token as its path.
    previews.set(row.token, html)
    await shell.openExternal(`http://127.0.0.1:${port}/preview/${row.token}`)
  })
  ipcMain.handle('leadsghr:tracking:delete', (event, input: unknown) => {
    requireWindow(event)
    const id = localTrackingIdSchema.parse(input)
    const row = db.prepare('SELECT token FROM local_email_tracking WHERE id = ?').get(id) as { token: string } | undefined
    if (!row) return false
    db.prepare('DELETE FROM local_email_tracking WHERE id = ?').run(id)
    previews.delete(row.token)
    return true
  })
}

const previews = new Map<string, string>()

export function closeLocalEmailTracking() {
  server?.close()
  server = undefined
  previews.clear()
}
