import type { ComposePayload, ComposeResult } from './types'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function waitFor<T>(read: () => T | null | undefined, timeoutMs = 20000, intervalMs = 120): Promise<T> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = read()
    if (value) return value
    await sleep(intervalMs)
  }
  throw new Error('Timed out waiting for Gmail compose.')
}

function findComposes(): Element[] {
  return [...document.querySelectorAll('input[name="subjectbox"]')]
    .map((input) => input.closest('[role="dialog"]'))
    .filter((value): value is Element => !!value)
}

function composeButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, div[role="button"][aria-label*="Compose"]')
}

function getBody(compose: Element): HTMLElement | null {
  return compose.querySelector<HTMLElement>('[g_editable="true"][contenteditable="true"], [role="textbox"][contenteditable="true"][aria-label*="Message Body"], div[contenteditable="true"][aria-label*="Message Body"]')
}

function getSubjectInput(compose: Element): HTMLInputElement | null {
  return compose.querySelector<HTMLInputElement>('input[name="subjectbox"]')
}

function getToField(compose: Element): HTMLElement | null {
  return compose.querySelector<HTMLElement>('textarea[name="to"], input[name="to"], input[aria-label^="To"], div[aria-label^="To recipients"][contenteditable="true"], div[role="textbox"][aria-label^="To"]')
}

function sendButton(compose: Element): HTMLElement | null {
  return compose.querySelector<HTMLElement>('[role="button"][data-tooltip^="Send"], [role="button"][aria-label^="Send"], button[aria-label^="Send"]')
}

function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = Object.getPrototypeOf(input) as { value?: PropertyDescriptor }
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value') ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

async function fillRecipient(compose: Element, email: string): Promise<void> {
  const field = getToField(compose)
  if (!field) throw new Error('Could not find the Gmail To field.')
  field.focus()
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    setNativeValue(field, email)
  } else {
    field.textContent = email
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: email, inputType: 'insertText' }))
  }
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true }))
  field.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', code: 'Tab', bubbles: true }))
  await sleep(250)
}

async function ensureCompose(): Promise<Element> {
  const open = findComposes()[0]
  if (open) return open
  const button = composeButton()
  if (!button) throw new Error('Open Gmail and make sure the Compose button is visible.')
  button.click()
  return waitFor(() => findComposes()[0])
}

export async function composeAndSend(payload: ComposePayload): Promise<ComposeResult> {
  try {
    const compose = await ensureCompose()
    await fillRecipient(compose, payload.to)
    const subject = getSubjectInput(compose)
    if (!subject) throw new Error('Could not find the Gmail subject field.')
    setNativeValue(subject, payload.subject)
    const body = getBody(compose)
    if (!body) throw new Error('Could not find the Gmail message body.')
    body.focus()
    body.innerHTML = payload.bodyHtml
    body.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    const send = sendButton(compose)
    if (!send) throw new Error('Could not find the Gmail Send button.')
    send.click()
    await waitFor(() => !compose.isConnected, 30000)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
