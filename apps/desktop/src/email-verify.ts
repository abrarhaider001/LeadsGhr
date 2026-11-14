import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { EmailVerifyResult } from '@leadsghr/quality'
import { emailVerifyJobIdSchema, emailVerifyRequestSchema } from '@leadsghr/schemas'
import { createEmailVerifyCache } from './email-verify/cache'
import { preflight, verifyPipeline } from './email-verify/pipeline'

type ActiveJob = { id: string; controller: AbortController }

let activeJob: ActiveJob | undefined

function requireOwner(event: Electron.IpcMainInvokeEvent) {
  if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
}

export function abortActiveEmailVerify() {
  activeJob?.controller.abort()
  activeJob = undefined
}

export function registerEmailVerifyIpc(db: Database.Database) {
  const cache = createEmailVerifyCache(db)

  ipcMain.handle('leadsghr:email-verify:start', async (event, input: unknown) => {
    requireOwner(event)
    const parsed = emailVerifyRequestSchema.parse(input)
    const mailFrom = /@(?:localhost|.+\.invalid)$/i.test(parsed.mailFrom) ? 'verify@example.com' : parsed.mailFrom
    const ehlo = /^(?:localhost|.*\.invalid)$/i.test(parsed.ehlo) ? 'verify.example.com' : parsed.ehlo
    const { emails, concurrency, perSession, paceMs } = parsed
    activeJob?.controller.abort()
    const id = randomUUID()
    const controller = new AbortController()
    activeJob = { id, controller }
    const sender = event.sender

    setTimeout(() => {
      void (async () => {
        const slots: Array<EmailVerifyResult | undefined> = Array.from({ length: emails.length })
        let completed = 0
        try {
          if (!await preflight(controller.signal)) {
            if (!sender.isDestroyed() && activeJob?.id === id) {
              sender.send('leadsghr:email-verify:event', {
                id,
                index: 0,
                completed: 0,
                total: emails.length,
                done: true,
                error: 'Port 25 is blocked on this network. Use another network or a VPS/API fallback.',
                results: [],
              })
            }
            return
          }

          await verifyPipeline(
            emails,
            { mailFrom, ehlo, perSession, paceMs, workers: concurrency },
            controller.signal,
            (result, index) => {
              slots[index] = result
              completed += 1
              if (!sender.isDestroyed() && activeJob?.id === id) {
                sender.send('leadsghr:email-verify:event', {
                  id,
                  index,
                  completed,
                  total: emails.length,
                  result,
                  done: false,
                })
              }
            },
            cache,
          )

          if (!sender.isDestroyed() && activeJob?.id === id) {
            const results = slots.filter((item): item is EmailVerifyResult => item !== undefined)
            sender.send('leadsghr:email-verify:event', {
              id,
              index: results.length,
              completed: results.length,
              total: emails.length,
              done: true,
              stopped: controller.signal.aborted,
              results,
            })
          }
        } catch (error) {
          if (!sender.isDestroyed() && activeJob?.id === id) {
            const results = slots.filter((item): item is EmailVerifyResult => item !== undefined)
            sender.send('leadsghr:email-verify:event', {
              id,
              index: results.length,
              completed: results.length,
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
