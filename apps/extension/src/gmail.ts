type RecordEntry = { id: string; recipient: string; subject: string; sentAt: number; sent?: boolean; loads: number; firstLoad?: string | null; lastLoad: string | null; events?: string[] }
type TickState = 'untracked' | 'sent' | 'loaded'
const observedLoads = (count: number): string => count ? `${count} image load${count === 1 ? '' : 's'} observed` : 'No image load observed yet'

const css = document.createElement('style')
css.textContent = `.lg-track-button{border:1px solid #dadce0;background:#fff;border-radius:7px;padding:5px 9px;cursor:pointer;font:12px Arial;color:#202124}.lg-track-button.on{color:#5B12C9;border-color:#5B12C9}.lg-track-banner{display:flex;align-items:center;gap:8px;margin:8px 0;padding:6px 8px;background:#f6f2ff;border-radius:7px;font:12px Arial;color:#352254}.lg-track-navbar{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:0 5px;padding:5px;border:0;border-radius:50%;background:transparent;cursor:pointer}.lg-track-navbar:hover{background:#f1eef8}.lg-track-navbar img{display:block;width:23px;height:23px;object-fit:contain}
.lg-ticks{display:inline-flex;align-items:center;flex:none}.lg-ticks svg{display:block;width:20px;height:12px;fill:none;stroke:#A0A4AA;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.lg-ticks.sent .lg-tick-first,.lg-ticks.loaded path{stroke:#1E8E3E}
.lg-track-row{display:inline-flex;align-items:center;margin-right:8px;padding:2px 3px;border-radius:5px;cursor:pointer;vertical-align:middle}.lg-track-row:hover,.lg-track-row[aria-expanded=true]{background:rgba(32,33,36,.07)}.lg-track-row:focus-visible{outline:2px solid #29CBEA;outline-offset:1px}
.lg-card{position:fixed;z-index:2147483000;box-sizing:border-box;width:310px;max-width:calc(100vw - 16px);padding:14px 16px 16px;border:1px solid #DFD9EC;border-radius:12px;background:#fff;box-shadow:0 10px 30px rgba(25,11,45,.18);color:#190B2D;font:13px/1.45 'Google Sans',Roboto,Arial,sans-serif;text-align:left;cursor:default}.lg-card[hidden]{display:none}
.lg-card-head{display:flex;align-items:flex-start;gap:9px}.lg-card-head .lg-ticks{margin-top:4px}.lg-card-title{margin:0;font-size:14px;font-weight:400}.lg-card-title strong{font-weight:700}.lg-card-to{display:block;margin-top:2px;overflow:hidden;color:#675E76;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
.lg-card-row{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:12px}.lg-card-row svg{flex:none;width:16px;height:16px;fill:none;stroke:#675E76;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.lg-card-row strong{font-weight:700}
.lg-card-history{margin:10px 0 0;padding:8px 10px;border-radius:8px;background:#F7F4FF;color:#675E76;font-size:11px;line-height:1.7;list-style:none}.lg-card-history li{display:flex;justify-content:space-between;gap:10px}
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

/** Double check: both gray by default, first green once a tracked send is confirmed, both green once an image load is observed. */
function ticks(state: TickState): HTMLElement {
  const span = document.createElement('span')
  span.className = `lg-ticks ${state}`
  const svg = icon('0 0 20 12', ['M1.5 6.3l3.3 3.3L11.4 3', 'M8.6 8.1l1.5 1.5L16.6 3'])
  svg.querySelector('path')?.setAttribute('class', 'lg-tick-first')
  span.append(svg)
  return span
}

function getComposeBody(compose: Element): HTMLElement | null {
  return compose.querySelector<HTMLElement>('[g_editable="true"][contenteditable="true"], [role="textbox"][contenteditable="true"][aria-label*="Message Body"], div[contenteditable="true"][aria-label*="Message Body"]')
}

function getComposeSubject(compose: Element): string {
  return compose.querySelector<HTMLInputElement>('input[name="subjectbox"]')?.value?.trim() ?? ''
}

function getRecipient(compose: Element): string {
  const chips = [...compose.querySelectorAll<HTMLElement>('[email]')]
  return chips.map(chip => chip.getAttribute('email')).filter(Boolean).join(', ') || compose.querySelector<HTMLInputElement>('input[name="to"]')?.value?.trim() || ''
}

function findCompose(): Element[] {
  return [...document.querySelectorAll('input[name="subjectbox"]')].map(input => input.closest('[role="dialog"]')).filter((value): value is Element => !!value)
}

let defaultTrackingEnabled = true
function updateComposeDefault() {
  document.querySelectorAll<HTMLElement>('.lg-track-banner').forEach(banner => {
    const toggle = banner.querySelector<HTMLButtonElement>('.lg-track-button')
    const label = banner.querySelector<HTMLElement>('span:nth-child(2)')
    if (!toggle || !label) return
    toggle.setAttribute('aria-pressed', String(defaultTrackingEnabled))
    toggle.classList.toggle('on', defaultTrackingEnabled)
    toggle.textContent = defaultTrackingEnabled ? 'Tracking on' : 'Tracking off'
    label.textContent = defaultTrackingEnabled ? 'LeadsGhr tracking is on · a tiny image will be added when you send' : 'LeadsGhr tracking is off for this message'
  })
}

function decorateCompose(compose: Element): void {
  if (compose.querySelector('.lg-track-banner')) return
  const body = getComposeBody(compose)
  if (!body) return
  const banner = document.createElement('div')
  banner.className = 'lg-track-banner'
  banner.append(ticks('sent'))
  const label = document.createElement('span')
  label.textContent = defaultTrackingEnabled ? 'LeadsGhr tracking is on · a tiny image will be added when you send' : 'LeadsGhr tracking is off for this message'
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = `lg-track-button${defaultTrackingEnabled ? ' on' : ''}`
  toggle.textContent = defaultTrackingEnabled ? 'Tracking on' : 'Tracking off'
  toggle.setAttribute('aria-pressed', String(defaultTrackingEnabled))
  toggle.addEventListener('click', () => {
    const on = toggle.getAttribute('aria-pressed') !== 'true'
    toggle.setAttribute('aria-pressed', String(on))
    toggle.classList.toggle('on', on)
    toggle.textContent = on ? 'Tracking on' : 'Tracking off'
    label.textContent = on ? 'LeadsGhr tracking is on · a tiny image will be added when you send' : 'LeadsGhr tracking is off for this message'
  })
  banner.append(label, toggle)
  body.parentElement?.insertBefore(banner, body)
}

const replaying = new WeakSet<Element>()
const registering = new WeakSet<Element>()
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return
  const compose = (event.target as Element)?.closest('[role="dialog"]')
  if (!compose || compose.querySelector('.lg-track-button')?.getAttribute('aria-pressed') !== 'true') return
  const send = compose.querySelector<HTMLElement>('[role="button"][data-tooltip^="Send"], [role="button"][aria-label^="Send"], button[aria-label^="Send"]')
  if (!send) return
  event.preventDefault()
  event.stopImmediatePropagation()
  send.click()
}, true)
document.addEventListener('click', async event => {
  const target = event.target as Element
  const send = target.closest('[role="button"][data-tooltip^="Send"], [role="button"][aria-label^="Send"], button[aria-label^="Send"]')
  if (!send || replaying.has(send)) { if (send) replaying.delete(send); return }
  if (registering.has(send)) { event.preventDefault(); event.stopImmediatePropagation(); return }
  const compose = send.closest('[role="dialog"]')
  if (!compose || !compose.querySelector('.lg-track-banner')) return
  if (compose.querySelector('.lg-track-button')?.getAttribute('aria-pressed') !== 'true') return
  const body = getComposeBody(compose)
  const recipient = getRecipient(compose)
  const subject = getComposeSubject(compose)
  if (!body || !recipient || !subject) return
  event.preventDefault()
  event.stopImmediatePropagation()
  registering.add(send)
  try {
    const result = await chrome.runtime.sendMessage({ kind: 'tracking:register', recipient, subject }) as { pixelUrl?: string; id?: string; error?: string }
    if (result.error || !result.pixelUrl) throw new Error(result.error || 'Could not create tracking pixel.')
    const image = document.createElement('img')
    image.src = result.pixelUrl
    image.width = 1
    image.height = 1
    image.alt = ''
    image.style.cssText = 'width:1px;height:1px;opacity:0.01'
    body.append(image)
    replaying.add(send)
    ;(send as HTMLElement).click()
    if (result.id) {
      let checks = 0
      const armAfterSend = () => {
        if (!compose.isConnected) { void chrome.runtime.sendMessage({ kind: 'tracking:arm', id: result.id }).catch(() => undefined); return }
        if (++checks < 24) window.setTimeout(armAfterSend, 500)
      }
      window.setTimeout(armAfterSend, 500)
    }
  } catch (error) {
    const label = compose.querySelector<HTMLElement>('.lg-track-banner span:nth-child(2)')
    if (label) label.textContent = `Tracking unavailable: ${String(error)}. Message was not sent; turn tracking off to send without it.`
  } finally { registering.delete(send) }
}, true)

let records: RecordEntry[] = []
async function loadRecords(): Promise<void> {
  records = ((await chrome.storage.local.get('records')).records ?? []) as RecordEntry[]
  decorateSentRows()
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

function decorateSentRows(): void {
  const sentView = location.hash.startsWith('#sent') || document.querySelector<HTMLInputElement>('input[aria-label="Search mail"]')?.value?.includes('in:sent')
  if (!sentView || !defaultTrackingEnabled) { document.querySelectorAll('.lg-track-row').forEach(node => node.remove()); hideCard(); return }
  for (const row of document.querySelectorAll<HTMLElement>('tr[role="row"], tr.zA')) {
    const cells = row.querySelectorAll<HTMLElement>('td')
    if (cells.length < 4) continue
    const text = row.innerText.toLowerCase()
    const record = records.find(item => item.subject && text.includes(item.subject.toLowerCase()) && Math.abs(Date.now() - item.sentAt) < 90 * 86400000)
    const old = row.querySelector<HTMLElement>('.lg-track-row')
    const state = record ? `${record.id}:${record.sent ? 1 : 0}:${record.loads}` : 'untracked'
    if (old?.dataset.state === state) continue
    old?.remove()
    const cell = row.querySelector<HTMLElement>('td.yX') ?? cells[3] ?? cells[0]
    if (!cell) continue
    const indicator = document.createElement('span')
    indicator.className = 'lg-track-row'
    indicator.dataset.state = state
    indicator.dataset.recordId = record?.id ?? ''
    indicator.tabIndex = 0
    indicator.setAttribute('role', 'button')
    indicator.setAttribute('aria-haspopup', 'dialog')
    indicator.setAttribute('aria-expanded', 'false')
    indicator.setAttribute('aria-label', rowLabel(record))
    indicator.append(ticks(tickState(record)))
    bindCardTrigger(indicator)
    cell.prepend(indicator)
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

const stamp = (value: string | number): string => new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

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
    target.append(element('p', 'lg-card-note', 'Only messages sent with LeadsGhr tracking on show image-load activity. Keep Tracking on in the compose window to track new messages.'))
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
    if (events.length) {
      const list = element('ol', 'lg-card-history')
      list.setAttribute('aria-label', 'Recent observed image loads')
      events.slice(0, 5).forEach((event, index) => {
        const item = element('li')
        item.append(element('span', '', `Load ${record.loads - index}`), element('span', '', stamp(event)))
        list.append(item)
      })
      target.append(list)
    }
    target.append(element('p', 'lg-card-note', 'Gmail may show a cached image on later opens, so repeat opens can go unobserved. Counts are observed image loads, not exact reads.'))
  }
  const button = element('button', 'lg-card-button', 'View in LeadsGhr')
  button.type = 'button'
  button.addEventListener('click', () => { hideCard(); void chrome.runtime.openOptionsPage() })
  target.append(button)
}

function positionCard(target: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const left = Math.min(Math.max(8, rect.left - 12), window.innerWidth - target.offsetWidth - 8)
  const below = rect.bottom + 6
  const top = below + target.offsetHeight > window.innerHeight - 8 ? Math.max(8, rect.top - target.offsetHeight - 6) : below
  target.style.left = `${left}px`
  target.style.top = `${top}px`
}

function showCard(anchor: HTMLElement): void {
  cancelHide()
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
const observer = new MutationObserver(() => {
  if (scheduled) return
  scheduled = true
  window.setTimeout(() => {
    scheduled = false
    findCompose().forEach(decorateCompose)
    decorateNavbar()
    decorateSentRows()
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
