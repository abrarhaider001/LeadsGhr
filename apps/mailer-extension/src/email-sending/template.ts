import type { Template } from './types'

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_ -]+)\s*\}\}/g

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function lookup(fields: Record<string, string>, key: string): string {
  return fields[key] ?? fields[key.toLowerCase()] ?? fields[key.trim()] ?? ''
}

export function renderText(template: string, fields: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (_, key: string) => lookup(fields, key.trim()))
}

export function renderHtml(template: string, fields: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (_, key: string) => escapeHtml(lookup(fields, key.trim())))
}

const HTML_TAG = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i

/** True when a template body has no HTML tags, so it is sent as plain text. */
export function isPlainText(body: string): boolean {
  return !HTML_TAG.test(body)
}

/** Plain text for Gmail's editor: escaped, one <div> per line (blank lines kept), like text typed in Gmail. */
function textToHtml(text: string): string {
  return text.replace(/\r\n?/g, '\n').split('\n').map((line) => `<div>${line ? escapeHtml(line) : '<br>'}</div>`).join('')
}

export function renderMessage(template: Template, fields: Record<string, string>): Template {
  return {
    subject: renderText(template.subject, fields).trim(),
    bodyHtml: isPlainText(template.bodyHtml) ? textToHtml(renderText(template.bodyHtml, fields)) : renderHtml(template.bodyHtml, fields),
  }
}

export function readTemplateFile(file: File): Promise<Template> {
  return file.text().then((text) => {
    const trimmed = text.trim()
    if (!trimmed) throw new Error('Template file is empty.')
    if (file.name.toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(trimmed) as { subject?: unknown; bodyHtml?: unknown; body?: unknown }
      const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : ''
      const bodyHtml = typeof parsed.bodyHtml === 'string' ? parsed.bodyHtml : typeof parsed.body === 'string' ? parsed.body : ''
      if (!subject || !bodyHtml.trim()) throw new Error('JSON template needs subject and bodyHtml.')
      return { subject, bodyHtml }
    }
    const match = /^Subject:\s*(.+)\r?\n\r?\n([\s\S]+)$/i.exec(trimmed)
    if (match) return { subject: match[1].trim(), bodyHtml: match[2].trim() }
    return { subject: 'Hello', bodyHtml: trimmed }
  })
}
