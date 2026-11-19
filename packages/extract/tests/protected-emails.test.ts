import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeProtectedEmails, extractContacts, extractRenderedHtmlEmails } from '../src/index.ts'

/** Encodes an address the way Cloudflare's email obfuscation does (first byte is the XOR key). */
function cloudflare(email: string, key = 0x42): string {
  return [key, ...[...email].map((char) => char.charCodeAt(0) ^ key)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

test('Cloudflare-protected addresses are decoded for both extractors', () => {
  const html = `<p>Email <a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${cloudflare('info@islandbuilders.com')}">[email&#160;protected]</a></p>
    <a href="/cdn-cgi/l/email-protection#${cloudflare('sales@islandbuilders.com', 0x1f)}">Write to us</a>`
  assert.match(decodeProtectedEmails(html), /info@islandbuilders\.com/)
  assert.deepEqual(extractContacts(html).emails.sort(), ['info@islandbuilders.com', 'sales@islandbuilders.com'])
  assert.deepEqual(extractRenderedHtmlEmails(html).sort(), ['info@islandbuilders.com', 'sales@islandbuilders.com'])
})

test('percent-encoded mailto links and Sentry keys are handled', () => {
  const html = `<a href="mailto:office%40builder.com?subject=Quote">Mail</a>
    <script>Sentry.init({ dsn: "https://605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com/1" })</script>`
  assert.deepEqual(extractContacts(html).emails, ['office@builder.com'])
  assert.deepEqual(extractRenderedHtmlEmails(html), ['office@builder.com'])
})

test('pages without protection are left unchanged', () => {
  const html = '<p>Call or email hello@builder.com</p>'
  assert.equal(decodeProtectedEmails(html), html)
  assert.equal(decodeProtectedEmails('<span data-cfemail="zz">x</span>'), '<span data-cfemail="zz">x</span>')
})
