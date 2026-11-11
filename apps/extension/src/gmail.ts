type RecordEntry = { id: string; recipient: string; subject: string; sentAt: number; sent?: boolean; loads: number; lastLoad: string | null }

const css = document.createElement('style')
css.textContent = `.lg-track-icon{font:700 16px Arial;color:#9aa0a6;letter-spacing:-3px;display:inline-block;padding-right:3px}.lg-track-icon.open{color:#5B12C9}.lg-track-button{border:1px solid #dadce0;background:#fff;border-radius:7px;padding:5px 9px;cursor:pointer;font:12px Arial;color:#202124}.lg-track-button.on{color:#5B12C9;border-color:#5B12C9}.lg-track-banner{display:flex;align-items:center;gap:8px;margin:8px 0;padding:6px 8px;background:#f6f2ff;border-radius:7px;font:12px Arial;color:#352254}.lg-track-navbar{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:0 5px;padding:5px;border:0;border-radius:50%;background:transparent;cursor:pointer}.lg-track-navbar:hover{background:#f1eef8}.lg-track-navbar img{display:block;width:23px;height:23px;object-fit:contain}.lg-track-row{display:inline-flex;align-items:center;gap:5px;margin-right:8px;font:11px Arial;color:#6b7280}`
document.documentElement.append(css)

const tickStyle = document.createElement('style')
tickStyle.textContent = '.lg-track-checks{display:inline-flex;align-items:center}.lg-track-check{font:700 16px Arial;color:#9aa0a6;margin-right:-3px}.lg-track-check.active{color:#5B12C9}'
document.documentElement.append(tickStyle)

function ticks(open: boolean): HTMLElement {
  const span = document.createElement('span')
  span.className = `lg-track-icon${open ? ' open' : ''}`
  span.textContent = open ? '✓✓' : '✓'
  span.setAttribute('aria-label', open ? 'Tracking image loaded' : 'Tracked message sent; no image load yet')
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
  banner.append(ticks(false))
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
}

function decorateSentRows(): void {
  const sentView = location.hash.startsWith('#sent') || document.querySelector<HTMLInputElement>('input[aria-label="Search mail"]')?.value?.includes('in:sent')
  if (!sentView || !defaultTrackingEnabled) { document.querySelectorAll('.lg-track-row').forEach(node => node.remove()); return }
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
    indicator.title = record?.sent ? `${record.loads} image loads${record.lastLoad ? `; Last: ${record.lastLoad}` : ''}` : 'No confirmed LeadsGhr tracked send'
    const checks = document.createElement('span')
    checks.className = 'lg-track-checks'
    for (const active of [!!record?.sent, !!record?.sent && record.loads > 0]) {
      const check = document.createElement('span')
      check.className = `lg-track-check${active ? ' active' : ''}`
      check.textContent = '✓'
      checks.append(check)
    }
    indicator.append(checks)
    if (record?.sent && record.loads > 0) indicator.append(document.createTextNode(String(record.loads)))
    indicator.setAttribute('aria-label', !record?.sent ? 'No confirmed LeadsGhr tracked send' : record.loads > 0 ? 'Tracked message sent; image loaded' : 'Tracked message sent; no image load yet')
    cell.prepend(indicator)
  }
}

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
