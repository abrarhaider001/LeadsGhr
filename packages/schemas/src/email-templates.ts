import { z } from 'zod'

/** Saved email templates. The desktop page and LeadsGhr Mailer share these records. */
export const EMAIL_TEMPLATE_LIMIT = 200

const HTML_TAG = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i

/** True when the body contains an HTML tag, which LeadsGhr Mailer sends as HTML. */
export function emailBodyLooksLikeHtml(body: string): boolean {
  return HTML_TAG.test(body)
}

export const emailTemplateSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  format: z.enum(['plain', 'html']),
  body: z.string().trim().min(1).max(200_000),
  updatedAt: z.string().datetime(),
})
export type EmailTemplate = z.infer<typeof emailTemplateSchema>

export const emailTemplateDraftSchema = emailTemplateSchema.omit({ updatedAt: true })
export type EmailTemplateDraft = z.infer<typeof emailTemplateDraftSchema>

export function sortEmailTemplates(list: EmailTemplate[]): EmailTemplate[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

/** One row per id. A later updatedAt replaces an earlier copy of the same id. */
export function uniqueEmailTemplates(list: EmailTemplate[]): EmailTemplate[] {
  const byId = new Map<string, EmailTemplate>()
  for (const item of list) {
    const current = byId.get(item.id)
    if (!current || Date.parse(item.updatedAt) >= Date.parse(current.updatedAt)) {
      byId.set(item.id, item)
    }
  }
  return sortEmailTemplates([...byId.values()]).slice(0, EMAIL_TEMPLATE_LIMIT)
}

const mailerTemplateSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(200_000),
  updatedAt: z.number().finite().nonnegative(),
  format: z.enum(['plain', 'html']).optional(),
})

/** Maps one Mailer `templates.json` row. Null when the row is not a usable template. */
export function emailTemplateFromMailer(input: unknown): EmailTemplate | null {
  const parsed = mailerTemplateSchema.safeParse(input)
  if (!parsed.success) return null
  const updated = new Date(parsed.data.updatedAt)
  if (Number.isNaN(updated.getTime())) return null
  const template = emailTemplateSchema.safeParse({
    id: parsed.data.id,
    name: parsed.data.name,
    subject: parsed.data.subject,
    format: parsed.data.format ?? (emailBodyLooksLikeHtml(parsed.data.bodyHtml) ? 'html' : 'plain'),
    body: parsed.data.bodyHtml,
    updatedAt: updated.toISOString(),
  })
  return template.success ? template.data : null
}

/**
 * Reads a Mailer templates file. Returns null when the file is not a list, or when every row is
 * unusable, so a bad file is not treated as "no templates".
 */
export function emailTemplatesFromMailerFile(input: unknown): EmailTemplate[] | null {
  if (!Array.isArray(input)) return null
  const items: EmailTemplate[] = []
  for (const item of input) {
    const template = emailTemplateFromMailer(item)
    if (template) items.push(template)
  }
  if (input.length > 0 && items.length === 0) return null
  return uniqueEmailTemplates(items)
}

/** The shape LeadsGhr Mailer reads from `data/templates.json`. */
export function emailTemplateToMailer(template: EmailTemplate) {
  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    bodyHtml: template.body,
    format: template.format,
    updatedAt: Date.parse(template.updatedAt),
  }
}
