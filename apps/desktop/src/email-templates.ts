import { BrowserWindow, ipcMain } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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
 * Email templates are saved only in the LeadsGhr Mailer data folder:
 * C:\LeadsGhr\extensions\leadsghr-mailer\data\templates.json.
 * The Mailer popup and settings page read that file. An older desktop copy at
 * C:\LeadsGhr\data\email-templates.json is imported once, and only when the Mailer file is missing.
 */

export type EmailTemplateStoreResult = {
  templates: EmailTemplate[]
  synced: boolean
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

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
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

async function readMailer(): Promise<{ list: EmailTemplate[]; invalid: boolean } | null> {
  const text = await readOptional(mailerPath())
  if (text === null) return null
  try {
    const list = emailTemplatesFromMailerFile(JSON.parse(text) as unknown)
    if (!list) return { list: [], invalid: true }
    return { list, invalid: false }
  } catch {
    return { list: [], invalid: true }
  }
}

async function writeMailer(list: EmailTemplate[]): Promise<EmailTemplateStoreResult> {
  const templates = uniqueEmailTemplates(list)
  const path = mailerPath()
  try {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(
      path,
      JSON.stringify(templates.map(emailTemplateToMailer), null, 2) + '\n',
      'utf8',
    )
  } catch (error) {
    console.warn(
      '[LeadsGhr] Could not save LeadsGhr Mailer templates',
      error instanceof Error ? error.message : error,
    )
    throw new Error('Templates could not be saved for LeadsGhr Mailer.')
  }
  return { templates, synced: true }
}

async function loadTemplates(): Promise<EmailTemplateStoreResult> {
  const mailer = await readMailer()
  if (mailer) {
    if (mailer.invalid) throw new Error('Saved templates could not be read.')
    return { templates: mailer.list, synced: true }
  }
  const legacy = await readOptional(desktopPath())
  if (legacy !== null) {
    const parsed = parseDesktop(legacy)
    if (parsed.invalid) throw new Error('Saved templates could not be read.')
    return writeMailer(parsed.list)
  }
  return writeMailer([])
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
  return writeMailer(next)
}

async function deleteTemplate(id: unknown): Promise<EmailTemplateStoreResult> {
  if (typeof id !== 'string' || !id.trim() || id.length > 80) {
    throw new Error('That template could not be found.')
  }
  const { templates } = await loadTemplates()
  if (!templates.some((item) => item.id === id)) {
    throw new Error('That template could not be found.')
  }
  return writeMailer(templates.filter((item) => item.id !== id))
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
