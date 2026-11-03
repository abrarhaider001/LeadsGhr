import { extractContacts } from '@leadsghr/extract'

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message !== 'object' || message === null || !('kind' in message) || message.kind !== 'extract-html') return
  if (!('html' in message) || typeof message.html !== 'string') { sendResponse({ error: 'Invalid HTML input' }); return }
  sendResponse(extractContacts(message.html))
})
