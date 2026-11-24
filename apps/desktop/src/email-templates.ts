import { BrowserWindow, ipcMain } from 'electron'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  EMAIL_TEMPLATE_LIMIT,
  emailTemplateDraftSchema,
  emailTemplateSchema,
  emailTemplateToMailer,
  emailTemplatesFromMailerFile,
  uniqueEmailTemplates,
  type EmailTemplate,
} from '@leadsghr/schemas'
import { leadsGhrDataFile } from './data-folder'
import { leadsGhrExtensionsDirectory } from './paths'

/**
 * Email templates live in C:\LeadsGhr\data\email-templates.json. Each save also writes
 * C:\LeadsGhr\extensions\leadsghr-mailer\data\templates.json, which LeadsGhr Mailer reads.
 * When the two files differ, the one saved more recently is kept and copied over the other.
 */

export type EmailTemplateStoreResult = {
  templates: EmailTemplate[]
  synced: boolean
}

type StoredFile = {
  list: EmailTemplate[]
  mtime: number
  invalid: boolean
}

const desktopPath = () => leadsGhrDataFile('email-templates.json')
const mailerPath = () =>
  join(leadsGhrExtensionsDirectory(), 'leadsghr-mailer', 'data', 'templates.json')

let writeChain: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task)
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function requireOwner(event: Electron.IpcMainInvokeEvent) {
  if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
}

async function readOptional(path: string): Promise<{ text: string; mtime: number } | null> {
  try {
    const [text, info] = await Promise.all([readFile(path, 'utf8'), stat(path)])
    return { text, mtime: info.mtimeMs }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

function parseDesktop(text: string): { list: EmailTemplate[]; invalid: boolean } {
  try {
    const raw = JSON.parse(text) as unknown
    if (!Array.isArray(raw)) return { list: [], invalid: true }
    const items: EmailTemplate[] = []
    for (const item of raw) {
      const parsed = emailTemplateSchema.safeParse(item)
      if (parsed.success) items.push(parsed.data)
    }
    if (raw.length > 0 && items.length === 0) return { list: [], invalid: true }
    return { list: uniqueEmailTemplates(items), invalid: false }
  } catch {
    return { list: [], invalid: true }
  }
}

async function readDesktop(): Promise<StoredFile | null> {
  const file = await readOptional(desktopPath())
  if (!file) return null
  const parsed = parseDesktop(file.text)
  return { ...parsed, mtime: file.mtime }
}

async function readMailer(): Promise<StoredFile | null> {
  const file = await readOptional(mailerPath())
  if (!file) return null
  try {
    const list = emailTemplatesFromMailerFile(JSON.parse(file.text) as unknown)
    if (!list) return { list: [], mtime: file.mtime, invalid: true }
    return { list, mtime: file.mtime, invalid: false }
  } catch {
    return { list: [], mtime: file.mtime, invalid: true }
  }
}

function sameList(left: EmailTemplate[], right: EmailTemplate[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function writeBoth(list: EmailTemplate[]): Promise<EmailTemplateStoreResult> {
  const templates = uniqueEmailTemplates(list)
  await writeFile(desktopPath(), JSON.stringify(templates, null, 2) + '\n', 'utf8')
  try {
    const path = mailerPath()
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(
      path,
      JSON.stringify(templates.map(emailTemplateToMailer), null, 2) + '\n',
      'utf8',
    )
    return { templates, synced: true }
  } catch (error) {
    console.warn(
      '[LeadsGhr] Could not update LeadsGhr Mailer templates',
      error instanceof Error ? error.message : error,
    )
    return { templates, synced: false }
  }
}

async function loadTemplates(): Promise<EmailTemplateStoreResult> {
  const [desktop, mailer] = await Promise.all([readDesktop(), readMailer()])
  const desktopOk = desktop && !desktop.invalid ? desktop : null
  const mailerOk = mailer && !mailer.invalid ? mailer : null
  if (!desktopOk && !mailerOk) {
    if (desktop?.invalid || mailer?.invalid) {
      throw new Error('Saved templates could not be read.')
    }
    return { templates: [], synced: true }
  }
  if (desktopOk && mailerOk && sameList(desktopOk.list, mailerOk.list)) {
    return { templates: desktopOk.list, synced: true }
  }
  const chosen =
    desktopOk && mailerOk
      ? mailerOk.mtime > desktopOk.mtime
        ? mailerOk.list
        : desktopOk.list
      : (desktopOk?.list ?? mailerOk?.list ?? [])
  return writeBoth(chosen)
}

function rejectDuplicate(list: EmailTemplate[], draft: EmailTemplate) {
  const name = draft.name.toLocaleLowerCase()
  if (list.some((item) => item.id !== draft.id && item.name.toLocaleLowerCase() === name)) {
    throw new Error(`A template named "${draft.name}" already exists.`)
  }
}

async function saveTemplate(input: unknown): Promise<EmailTemplateStoreResult> {
  const parsed = emailTemplateDraftSchema.safeParse(input)
  if (!parsed.success) throw new Error('A template needs a name, subject, and body.')
  const { templates } = await loadTemplates()
  const existing = templates.some((item) => item.id === parsed.data.id)
  if (!existing && templates.length >= EMAIL_TEMPLATE_LIMIT) {
    throw new Error(`The template limit is ${EMAIL_TEMPLATE_LIMIT}.`)
  }
  const draft: EmailTemplate = { ...parsed.data, updatedAt: new Date().toISOString() }
  rejectDuplicate(templates, draft)
  const next = templates.filter((item) => item.id !== draft.id)
  next.push(draft)
  return writeBoth(next)
}

async function deleteTemplate(id: unknown): Promise<EmailTemplateStoreResult> {
  if (typeof id !== 'string' || !id.trim() || id.length > 80) {
    throw new Error('That template could not be found.')
  }
  const { templates } = await loadTemplates()
  if (!templates.some((item) => item.id === id)) {
    throw new Error('That template could not be found.')
  }
  return writeBoth(templates.filter((item) => item.id !== id))
}

export function registerEmailTemplateIpc() {
  ipcMain.handle('leadsghr:email-templates:list', (event) => {
    requireOwner(event)
    return enqueue(loadTemplates)
  })
  ipcMain.handle('leadsghr:email-templates:save', (event, input: unknown) => {
    requireOwner(event)
    return enqueue(() => saveTemplate(input))
  })
  ipcMain.handle('leadsghr:email-templates:delete', (event, id: unknown) => {
    requireOwner(event)
    return enqueue(() => deleteTemplate(id))
  })
}
