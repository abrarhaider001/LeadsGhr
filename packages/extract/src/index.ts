import * as cheerio from 'cheerio'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export interface ExtractedContacts {
  emails: string[]
  phones: string[]
  socialUrls: string[]
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const EMAIL_VALUE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
const SOCIAL = /(?:linkedin\.com|facebook\.com|instagram\.com|x\.com)\//i
const RENDERED_EMAIL =
  /\b[a-z\d-][_a-z\d-+]*(?:\.[_a-z\d-+]*)*@[a-z\d]+[a-z\d-]*(?:\.[a-z\d-]+)*(?:\.[a-z]{2,63})\b/gi

/** Error-reporting and analytics endpoints that look like email addresses (for example Sentry keys in Wix pages). */
const TRACKING_ADDRESS =
  /@(?:[a-z0-9-]+\.)*(?:sentry\.io|sentry-next\.wixpress\.com|sentry\.wixpress\.com|wixpress\.com)$/i

function decodeCloudflareEmail(hex: string): string | null {
  if (!/^(?:[0-9a-f]{2}){2,}$/i.test(hex)) return null
  const key = parseInt(hex.slice(0, 2), 16)
  let decoded = ''
  for (let index = 2; index < hex.length; index += 2)
    decoded += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16) ^ key)
  return EMAIL_VALUE.test(decoded) ? decoded : null
}

/**
 * Reveals addresses that Cloudflare's email obfuscation hides (`data-cfemail="..."` and
 * `/cdn-cgi/l/email-protection#...`), so both extractors see the real address.
 */
export function decodeProtectedEmails(html: string): string {
  if (!/cfemail|email-protection#/i.test(html)) return html
  return html
    .replace(
      /(href=)(["'])\/cdn-cgi\/l\/email-protection#([0-9a-f]+)\2/gi,
      (match, attribute: string, quote: string, hex: string) => {
        const email = decodeCloudflareEmail(hex)
        return email ? `${attribute}${quote}mailto:${email}${quote}` : match
      },
    )
    .replace(
      /<([a-z0-9]+)([^>]*?)\sdata-cfemail=(["'])([0-9a-f]+)\3([^>]*)>[\s\S]*?<\/\1>/gi,
      (match, tag: string, before: string, _quote: string, hex: string, after: string) => {
        const email = decodeCloudflareEmail(hex)
        return email ? `<${tag}${before}${after}>${email}</${tag}>` : match
      },
    )
}

/** Email Hunter-style matching over rendered HTML, including attributes and inline scripts. Matches are unverified. */
export function extractRenderedHtmlEmails(html: string): string[] {
  return [
    ...new Set(
      (
        decodeProtectedEmails(html)
          .replace(/\\n/gi, ' ')
          .replace(/%40/gi, '@')
          .match(RENDERED_EMAIL) ?? []
      ).map((value) => value.toLowerCase()),
    ),
  ].filter(
    (value) =>
      !/\.(?:png|jpe?g|gif|css|js|webp)$/i.test(value) &&
      !/(?:no|not)[-_]?reply|mailer[-_]?daemon|nondelivery/i.test(value) &&
      !TRACKING_ADDRESS.test(value),
  )
}

/** Pure HTML-string extraction: safe in Node and an extension offscreen document. */
export function extractContacts(
  html: string,
  defaultCountry: 'US' | 'GB' | 'PK' = 'US',
): ExtractedContacts {
  const $ = cheerio.load(decodeProtectedEmails(html))
  $('script,style,noscript').remove()
  const text = $.root()
    .text()
    .replace(/\u200b/g, '')
  const mailto = $('a[href^="mailto:" i]')
    .map((_, node) => {
      const value = ($(node).attr('href') ?? '').slice(7).split('?')[0]
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    })
    .get()
  const emails = [
    ...new Set(
      [...mailto, ...(text.match(EMAIL) ?? [])].map((value) => value.trim().toLowerCase()),
    ),
  ].filter(
    (value) =>
      EMAIL_VALUE.test(value) &&
      !/\.(png|jpe?g|gif|svg|webp)$/i.test(value) &&
      !value.includes('example.') &&
      !TRACKING_ADDRESS.test(value),
  )
  const phones = new Set<string>()
  $('a[href^="tel:"]').each((_, node) => {
    const parsed = parsePhoneNumberFromString(($(node).attr('href') ?? '').slice(4), defaultCountry)
    if (parsed?.isValid()) phones.add(parsed.number)
  })
  const socialUrls = [
    ...new Set(
      $('a[href]')
        .map((_, node) => $(node).attr('href') ?? '')
        .get()
        .filter((href) => SOCIAL.test(href)),
    ),
  ]
  return { emails, phones: [...phones], socialUrls }
}

export interface PageDiscovery {
  links: string[]
  formRecipientEmails: string[]
  possibleFormRecipientEmails: string[]
  formCount: number
}

/** Links and explicitly published form recipients; server-side destinations cannot be inferred. */
export function discoverPage(html: string, pageUrl: string): PageDiscovery {
  const $ = cheerio.load(html)
  const page = new URL(pageUrl)
  const links = new Set<string>()
  $('a[href]').each((_, node) => {
    const href = ($(node).attr('href') ?? '').trim()
    if (!href || href.startsWith('#')) return
    try {
      const target = new URL(href, page)
      if (!['http:', 'https:'].includes(target.protocol) || target.origin !== page.origin) return
      target.hash = ''
      if (
        target.href === page.href ||
        /\.(?:pdf|jpe?g|png|gif|svg|webp|zip|css|js)(?:$|\?)/i.test(target.href)
      )
        return
      links.add(target.href)
    } catch {
      /* Ignore malformed links. */
    }
  })
  const recipients = new Set<string>()
  const possibleRecipients = new Set<string>()
  const addRecipient = (raw: string, destination: Set<string>) => {
    for (const part of raw.split(/[;,]/)) {
      const address = part
        .trim()
        .replace(/^mailto:/i, '')
        .split('?')[0]
        .trim()
        .toLowerCase()
      if (EMAIL_VALUE.test(address) && !address.includes('example.')) destination.add(address)
    }
  }
  const recipientName =
    /^(?:_?to|_?recipient(?:_?email)?|email_?to|destination_?email|notification_?email|receiver_?email|send_?to)$/i
  const forms = $('form')
  forms.each((_, form) => {
    const element = $(form)
    const action = (element.attr('action') ?? '').trim()
    if (/^mailto:/i.test(action)) addRecipient(action, recipients)
    element.find('[formaction]').each((_, button) => {
      const buttonAction = $(button).attr('formaction') ?? ''
      if (/^mailto:/i.test(buttonAction)) addRecipient(buttonAction, recipients)
    })
    for (const attr of [
      'data-recipient',
      'data-recipient-email',
      'data-to-email',
      'data-notification-email',
      'data-send-to',
    ]) {
      addRecipient(element.attr(attr) ?? '', recipients)
    }
    element.find('input').each((_, input) => {
      const field = $(input)
      const name = field.attr('name') ?? field.attr('id') ?? ''
      if (recipientName.test(name)) addRecipient(field.attr('value') ?? '', recipients)
    })
  })
  // Inline form configuration is a clue, not proof of where a server sends submissions.
  if (forms.length) {
    const key =
      /["']?(?:recipient_?email|notification_?email|receiver_?email|destination_?email|to_?email|send_?to|mail_?to)["']?\s*[:=]\s*["'`]([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})["'`]/gi
    $('script:not([src])').each((_, script) => {
      const content = $(script).html() ?? ''
      for (const match of content.matchAll(key)) addRecipient(match[1], possibleRecipients)
    })
  }
  for (const address of recipients) possibleRecipients.delete(address)
  return {
    links: [...links],
    formRecipientEmails: [...recipients],
    possibleFormRecipientEmails: [...possibleRecipients],
    formCount: forms.length,
  }
}
