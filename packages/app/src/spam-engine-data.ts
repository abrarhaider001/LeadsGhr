import catalog from '../data/spam-rules.json'

export const SUBJECT_LIMIT = 120
export const BODY_LIMIT = 10000
type Field = 'Subject' | 'Body'
type Severity = 'high' | 'medium' | 'low'
type Rule = { phrase: string; category: string; weight: number; replacement: string; manualReview?: boolean }
export type SpamFinding = { id: string; location: Field; title: string; detail: string; severity: Severity; points: number; excerpt?: string; start?: number; end?: number; replacement?: string }
export type SpamAnalysis = { score: number; level: 'Low' | 'Moderate' | 'High'; findings: SpamFinding[]; phraseMatches: number; linkCount: number }
export type SpamDraft = { subject: string; body: string }
export type RewriteSuggestion = SpamDraft & { changes: string[]; before: SpamAnalysis; after: SpamAnalysis }
export type AttachmentMeta = { filename: string; sizeKb: number }

const rules = (catalog.triggers as Rule[]).slice().sort((a, b) => b.phrase.length - a.phrase.length)
const safeAcronyms = new Set((catalog.safe_acronyms as string[]).map((word) => word.toUpperCase()))
const shorteners = new Set((catalog.url_shorteners as string[]).map((domain) => domain.toLowerCase()))
const labels = catalog.categories as Record<string, { label: string }>
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const templateSpans = (text: string) => [...text.matchAll(/\{\{[^{}]*\}\}/g)].map((match) => [match.index, match.index + match[0].length] as const)
const urlSpans = (text: string) => [...text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)].map((match) => [match.index, match.index + match[0].length] as const)
const overlaps = (start: number, end: number, spans: readonly (readonly [number, number])[]) => spans.some(([a, b]) => start < b && end > a)
const urlMatches = (text: string) => [...text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)].map((match) => match[0].replace(/[.,!?;:]+$/, ''))
const severity = (points: number): Severity => points >= 18 ? 'high' : points >= 8 ? 'medium' : 'low'

function phraseFindings(text: string, location: Field): SpamFinding[] {
  const used = [...templateSpans(text), ...urlSpans(text)].map(([start, end]) => [start, end] as const)
  const found: SpamFinding[] = []
  for (const rule of rules) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped(rule.phrase)}(?![\\p{L}\\p{N}_])`, 'giu')
    for (const match of text.matchAll(pattern)) {
      const start = match.index
      const end = start + match[0].length
      if (overlaps(start, end, used)) continue
      used.push([start, end])
      const points = Math.round(rule.weight * (location === 'Subject' ? catalog.thresholds.subject_multiplier : 1) * 10) / 10
      found.push({ id: `${location}-${start}-${end}`, location, title: labels[rule.category]?.label ?? rule.category, detail: rule.manualReview ? 'Review this claim and its destination manually. Wording changes alone cannot make a deceptive message safe.' : `Consider a more specific, natural phrase. Suggested: “${rule.replacement}”.`, severity: severity(points), points, excerpt: match[0], start, end, replacement: rule.manualReview ? undefined : rule.replacement })
    }
  }
  return found.sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
}

export function analyzeSpam(subject: string, body: string, attachments: AttachmentMeta[] = []): SpamAnalysis {
  const findings = [...phraseFindings(subject, 'Subject'), ...phraseFindings(body, 'Body')]
  const add = (location: Field, title: string, detail: string, points: number, excerpt?: string) => findings.push({ id: `${location}-${title}-${findings.length}`, location, title, detail, severity: severity(points), points, excerpt })
  for (const [field, text] of [['Subject', subject], ['Body', body]] as const) {
    const clean = text.replace(/\{\{[^{}]*\}\}/g, '').replace(/(?:https?:\/\/|www\.)[^\s<>"']+/gi, '')
    const caps = (clean.match(/\b[A-Z]{2,}\b/g) ?? []).filter((word) => !safeAcronyms.has(word))
    if (caps.length >= (field === 'Subject' ? 1 : 2)) add(field, 'ALL CAPS words', 'Use normal case; familiar business acronyms are ignored.', Math.min(field === 'Subject' ? 20 : 16, caps.length * (field === 'Subject' ? 8 : 4)), caps.slice(0, 4).join(', '))
    if (/!{2,}|\?{2,}/.test(clean)) add(field, 'Repeated punctuation', 'Reduce repeated exclamation or question marks.', 14)
    if (/\${2,}/.test(clean)) add(field, 'Repeated currency signs', 'Remove decorative dollar signs.', 16)
  }
  if (!subject.trim()) add('Subject', 'Missing subject', 'Add a clear subject.', 9)
  else if (subject.trim().split(/\s+/).length > catalog.thresholds.max_subject_words) add('Subject', 'Long subject', `Aim for ${catalog.thresholds.max_subject_words} words or fewer when practical.`, 8)
  if (!body.trim()) add('Body', 'Missing message', 'Add a message before sending.', 18)
  const links = [...new Set(urlMatches(body))]
  if (links.length > catalog.thresholds.max_cold_email_links) add('Body', 'Multiple links', 'A first-touch message is easier to assess when it has only necessary links.', (links.length - catalog.thresholds.max_cold_email_links) * 12)
  for (const link of links) {
    try {
      const parsed = new URL(link.startsWith('www.') ? `http://${link}` : link)
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
      if (shorteners.has(host)) add('Body', 'Shortened link', 'A shortened URL hides its destination; use a clear, direct link.', 22, link)
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) add('Body', 'IP-address link', 'A direct IP link gives little context about its destination.', 25, link)
      if (parsed.protocol === 'http:') add('Body', 'HTTP link', 'Check whether this destination supports HTTPS; do not change the URL without verifying it.', 8, link)
    } catch { /* Invalid links are left untouched for manual review. */ }
  }
  for (const attachment of attachments) {
    add('Body', 'Attachment included', 'Consider whether the attachment is necessary for a first message.', 10, attachment.filename)
    if (attachment.sizeKb > catalog.thresholds.max_attachment_kb) add('Body', 'Large attachment', `This attachment exceeds ${catalog.thresholds.max_attachment_kb} KB.`, 15, attachment.filename)
  }
  const raw = findings.reduce((sum, item) => sum + item.points, 0)
  const personalization = /\{\{[a-zA-Z0-9_]+\}\}/.test(`${subject} ${body}`)
  const score = Math.min(100, Math.max(0, Math.round((raw > 0 && personalization ? raw - 4 : raw) * 10) / 10))
  return { score, level: score > 50 ? 'High' : score > 20 ? 'Moderate' : 'Low', findings, phraseMatches: findings.filter((item) => item.start !== undefined).length, linkCount: links.length }
}

function rewriteField(text: string, field: Field, changes: string[]): string {
  const matches = phraseFindings(text, field).filter((item) => item.start !== undefined && item.end !== undefined && item.replacement !== undefined)
  let next = text
  for (const match of matches.reverse()) {
    const original = next.slice(match.start!, match.end!)
    let replacement = match.replacement!
    if (/^[A-Z]/.test(original) && !/^[A-Z]{2,}/.test(original)) replacement = replacement[0]?.toUpperCase() + replacement.slice(1)
    next = next.slice(0, match.start!) + replacement + next.slice(match.end!)
    changes.push(`${field}: “${original}” → “${replacement}”`)
  }
  const protectedText = new Map<string, string>()
  next = next.replace(/\{\{[^{}]*\}\}|(?:https?:\/\/|www\.)[^\s<>"']+/gi, (value) => { const key = `__leadsghr_protected_${protectedText.size}__`; protectedText.set(key, value); return key })
  const normalized = next.replace(/\b[A-Z]{2,}\b/g, (word) => safeAcronyms.has(word) ? word : field === 'Subject' ? word[0] + word.slice(1).toLowerCase() : word.toLowerCase())
  if (normalized !== next) changes.push(`${field}: normalized capitalized words`)
  next = normalized.replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?').replace(/\${2,}/g, '$').replace(/[ \t]{2,}/g, ' ').trim()
  if (next !== normalized.trim()) changes.push(`${field}: cleaned repeated punctuation or spacing`)
  for (const [key, value] of protectedText) next = next.replace(key, value)
  if (field === 'Subject' && next) next = next[0].toUpperCase() + next.slice(1)
  return next
}

export function rewriteSpamDraft(subject: string, body: string, attachments: AttachmentMeta[] = []): RewriteSuggestion {
  const changes: string[] = []
  const nextSubject = rewriteField(subject, 'Subject', changes)
  const nextBody = rewriteField(body, 'Body', changes)
  return { subject: nextSubject.slice(0, SUBJECT_LIMIT), body: nextBody.slice(0, BODY_LIMIT), changes, before: analyzeSpam(subject, body, attachments), after: analyzeSpam(nextSubject, nextBody, attachments) }
}
