import { SENDING_ALARM, type SendingActionResponse, type SendingRequest, type SendingStatusResponse, isSendingRequest } from './messages'
import { parseRange, sliceRecipients } from './range'
import { appendHistory, clearHistory, loadJob, loadSendingPreferences, saveJob } from './storage'
import { renderMessage } from './template'
import { COMPOSE_STEPS, type ComposeResult, type SendJob } from './types'

const MIN_DELAY_MS = 5000
const MAX_DELAY_MS = 120000
const DEFAULT_DELAY_MS = 10000

function clampDelay(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DELAY_MS
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, Math.round(value)))
}

async function touch(job: SendJob, patch: Partial<SendJob>): Promise<SendJob> {
  const next = { ...job, ...patch, updatedAt: Date.now() }
  await saveJob(next)
  return next
}

async function gmailTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ url: ['https://mail.google.com/*', 'https://mail.google.com/mail/*'] })
  const preferred = tabs.find((item) => item.active && typeof item.id === 'number') ?? tabs.find((item) => typeof item.id === 'number')
  if (!preferred?.id) throw new Error('Open Gmail in a Chrome tab before starting a send job.')
  await chrome.tabs.update(preferred.id, { active: true })
  if (preferred.windowId != null) {
    try { await chrome.windows.update(preferred.windowId, { focused: true }) } catch { /* tab focus is enough */ }
  }
  return preferred.id
}

async function ping(tabId: number): Promise<boolean> {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { kind: 'sending:ping' }) as { ok?: boolean } | undefined
    return result?.ok === true
  } catch {
    return false
  }
}

async function ensureContentScript(tabId: number): Promise<void> {
  if (await ping(tabId)) return
  await chrome.scripting.executeScript({ target: { tabId }, files: ['gmail.js'] })
  const started = Date.now()
  while (Date.now() - started < 4000) {
    if (await ping(tabId)) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Open mail.google.com, reload that tab, then start sending again.')
}

async function sendCompose(tabId: number, to: string, subject: string, bodyHtml: string, stepDelayMs: number): Promise<ComposeResult> {
  await ensureContentScript(tabId)
  try {
    return await chrome.tabs.sendMessage(tabId, { kind: 'sending:compose', to, subject, bodyHtml, stepDelayMs }) as ComposeResult
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Could not control Gmail compose. Reload the Gmail tab and try again.')
  }
}

async function schedule(delayMs: number): Promise<void> {
  await chrome.alarms.clear(SENDING_ALARM)
  await chrome.alarms.create(SENDING_ALARM, { when: Date.now() + Math.max(1000, delayMs) })
}

async function processNext(): Promise<void> {
  const job = await loadJob()
  if (!job || job.status !== 'running') return
  if (job.cursor >= job.recipients.length) {
    await touch(job, { status: 'completed', lastError: undefined })
    await chrome.alarms.clear(SENDING_ALARM)
    return
  }
  const recipient = job.recipients[job.cursor]
  const startedAt = Date.now()
  const spread = job.delayMode === 'steps'
  try {
    const tabId = await gmailTabId()
    const rendered = renderMessage(job.template, recipient.fields)
    if (!rendered.subject) throw new Error('Rendered subject is empty.')
    const result = await sendCompose(tabId, recipient.email, rendered.subject, rendered.bodyHtml, spread ? Math.round(job.delayMs / COMPOSE_STEPS) : 0)
    if (!result.ok) throw new Error(result.error)
    await appendHistory({
      id: crypto.randomUUID(),
      jobId: job.id,
      email: recipient.email,
      subject: rendered.subject,
      sentAt: Date.now(),
      status: 'sent',
    })
    const next = await touch(job, { cursor: job.cursor + 1, lastError: undefined })
    if (next.cursor >= next.recipients.length) {
      await touch(next, { status: 'completed' })
      await chrome.alarms.clear(SENDING_ALARM)
      return
    }
    // Between emails: wait the full delay after this send. Spread across steps: this email's steps used most of the
    // delay, so the next email starts once the whole delay has passed since this one began.
    await schedule(spread ? Math.max(500, next.delayMs - (Date.now() - startedAt)) : next.delayMs)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await appendHistory({
      id: crypto.randomUUID(),
      jobId: job.id,
      email: recipient.email,
      subject: renderMessage(job.template, recipient.fields).subject || job.template.subject,
      sentAt: Date.now(),
      status: 'failed',
      error: message,
    })
    await touch(job, { status: 'failed', lastError: message })
    await chrome.alarms.clear(SENDING_ALARM)
  }
}

async function start(request: Extract<SendingRequest, { kind: 'sending:start' }>): Promise<SendJob> {
  const existing = await loadJob()
  if (existing?.status === 'running') throw new Error('A send job is already running. Pause or cancel it first.')
  const range = parseRange(String(request.range.from), String(request.range.to), request.recipients.length)
  const recipients = sliceRecipients(request.recipients, range)
  if (!recipients.length) throw new Error('Selected range has no recipients.')
  if (!request.template.subject.trim() || !request.template.bodyHtml.trim()) throw new Error('Template subject and body are required.')
  const job: SendJob = {
    id: crypto.randomUUID(),
    status: 'running',
    template: {
      subject: request.template.subject.trim(),
      bodyHtml: request.template.bodyHtml.trim(),
    },
    recipients,
    cursor: 0,
    delayMs: clampDelay(request.delayMs),
    delayMode: (await loadSendingPreferences()).delayMode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await saveJob(job)
  await schedule(500)
  return job
}

export async function handleSendingMessage(message: SendingRequest): Promise<SendingActionResponse | SendingStatusResponse> {
  if (message.kind === 'sending:status') return { ok: true, job: await loadJob() }
  if (message.kind === 'sending:clear-history') {
    await clearHistory()
    return { ok: true, job: await loadJob() }
  }
  if (message.kind === 'sending:pause') {
    const job = await loadJob()
    if (!job || job.status !== 'running') throw new Error('No running send job to pause.')
    await chrome.alarms.clear(SENDING_ALARM)
    return { ok: true, job: await touch(job, { status: 'paused' }) }
  }
  if (message.kind === 'sending:resume') {
    const job = await loadJob()
    if (!job || job.status !== 'paused') throw new Error('No paused send job to resume.')
    const next = await touch(job, { status: 'running', lastError: undefined })
    await schedule(500)
    return { ok: true, job: next }
  }
  if (message.kind === 'sending:cancel') {
    const job = await loadJob()
    if (!job || (job.status !== 'running' && job.status !== 'paused')) throw new Error('No active send job to cancel.')
    await chrome.alarms.clear(SENDING_ALARM)
    return { ok: true, job: await touch(job, { status: 'cancelled' }) }
  }
  if (message.kind === 'sending:start') return { ok: true, job: await start(message) }
  throw new Error('Unsupported sending message.')
}

export function registerSendingRuntime(): void {
  void chrome.storage.local.remove('gmailTemplates')
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SENDING_ALARM) void processNext()
  })
  chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
    if (!isSendingRequest(message) || message.kind === 'sending:compose') return
    void handleSendingMessage(message)
      .then(respond)
      .catch((error) => respond({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    return true
  })
}
