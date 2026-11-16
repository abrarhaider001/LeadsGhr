type RecordEntry = { id: string; recipient: string; subject: string; sentAt: number; sent?: boolean; sender?: string; loads: number; firstLoad?: string | null; lastLoad: string | null; events?: string[] }
type TickState = 'untracked' | 'sent' | 'loaded'
const observedLoads = (count: number): string => count ? `${count} image load${count === 1 ? '' : 's'} observed` : 'No image load observed yet'

const css = document.createElement('style')
css.textContent = `.lg-track-banner{margin:0;padding:6px 16px 2px;font:12px/1.4 'Google Sans',Roboto,Arial,sans-serif;color:#5B12C9}.lg-track-banner[hidden]{display:none}.lg-track-banner.error{color:#B3261E}.lg-track-navbar{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:0 5px;padding:5px;border:0;border-radius:50%;background:transparent;cursor:pointer}.lg-track-navbar:hover{background:#f1eef8}.lg-track-navbar img{display:block;width:23px;height:23px;object-fit:contain}
.lg-ticks{display:inline-flex;align-items:center;flex:none}.lg-ticks svg{display:block;width:20px;height:12px;fill:none;stroke:#A0A4AA;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.lg-ticks.sent .lg-tick-first,.lg-ticks.loaded path{stroke:#5B12C9}
.lg-track-row{display:inline-flex;align-items:center;margin-right:8px;padding:2px 3px;border-radius:5px;cursor:pointer;vertical-align:middle}.lg-track-row:hover,.lg-track-row[aria-expanded=true]{background:rgba(32,33,36,.07)}.lg-track-row:focus-visible{outline:2px solid #29CBEA;outline-offset:1px}.lg-msg-ticks{margin:0 4px 0 8px}.lg-hot{margin-left:5px;padding:1px 6px;border-radius:9px;background:#5B12C9;color:#fff;font:700 9px/1.5 'Google Sans',Roboto,Arial,sans-serif;letter-spacing:.06em}
.lg-card{position:fixed;z-index:2147483000;box-sizing:border-box;width:310px;max-width:calc(100vw - 16px);padding:14px 16px 16px;border:1px solid #DFD9EC;border-radius:12px;background:#fff;box-shadow:0 10px 30px rgba(25,11,45,.18);color:#190B2D;font:13px/1.45 'Google Sans',Roboto,Arial,sans-serif;text-align:left;cursor:default}.lg-card[hidden]{display:none}
.lg-card-head{display:flex;align-items:flex-start;gap:9px}.lg-card-head .lg-ticks{margin-top:4px}.lg-card-title{margin:0;font-size:14px;font-weight:400}.lg-card-title strong{font-weight:700}.lg-card-to{display:block;margin-top:2px;overflow:hidden;color:#675E76;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
.lg-card-row{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:12px}.lg-card-row svg{flex:none;width:16px;height:16px;fill:none;stroke:#675E76;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.lg-card-row strong{font-weight:700}
.lg-card-note{margin:12px 0 0;padding-top:10px;border-top:1px solid #DFD9EC;color:#675E76;font-size:11px;line-height:1.45}
.lg-card-button{display:block;width:100%;min-height:36px;margin-top:12px;border:0;border-radius:8px;background:#5B12C9;color:#fff;font:700 13px 'Google Sans',Roboto,Arial,sans-serif;cursor:pointer}.lg-card-button:hover{filter:brightness(1.08)}.lg-card-button:focus-visible{outline:2px solid #29CBEA;outline-offset:2px}`
document.documentElement.append(css)

const SVG_NS = 'http://www.w3.org/2000/svg'
function icon(viewBox: string, paths: string[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('aria-hidden', 'true')
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.append(path)
  }
  return svg
}

/** Double check: both gray by default, first purple once a tracked send is confirmed, both purple once an image load is observed. */
function ticks(state: TickState): HTMLElement {
  const span = document.createElement('span')
  span.className = `lg-ticks ${state}`
  const svg = icon('0 0 20 12', ['M1.5 6.3l3.3 3.3L11.4 3', 'M8.6 8.1l1.5 1.5L16.6 3'])
  svg.querySelector('path')?.setAttribute('class', 'lg-tick-first')
  span.append(svg)
  return span
}

const BODY_SELECTOR = '[g_editable="true"][contenteditable="true"], [role="textbox"][contenteditable="true"][aria-label*="Message Body"], div[contenteditable="true"][aria-label*="Message Body"]'
const SEND_SELECTOR = '[role="button"][data-tooltip^="Send"], [role="button"][aria-label^="Send"], button[aria-label^="Send"]'

function getComposeBody(compose: Element): HTMLElement | null {
  return compose.querySelector<HTMLElement>(BODY_SELECTOR)
}

/**
 * The compose area for a body or Send button: the smallest ancestor holding both. This covers the
 * New message dialog, a popped-out reply, and the inline reply box inside a conversation, so every
 * message in a thread can be tracked, not only the first email.
 */
function composeRoot(from: Element): Element | null {
  let node: Element | null = from
  while (node && node !== document.body) {
    if (node.querySelector(BODY_SELECTOR) && node.querySelector(SEND_SELECTOR)) return node
    node = node.parentElement
  }
  return null
}

function findCompose(): Element[] {
  const roots = new Set<Element>()
  for (const body of document.querySelectorAll(BODY_SELECTOR)) {
    const root = composeRoot(body)
    if (root) roots.add(root)
  }
  return [...roots]
}

/** Subject of the open conversation (Gmail's thread heading). */
function threadSubject(): string {
  return document.querySelector<HTMLElement>('h2.hP')?.innerText.trim() ?? ''
}

/** A new email has a Subject field; an inline reply inherits the conversation subject. */
const FIELD_SELECTOR = 'input[name="subjectbox"], input[name="to"], [name="to"], [aria-label^="To"], [email], [data-hovercard-id*="@"]'

/**
 * Area to read Recipients and Subject from. In Gmail these fields sit above the body/Send block,
 * outside the smallest area holding both, so widen the area until it includes the Subject field
 * (or, for an inline reply, recipient chips). Stop before it would contain another message body,
 * so fields from a second open draft are never read.
 */
function fieldScope(compose: Element): Element {
  let scope = compose
  while (!scope.querySelector('input[name="subjectbox"]')) {
    const parent = scope.parentElement
    if (!parent || parent === document.body || parent.querySelectorAll(BODY_SELECTOR).length > 1) break
    scope = parent
    if (scope.matches('[role="dialog"]')) break
  }
  return scope.querySelector(FIELD_SELECTOR) ? scope : compose
}

function getComposeSubject(compose: Element): string {
  const typed = compose.querySelector<HTMLInputElement>('input[name="subjectbox"]')?.value?.trim()
  if (typed) return typed
  const thread = threadSubject()
  return thread ? `Re: ${thread}` : ''
}

const addressOf = (node: Element): string => (node.getAttribute('email') ?? node.getAttribute('data-hovercard-id') ?? '').trim().toLowerCase()

/** Recipient chips in the compose area; for a reply whose chips are collapsed, the other people in the conversation. */
function getRecipient(compose: Element): string {
  const account = currentAccount()
  const unique = (values: string[]) => [...new Set(values.filter(value => value.includes('@')))]
  const preferOthers = (values: string[]) => values.some(value => value !== account) ? values.filter(value => value !== account) : values
  // Recipient chips only: Gmail's address-suggestion dropdown also carries addresses and must be ignored.
  const chips = unique([...compose.querySelectorAll('[email], [data-hovercard-id*="@"]')]
    .filter(node => !node.closest('[role="listbox"], [role="option"], [role="menu"], [role="menuitem"]'))
    .map(addressOf))
  if (chips.length) return preferOthers(chips).join(', ')
  const typed = compose.querySelector<HTMLInputElement>('input[name="to"]')?.value?.trim()
  if (typed) return typed
  const thread = unique([...document.querySelectorAll('[role="main"] [role="listitem"] [email]')].map(addressOf))
  return preferOthers(thread).slice(0, 5).join(', ')
}

let defaultTrackingEnabled = true
const BANNER_TEXT = 'LeadsGhr tracking enabled'

/** Tracking follows the popup's "Tracking by default" switch; when it is off the line is hidden and mail is sent untracked. */
function updateComposeDefault() {
  document.querySelectorAll<HTMLElement>('.lg-track-banner').forEach(banner => {
    banner.dataset.enabled = String(defaultTrackingEnabled)
    banner.hidden = !defaultTrackingEnabled
    banner.textContent = BANNER_TEXT
  })
}

/**
 * Whether to track comes only from the popup setting. The "tracking enabled" line is a visual cue;
 * if Gmail's layout prevents inserting it, messages are still tracked.
 */
const trackingEnabledFor = (_compose: Element): boolean => defaultTrackingEnabled

/** Compose area for a Send button: the shared ancestor of body and Send, else the compose dialog (old behaviour). */
function resolveCompose(send: Element): Element | null {
  const root = composeRoot(send)
  if (root) return root
  return send.closest('[role="dialog"]')
}

/** Message body for a compose area; if none is inside it, the only visible body on the page. */
function resolveBody(compose: Element): HTMLElement | null {
  const inside = getComposeBody(compose)
  if (inside) return inside
  const visible = [...document.querySelectorAll<HTMLElement>(BODY_SELECTOR)].filter(node => node.offsetParent !== null)
  return visible.length === 1 ? visible[0] : null
}

/** Tell the user (Chrome notification + console) when a message goes out without tracking while tracking is on. */
function reportSkipped(reason: string): void {
  console.warn(`[LeadsGhr] Sent without tracking: ${reason}`)
  void chrome.runtime.sendMessage({ kind: 'tracking:skipped', reason }).catch(() => undefined)
}

/** Block that holds the Send toolbar: the child of the body/toolbar common ancestor that contains Send. */
function toolbarBlock(compose: Element, body: Element): Element | null {
  const send = compose.querySelector(SEND_SELECTOR)
  if (!send) return null
  let block: Element | null = send
  while (block?.parentElement && !block.parentElement.contains(body)) block = block.parentElement
  return block?.parentElement ? block : null
}

/**
 * Show "LeadsGhr tracking enabled" at the bottom of the compose window, just above the Send toolbar.
 * It sits outside the editable message body, so it is never part of the sent email.
 */
function decorateCompose(compose: Element): void {
  if (compose.querySelector('.lg-track-banner')) return
  const body = getComposeBody(compose)
  if (!body) return
  const toolbar = toolbarBlock(compose, body)
  const banner = document.createElement('div')
  banner.className = 'lg-track-banner'
  banner.setAttribute('role', 'status')
  banner.dataset.enabled = String(defaultTrackingEnabled)
  banner.hidden = !defaultTrackingEnabled
  banner.textContent = BANNER_TEXT
  if (!toolbar) { body.after(banner); return }
  // Gmail lays the compose window out as table rows; keep the markup valid when the toolbar is a row.
  if (toolbar.tagName === 'TR') {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = 99
    cell.append(banner)
    row.append(cell)
    toolbar.before(row)
  } else toolbar.before(banner)
}

const replaying = new WeakSet<Element>()
const registering = new WeakSet<Element>()
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return
  const target = event.target as Element | null
  const dialog = target?.closest('[role="dialog"], form, .M9, .ip, .iN') ?? null
  const compose = target ? composeRoot(target) ?? dialog : null
  if (!compose || !trackingEnabledFor(compose)) return
  const send = compose.querySelector<HTMLElement>(SEND_SELECTOR)
  if (!send) return
  event.preventDefault()
  event.stopImmediatePropagation()
  send.click()
}, true)
document.addEventListener('click', async event => {
  const target = event.target as Element
  const send = target.closest(SEND_SELECTOR)
  if (!send || replaying.has(send)) { if (send) replaying.delete(send); return }
  if (registering.has(send)) { event.preventDefault(); event.stopImmediatePropagation(); return }
  if (!defaultTrackingEnabled) return
  const compose = resolveCompose(send)
  if (!compose) { reportSkipped('LeadsGhr could not find the compose window for this Send button.'); return }
  const body = resolveBody(compose)
  if (!body) { reportSkipped('LeadsGhr could not find the message body.'); return }
  // Never skip tracking because a field could not be read: the pixel ID identifies the message.
  const fields = fieldScope(compose)
  const recipient = getRecipient(fields) || '(unknown recipient)'
  const subject = getComposeSubject(fields) || '(no subject)'
  console.info('[LeadsGhr] Registering tracking', { recipient, subject, sender: currentAccount() })
  event.preventDefault()
  event.stopImmediatePropagation()
  registering.add(send)
  try {
    const result = await chrome.runtime.sendMessage({ kind: 'tracking:register', recipient, subject, sender: currentAccount() }) as { pixelUrl?: string; id?: string; error?: string }
    if (result.error || !result.pixelUrl) throw new Error(result.error || 'Could not create tracking pixel.')
    console.info('[LeadsGhr] Tracking pixel added', result.id)
    const image = document.createElement('img')
    image.src = result.pixelUrl
    image.width = 1
    image.height = 1
    image.alt = ''
    image.style.cssText = 'width:1px;height:1px;opacity:0.01'
    // Replies and forwards quote earlier messages together with their tracking images. Remove those
    // so opening this message does not count as another open of the earlier email.
    for (const quoted of body.querySelectorAll<HTMLImageElement>('img')) if (PIXEL_ID_PATTERN.test(quoted.src)) quoted.remove()
    body.append(image)
    replaying.add(send)
    ;(send as HTMLElement).click()
    if (result.id) {
      let checks = 0
      const armAfterSend = () => {
        if (!compose.isConnected || !body.isConnected) { void chrome.runtime.sendMessage({ kind: 'tracking:arm', id: result.id }).catch(() => undefined); return }
        if (++checks < 24) window.setTimeout(armAfterSend, 500)
      }
      window.setTimeout(armAfterSend, 500)
    }
  } catch (error) {
    console.error('[LeadsGhr] Tracking failed; message not sent', error)
    const banner = compose.querySelector<HTMLElement>('.lg-track-banner')
    if (banner) {
      banner.classList.add('error')
      banner.textContent = `LeadsGhr tracking unavailable: ${error instanceof Error ? error.message : String(error)} The message was not sent. Try again, or turn off Tracking by default in the LeadsGhr popup to send without tracking.`
    }
  } finally { registering.delete(send) }
}, true)

let records: RecordEntry[] = []
async function loadRecords(): Promise<void> {
  records = ((await chrome.storage.local.get('records')).records ?? []) as RecordEntry[]
  decorateSentRows()
  decorateConversation()
  refreshOpenCard()
}

function tickState(record: RecordEntry | undefined): TickState {
  if (!record?.sent) return 'untracked'
  return record.loads > 0 ? 'loaded' : 'sent'
}

function rowLabel(record: RecordEntry | undefined): string {
  if (!record?.sent) return 'No confirmed LeadsGhr tracked send. Show tracking details.'
  return `Tracked message sent; ${observedLoads(record.loads)}. Show tracking details.`
}

// A Gmail list row is matched to a tracked message by subject AND sent time. Matching by subject
// alone made every row with a repeated subject (e.g. several "test subject" emails) show the newest
// tracked message's ticks and counts, including rows that were never tracked.
const MATCH_WINDOW_MS = 3 * 60000

/** Full send time from the row's date cell; Gmail puts it in a title such as "Thu, Nov 12, 2026, 4:18 PM". */
function rowTime(row: HTMLElement): number | null {
  for (const span of row.querySelectorAll<HTMLElement>('td.xW span[title], span[title]')) {
    const title = span.getAttribute('title') ?? ''
    if (!/\d{4}/.test(title) || !/\d{1,2}[:.]\d{2}/.test(title)) continue
    const parsed = Date.parse(title.replace(/[  ]/g, ' ').replace(/\s+at\s+/i, ' '))
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

/** Recipient addresses Gmail attaches to the row's participant names (`<span email="...">`). */
function rowRecipients(row: HTMLElement): Set<string> {
  return new Set([...row.querySelectorAll<HTMLElement>('[email]')].map(node => (node.getAttribute('email') ?? '').trim().toLowerCase()).filter(Boolean))
}

/** "Re: Fwd: Hello" and "Hello" belong to the same conversation. */
function normalizeSubject(value: string): string {
  let subject = value.trim().toLowerCase()
  let previous = ''
  while (previous !== subject) {
    previous = subject
    subject = subject.replace(/^(re|fwd?|fw|aw|sv|vs|tr)\s*(\[\d+\])?\s*:\s*/i, '')
  }
  return subject.trim()
}

const recordRecipients = (item: RecordEntry): string[] => item.recipient.split(',').map(value => value.trim().toLowerCase()).filter(Boolean)

/**
 * Pick the tracked message for a row. A Sent row is a whole conversation, and its date is the date
 * of the newest message in it (which can be the recipient's reply), so:
 * - when Gmail exposes the recipient's address, show the LATEST tracked email you sent to that
 *   recipient in this conversation (same subject, ignoring Re:/Fwd:) up to the row's date;
 * - when it does not, fall back to the tracked email sent closest to the row's date (within three
 *   minutes), which keeps same-subject emails sent seconds apart to different people apart.
 * A tracked email is given to at most one row in each pass.
 */
function matchRecord(row: HTMLElement, text: string, used: Set<string>): RecordEntry | undefined {
  const addresses = rowRecipients(row)
  const bySubject = records.filter(item => !used.has(item.id) && normalizeSubject(item.subject) && text.includes(normalizeSubject(item.subject)))
  // The recipient only narrows same-subject candidates; a recipient read differently (or unknown) never blocks a match.
  const byRecipient = addresses.size ? bySubject.filter(item => recordRecipients(item).some(address => addresses.has(address))) : []
  const time = rowTime(row)
  if (byRecipient.length) {
    const upTo = time === null ? Infinity : time + MATCH_WINDOW_MS
    const sentBefore = byRecipient.filter(item => item.sentAt <= upTo)
    const pool = sentBefore.length ? sentBefore : byRecipient
    return pool.reduce((latest, item) => (item.sentAt > latest.sentAt ? item : latest))
  }
  const candidates = bySubject
  if (!candidates.length) return undefined
  // Without a readable time, only an unambiguous subject is safe to match.
  if (time === null) return candidates.length === 1 ? candidates[0] : undefined
  let best: RecordEntry | undefined
  let bestGap = Infinity
  for (const item of candidates) {
    const gap = Math.abs(item.sentAt - time)
    if (gap < bestGap) { best = item; bestGap = gap }
  }
  return bestGap <= MATCH_WINDOW_MS ? best : undefined
}

function decorateSentRows(): void {
  const sentView = location.hash.startsWith('#sent') || document.querySelector<HTMLInputElement>('input[aria-label="Search mail"]')?.value?.includes('in:sent')
  if (!sentView || !defaultTrackingEnabled) { document.querySelectorAll('.lg-list-ticks').forEach(node => node.remove()); return }
  const used = new Set<string>()
  for (const row of document.querySelectorAll<HTMLElement>('tr[role="row"], tr.zA')) {
    const cells = row.querySelectorAll<HTMLElement>('td')
    if (cells.length < 4) continue
    const text = row.innerText.toLowerCase()
    const record = matchRecord(row, text, used)
    if (record) used.add(record.id)
    const old = row.querySelector<HTMLElement>('.lg-list-ticks')
    if (old?.dataset.state === indicatorState(record)) continue
    old?.remove()
    const cell = row.querySelector<HTMLElement>('td.yX') ?? cells[3] ?? cells[0]
    if (!cell) continue
    cell.prepend(makeIndicator(record, 'lg-list-ticks'))
  }
}

/** More loads than this marks an email HOT beside its ticks. */
const HOT_LOADS = 5

const indicatorState = (record: RecordEntry | undefined): string => record ? `${record.id}:${record.sent ? 1 : 0}:${record.loads}` : 'untracked'

/** Focusable double-check button that opens the details card; used in the Sent list and in conversations. */
function makeIndicator(record: RecordEntry | undefined, placement: 'lg-list-ticks' | 'lg-msg-ticks'): HTMLElement {
  const indicator = document.createElement('span')
  indicator.className = `lg-track-row ${placement}`
  indicator.dataset.state = indicatorState(record)
  indicator.dataset.recordId = record?.id ?? ''
  indicator.tabIndex = 0
  indicator.setAttribute('role', 'button')
  indicator.setAttribute('aria-haspopup', 'dialog')
  indicator.setAttribute('aria-expanded', 'false')
  indicator.setAttribute('aria-label', rowLabel(record))
  indicator.append(ticks(tickState(record)))
  if (record && record.loads > HOT_LOADS) {
    const hot = document.createElement('span')
    hot.className = 'lg-hot'
    hot.textContent = 'HOT'
    indicator.append(hot)
  }
  bindCardTrigger(indicator)
  return indicator
}

// ---- Per-message ticks inside an open conversation ----

/** Sender address in a message header (expanded `.gD`, collapsed `.zF`/`.yP`). */
function messageSender(item: HTMLElement): string {
  const node = item.querySelector('.gD[email], .zF[email], .yP[email], h3 [email]') ?? item.querySelector('[email]')
  return node ? addressOf(node) : ''
}

/** Innermost Gmail message items of the open conversation. */
function conversationMessages(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="main"] [role="listitem"]')].filter(item => !item.querySelector('[role="listitem"]'))
}

/**
 * Put ticks beside every message you sent in the open conversation, like the Sent list but per
 * message. An expanded message is identified exactly by the LeadsGhr pixel inside it; a collapsed
 * one by subject and send time. Your untracked messages get gray ticks; other people's get none.
 */
function decorateConversation(): void {
  const heading = threadSubject()
  const items = heading && defaultTrackingEnabled ? conversationMessages() : []
  if (!items.length) { document.querySelectorAll('.lg-msg-ticks').forEach(node => node.remove()); return }
  const account = currentAccount()
  const subject = normalizeSubject(heading)
  const used = new Set<string>()
  const mine = items.filter(item => { const sender = messageSender(item); return !!sender && sender === account })
  const matches = new Map<HTMLElement, RecordEntry | undefined>()
  // Exact matches first, so time-based matching cannot take a record that a pixel identifies.
  for (const item of mine) {
    const pixelId = [...item.querySelectorAll<HTMLImageElement>('img[src*="pixel=1"]')].map(image => image.src.match(PIXEL_ID_PATTERN)?.[1]?.toLowerCase()).find(Boolean)
    const record = pixelId ? records.find(entry => entry.id === pixelId) : undefined
    if (record) { used.add(record.id); matches.set(item, record) }
  }
  for (const item of mine) {
    if (matches.has(item)) continue
    const time = rowTime(item)
    let best: RecordEntry | undefined
    let bestGap = Infinity
    if (time !== null) for (const entry of records) {
      if (used.has(entry.id) || normalizeSubject(entry.subject) !== subject || (entry.sender && entry.sender !== account)) continue
      const gap = Math.abs(entry.sentAt - time)
      if (gap < bestGap) { best = entry; bestGap = gap }
    }
    const record = best && bestGap <= MATCH_WINDOW_MS ? best : undefined
    if (record) used.add(record.id)
    matches.set(item, record)
  }
  for (const item of items) {
    const old = item.querySelector<HTMLElement>('.lg-msg-ticks')
    if (!matches.has(item)) { old?.remove(); continue }
    const record = matches.get(item)
    if (old?.dataset.state === indicatorState(record)) continue
    old?.remove()
    const anchor = item.querySelector<HTMLElement>('span.g3') ?? [...item.querySelectorAll<HTMLElement>('span[title]')].find(span => /\d{4}/.test(span.title) && /\d{1,2}[:.]\d{2}/.test(span.title))
    anchor?.insertAdjacentElement('afterend', makeIndicator(record, 'lg-msg-ticks'))
  }
}

// ---- Hover/focus card for a sent row ----

function ago(from: number, to = Date.now()): string {
  const minutes = Math.round(Math.max(0, to - from) / 60000)
  if (minutes < 1) return 'less than a minute'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}


function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function rowWithIcon(paths: string[], ...content: (string | Node)[]): HTMLElement {
  const row = element('div', 'lg-card-row')
  const text = element('span')
  text.append(...content)
  row.append(icon('0 0 24 24', paths), text)
  return row
}

const EYE = ['M1.5 12s3.8-7 10.5-7 10.5 7 10.5 7-3.8 7-10.5 7S1.5 12 1.5 12z', 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z']
const CLOCK = ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 7.5V12l3 2']
const SEND = ['M21 3L10 14', 'M21 3l-7 18-4-7-7-4z']

let card: HTMLElement | null = null
let cardAnchor: HTMLElement | null = null
let hideTimer: number | undefined

function ensureCard(): HTMLElement {
  if (card?.isConnected) return card
  const created = element('div', 'lg-card')
  created.hidden = true
  created.setAttribute('role', 'dialog')
  created.setAttribute('aria-label', 'LeadsGhr tracking details')
  created.addEventListener('mouseenter', cancelHide)
  created.addEventListener('mouseleave', scheduleHide)
  created.addEventListener('focusout', event => { if (!isInsideCard(event.relatedTarget)) scheduleHide() })
  created.addEventListener('keydown', event => { if (event.key === 'Escape') { const anchor = cardAnchor; hideCard(); anchor?.focus() } })
  for (const type of ['click', 'mousedown', 'mouseup']) created.addEventListener(type, event => event.stopPropagation())
  document.body.append(created)
  card = created
  return created
}

function isInsideCard(target: EventTarget | null): boolean {
  return target instanceof Node && (!!card?.contains(target) || !!cardAnchor?.contains(target))
}

function renderCard(target: HTMLElement, record: RecordEntry | undefined): void {
  target.replaceChildren()
  const head = element('div', 'lg-card-head')
  const titleBlock = element('div')
  const title = element('p', 'lg-card-title')
  titleBlock.append(title)
  head.append(ticks(tickState(record)), titleBlock)
  target.append(head)

  if (!record) {
    title.append(element('strong', '', 'Not tracked by LeadsGhr'))
    target.append(element('p', 'lg-card-note', 'Only messages sent while “LeadsGhr tracking enabled” shows above Send are tracked. Turn on Tracking by default in the LeadsGhr popup to track new messages.'))
    return
  }
  titleBlock.append(element('span', 'lg-card-to', `To ${record.recipient}`))
  if (!record.sent) {
    title.append(element('strong', '', 'Send not confirmed'))
    target.append(element('p', 'lg-card-note', 'A tracking image was prepared, but LeadsGhr did not confirm that this message was sent, so loads are not counted.'))
  } else if (!record.loads) {
    title.append(element('strong', '', 'No image load observed yet'))
    target.append(rowWithIcon(SEND, 'Sent ', element('strong', '', `${ago(record.sentAt)} ago`)))
    target.append(element('p', 'lg-card-note', 'This changes when the recipient opens the email with images shown. Mail apps that block images report nothing.'))
  } else {
    const events = record.events ?? []
    const lastLoad = record.lastLoad ? Date.parse(record.lastLoad) : NaN
    const firstLoad = record.firstLoad ? Date.parse(record.firstLoad) : events.length ? Date.parse(events[events.length - 1]) : NaN
    title.append('Opened or image loaded ', element('strong', '', Number.isNaN(lastLoad) ? 'recently' : `${ago(lastLoad)} ago`))
    if (!Number.isNaN(firstLoad)) target.append(rowWithIcon(EYE, element('strong', '', 'First loaded'), ` ${ago(record.sentAt, firstLoad)} after you sent it`))
    target.append(rowWithIcon(CLOCK, element('strong', '', observedLoads(record.loads))))
    target.append(element('p', 'lg-card-note', 'Gmail may show a cached image on later opens, so repeat opens can go unobserved. Counts are observed image loads, not exact reads.'))
  }
}

/**
 * Opens the card to the right of the ticks, level with the row, so the ticks of the rows below stay
 * free to hover. Falls back to the left side when there is no room on the right.
 */
function positionCard(target: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const gap = 12
  const width = target.offsetWidth
  const height = target.offsetHeight
  const roomRight = window.innerWidth - rect.right - gap - 8
  const left = roomRight >= width ? rect.right + gap : Math.max(8, rect.left - gap - width)
  const top = Math.min(Math.max(8, rect.top + rect.height / 2 - 24), window.innerHeight - height - 8)
  target.style.left = `${left}px`
  target.style.top = `${top}px`
}

// Opening a card asks the background worker for fresh counts (at most every 20 s);
// the open card re-renders when the stored records change.
let lastCardRefresh = 0
function requestFreshCounts(): void {
  if (Date.now() - lastCardRefresh < 20000) return
  lastCardRefresh = Date.now()
  void chrome.runtime.sendMessage({ kind: 'tracking:refresh' }).catch(() => undefined)
}

function showCard(anchor: HTMLElement): void {
  cancelHide()
  if (anchor.dataset.recordId) requestFreshCounts()
  const target = ensureCard()
  if (cardAnchor && cardAnchor !== anchor) cardAnchor.setAttribute('aria-expanded', 'false')
  cardAnchor = anchor
  anchor.setAttribute('aria-expanded', 'true')
  renderCard(target, records.find(item => item.id === anchor.dataset.recordId))
  target.hidden = false
  positionCard(target, anchor)
}

function hideCard(): void {
  cancelHide()
  if (card) card.hidden = true
  cardAnchor?.setAttribute('aria-expanded', 'false')
  cardAnchor = null
}

function scheduleHide(): void {
  cancelHide()
  hideTimer = window.setTimeout(hideCard, 220)
}

function cancelHide(): void {
  if (hideTimer !== undefined) window.clearTimeout(hideTimer)
  hideTimer = undefined
}

/** Keep an open card current when counts refresh or Gmail re-renders the row. */
function refreshOpenCard(): void {
  if (!card || card.hidden || !cardAnchor) return
  const id = cardAnchor.dataset.recordId
  const anchor = cardAnchor.isConnected ? cardAnchor : id ? document.querySelector<HTMLElement>(`.lg-track-row[data-record-id="${CSS.escape(id)}"]`) : null
  if (!anchor) { hideCard(); return }
  const hadFocus = card.contains(document.activeElement)
  cardAnchor = anchor
  anchor.setAttribute('aria-expanded', 'true')
  renderCard(card, records.find(item => item.id === anchor.dataset.recordId))
  positionCard(card, anchor)
  if (hadFocus) card.querySelector<HTMLElement>('.lg-card-button')?.focus()
}

function bindCardTrigger(indicator: HTMLElement): void {
  indicator.addEventListener('mouseenter', () => showCard(indicator))
  indicator.addEventListener('mouseleave', scheduleHide)
  indicator.addEventListener('focus', () => showCard(indicator))
  indicator.addEventListener('blur', event => { if (!isInsideCard(event.relatedTarget)) scheduleHide() })
  // Keep clicks on the ticks from opening the Gmail conversation.
  for (const type of ['mousedown', 'mouseup']) indicator.addEventListener(type, event => event.stopPropagation())
  indicator.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    showCard(indicator)
  })
  indicator.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      showCard(indicator)
      card?.querySelector<HTMLElement>('.lg-card-button')?.focus()
    } else if (event.key === 'Escape') hideCard()
  })
}

window.addEventListener('scroll', event => { if (!isInsideCard(event.target)) hideCard() }, true)
window.addEventListener('resize', hideCard)
window.addEventListener('hashchange', hideCard)

function decorateNavbar(): void {
  const anchor = [...document.querySelectorAll<HTMLElement>('[aria-label="Settings"], [data-tooltip="Settings"], [aria-label="Google apps"]')]
    .find(element => element.getBoundingClientRect().top < 160 && element.getBoundingClientRect().left > window.innerWidth * .45)
  const existing = document.querySelector<HTMLElement>('.lg-track-navbar')
  if (!anchor) { existing?.remove(); return }
  if (existing) { if (existing.nextElementSibling !== anchor) anchor.before(existing); return }
  const button = document.createElement('button')
  button.className = 'lg-track-navbar'
  button.type = 'button'
  button.setAttribute('aria-label', 'Open LeadsGhr tracking settings')
  const logo = document.createElement('img')
  logo.src = chrome.runtime.getURL('icon.svg')
  logo.width = 23
  logo.height = 23
  logo.alt = ''
  button.append(logo)
  button.title = 'Open LeadsGhr tracking settings and records'
  button.addEventListener('click', () => { void chrome.runtime.openOptionsPage() })
  anchor.before(button)
}

let scheduled = false
// ---- Sender's own views ----
// When the sender opens their own tracked email, Gmail loads the tracking image through its proxy
// (src "https://…googleusercontent.com/…#<endpoint>?id=<uuid>&pixel=1"), which the server would count
// as an open. Report such views so the background worker can subtract the matching load.
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const PIXEL_ID_PATTERN = /[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})&pixel=1/i

/** Address of the Gmail account in this tab, e.g. from the title "Inbox - name@gmail.com - Gmail". */
function currentAccount(): string {
  const fromTitle = document.title.match(EMAIL_PATTERN)?.[0]
  if (fromTitle) return fromTitle.toLowerCase()
  const label = document.querySelector('a[aria-label^="Google Account"]')?.getAttribute('aria-label') ?? ''
  return label.match(EMAIL_PATTERN)?.[0]?.toLowerCase() ?? ''
}

const reportedPixels = new WeakSet<HTMLImageElement>()
function reportOwnViews(): void {
  const account = currentAccount()
  if (!account) return
  for (const image of document.querySelectorAll<HTMLImageElement>('img[src*="pixel=1"]')) {
    if (reportedPixels.has(image)) continue
    const id = image.src.match(PIXEL_ID_PATTERN)?.[1]?.toLowerCase()
    // Wait until the saved records are loaded before deciding about a LeadsGhr pixel.
    if (id && !records.length) continue
    reportedPixels.add(image)
    // Compose bodies hold the direct pixel before sending; the server ignores those loads already.
    if (!id || image.closest('[contenteditable="true"]')) continue
    // Only a tracked email sent from this same account counts as the sender's own view, so a
    // recipient account opened in another tab of this Chrome profile is still counted.
    const record = id ? records.find(item => item.id === id) : undefined
    if (record?.sender && record.sender === account) void chrome.runtime.sendMessage({ kind: 'tracking:own-view', id: record.id }).catch(() => undefined)
  }
}

const observer = new MutationObserver(() => {
  if (scheduled) return
  scheduled = true
  window.setTimeout(() => {
    scheduled = false
    // Each pass is isolated so an error in one (for example an unexpected Gmail layout) cannot stop the others.
    const passes: [string, () => void][] = [
      ['compose', () => findCompose().forEach(decorateCompose)],
      ['own views', reportOwnViews],
      ['conversation', decorateConversation],
      ['navbar', decorateNavbar],
      ['sent rows', decorateSentRows],
    ]
    for (const [name, pass] of passes) {
      try { pass() } catch (error) { console.error(`[LeadsGhr] ${name} update failed`, error) }
    }
  }, 250)
})
observer.observe(document.documentElement, { childList: true, subtree: true })
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.records) void loadRecords()
  if (changes.enabled) { defaultTrackingEnabled = changes.enabled.newValue !== false; updateComposeDefault(); decorateSentRows() }
})
void chrome.storage.local.get('enabled').then(data => { defaultTrackingEnabled = data.enabled !== false; updateComposeDefault(); decorateSentRows() })
void loadRecords()
void chrome.runtime.sendMessage({ kind: 'tracking:refresh' }).catch(() => undefined)


// ---- Reload Gmail when LeadsGhr is turned off, reloaded, or updated (as Mailsuite does) ----
// A port to the background worker closes when the extension goes away. If the extension context is
// gone (chrome.runtime.id is undefined), reload so Gmail drops LeadsGhr's controls and ticks. If only
// the service worker restarted, the context is intact and the port simply reconnects.
function watchExtension(): void {
  let port: chrome.runtime.Port
  try { port = chrome.runtime.connect({ name: 'leadsghr-gmail' }) } catch { location.reload(); return }
  port.onDisconnect.addListener(() => {
    if (!chrome.runtime?.id) { location.reload(); return }
    window.setTimeout(watchExtension, 1000)
  })
}
watchExtension()

// The background worker pings open Gmail tabs; a tab without a live LeadsGhr script is reloaded.
chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (message && typeof message === 'object' && 'kind' in message && message.kind === 'leadsghr:ping') { respond({ ok: true }); return }
})
