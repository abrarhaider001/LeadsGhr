type TrackingRecord = {
  id: string; recipient: string; subject: string; sentAt: number; sent?: boolean
  /** Gmail account that sent the email; used to recognise the sender's own views. */
  sender?: string
  /** Observed loads after removing the sender's own views. */
  loads: number; firstLoad?: string | null; lastLoad: string | null; events?: string[]; notifiedLoads?: number
  /** Times the sender's Gmail displayed this email, and the server load times attributed to them. */
  ownViews?: number[]; ownEvents?: string[]
}
type Settings = { endpoint: string; registrationKey: string; enabled: boolean }
const defaults: Settings = { endpoint: '', registrationKey: '', enabled: true }

async function settings(): Promise<Settings> {
  return { ...defaults, ...await chrome.storage.local.get(['endpoint', 'registrationKey', 'enabled']) }
}

function endpointUrl(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Tracking endpoint must be a public HTTPS URL without credentials or query parameters.')
  return url
}

async function requestEndpoint(url: URL, init?: RequestInit): Promise<Response> {
  const origin = `${url.protocol}//${url.host}/*`
  if (!await chrome.permissions.contains({ origins: [origin] })) throw new Error('Grant endpoint access in extension settings first.')
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`Tracking service returned ${response.status}.`)
  return response
}

const REFRESH_ALARM = 'tracking-refresh'
const NOTIFICATION_PREFIX = 'leadsghr-tracking-'

// Fallback poll for when the realtime connection is down (30 s is Chrome's minimum alarm period).
const REFRESH_PERIOD_MINUTES = 0.5

async function ensureRefreshAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(REFRESH_ALARM)
  if (existing?.periodInMinutes !== REFRESH_PERIOD_MINUTES) await chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES })
}
chrome.runtime.onInstalled.addListener(() => { void ensureRefreshAlarm(); void connectRealtime() })
chrome.runtime.onStartup.addListener(() => { void ensureRefreshAlarm(); void connectRealtime() })
void ensureRefreshAlarm()
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== REFRESH_ALARM) return
  void connectRealtime()
  void refresh()
})

// ---- Instant notifications ----
// The tracking function broadcasts a Supabase Realtime message on every pixel request. While this
// socket is open, a recipient's open triggers a refresh (and notification) within about a second.
// Socket traffic every 20 s also keeps the MV3 service worker alive; if Chrome stops it anyway, the
// 30 s alarm reconnects and polls.
type RealtimeConfig = { url: string; anonKey: string; topic: string }
let socket: WebSocket | null = null
let connecting = false
let heartbeat: ReturnType<typeof setInterval> | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let reconnectDelay = 2000
let messageRef = 0

function scheduleRefresh(): void {
  if (refreshTimer !== undefined) clearTimeout(refreshTimer)
  // Short delay batches several loads (e.g. Gmail fetching twice) into one refresh.
  refreshTimer = setTimeout(() => { refreshTimer = undefined; void refresh() }, 400)
}

function closeRealtime(): void {
  if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
  reconnectTimer = undefined
  const current = socket
  socket = null
  if (heartbeat !== undefined) clearInterval(heartbeat)
  heartbeat = undefined
  current?.close()
}

async function connectRealtime(): Promise<void> {
  if (connecting || (socket && socket.readyState <= WebSocket.OPEN)) return
  connecting = true
  try {
    const config = await settings()
    if (!config.endpoint || !config.registrationKey) return
    const url = endpointUrl(config.endpoint)
    url.searchParams.set('realtime', '1')
    const info = await (await requestEndpoint(url, { headers: { 'X-LeadsGhr-Key': config.registrationKey } })).json() as Partial<RealtimeConfig>
    if (!info.url || !info.anonKey || !info.topic) return
    const address = new URL('/realtime/v1/websocket', info.url)
    address.protocol = 'wss:'
    address.searchParams.set('apikey', info.anonKey)
    address.searchParams.set('vsn', '1.0.0')
    const current = new WebSocket(address)
    socket = current
    const topic = `realtime:${info.topic}`
    const send = (message: object) => { if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify({ ...message, ref: String(++messageRef) })) }
    current.onopen = () => {
      reconnectDelay = 2000
      send({ topic, event: 'phx_join', join_ref: '1', payload: { config: { broadcast: { ack: false, self: false }, presence: { key: '' }, postgres_changes: [], private: false }, access_token: info.anonKey } })
      heartbeat = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {} }), 20000)
    }
    current.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { event?: string; payload?: { event?: string } }
        if (message.event === 'broadcast' && message.payload?.event === 'load') scheduleRefresh()
      } catch { /* ignore malformed frames */ }
    }
    current.onerror = () => current.close()
    current.onclose = () => {
      if (socket !== current) return
      socket = null
      if (heartbeat !== undefined) clearInterval(heartbeat)
      heartbeat = undefined
      reconnectTimer = setTimeout(() => { reconnectTimer = undefined; void connectRealtime() }, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 60000)
    }
  } catch { /* the 30 s poll keeps working without realtime */ } finally { connecting = false }
}

void connectRealtime()
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.endpoint || changes.registrationKey)) { closeRealtime(); void connectRealtime() }
})
/** Open the full settings page scrolled to one email in the Email report. */
async function openReport(id?: string): Promise<void> {
  if (id) await chrome.storage.local.set({ focusEmail: { id, at: Date.now() } })
  await chrome.runtime.openOptionsPage()
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return
  void chrome.notifications.clear(notificationId)
  // Notification ids are `${prefix}${recordId}-${loads}`.
  void openReport(notificationId.slice(NOTIFICATION_PREFIX.length).replace(/-\d+$/, ''))
})

// A load whose server time falls in this window around a sender view is treated as the sender's own.
const OWN_VIEW_BEFORE_MS = 15000
const OWN_VIEW_AFTER_MS = 45000
const isOwnLoad = (at: string, views: number[]): boolean => {
  const time = Date.parse(at)
  return views.some(view => time >= view - OWN_VIEW_BEFORE_MS && time <= view + OWN_VIEW_AFTER_MS)
}

const observedLoadText = (count: number): string => `${count} image load${count === 1 ? '' : 's'} observed`

/**
 * Notify the sender about newly observed pixel requests. Gmail's image proxy may cache the
 * pixel, so later recipient opens can be invisible; the wording never claims an exact read count.
 */
async function notifyObservedLoad(record: TrackingRecord, previousLoads: number, loads: number): Promise<void> {
  if (!record.sent || loads <= previousLoads) return
  const subject = record.subject || 'Tracked email'
  const first = previousLoads === 0
  await chrome.notifications.create(`${NOTIFICATION_PREFIX}${record.id}-${loads}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: first ? 'Tracked email image loaded' : 'Tracking image loaded again',
    message: first
      ? `"${subject}" was opened or its tracking image was loaded.${loads > 1 ? ` ${observedLoadText(loads)}.` : ''}`
      : `"${subject}": ${loads} observed loads.`,
    contextMessage: record.recipient ? `To ${record.recipient}` : undefined,
    priority: 1
  })
}

type ObservedUpdate = { loads: number; firstLoad: string | null; lastLoad: string | null; events?: string[] }

async function refresh(): Promise<void> {
  const config = await settings()
  if (!config.endpoint) return
  const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }
  const base = endpointUrl(config.endpoint)
  const fetched = new Map<string, ObservedUpdate>()
  await Promise.all(records.filter(record => record.sent).map(async (record) => {
    try {
      const url = new URL(base)
      url.searchParams.set('id', record.id)
      const response = await requestEndpoint(url, { headers: { 'X-LeadsGhr-Key': config.registrationKey } })
      const data = await response.json() as { loads?: unknown; firstLoad?: unknown; lastLoad?: unknown; events?: unknown }
      if (typeof data.loads !== 'number' || !Number.isFinite(data.loads) || data.loads < 0) return
      fetched.set(record.id, {
        loads: Math.floor(data.loads),
        firstLoad: typeof data.firstLoad === 'string' ? data.firstLoad : null,
        lastLoad: typeof data.lastLoad === 'string' ? data.lastLoad : null,
        events: Array.isArray(data.events) ? data.events.filter((value): value is string => typeof value === 'string') : undefined
      })
    } catch { /* keep the stored record when one request fails */ }
  }))
  if (!fetched.size) return
  // Re-read before writing so records registered or armed during the requests are not overwritten.
  const { records: latest = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }
  const { notify } = await chrome.storage.local.get('notify') as { notify?: boolean }
  const notifications: Promise<void>[] = []
  const updated = latest.map((record) => {
    const update = fetched.get(record.id)
    if (!update) return record
    // Remove loads caused by the sender opening the email in their own Gmail.
    const ownEvents = new Set(record.ownEvents ?? [])
    if (update.events && record.ownViews?.length) for (const event of update.events) if (isOwnLoad(event, record.ownViews)) ownEvents.add(event)
    const loads = Math.max(0, update.loads - ownEvents.size)
    const events = update.events ? update.events.filter(event => !ownEvents.has(event)) : record.events
    const firstLoad = !loads ? null : update.firstLoad && !ownEvents.has(update.firstLoad) ? update.firstLoad : events?.[events.length - 1] ?? update.firstLoad
    const lastLoad = !loads ? null : events?.[0] ?? update.lastLoad ?? record.lastLoad
    // Records saved before notifications existed start at their current count without a backlog alert.
    // Capping at `loads` lets a later real load notify after an own view was subtracted.
    const notifiedLoads = Math.min(typeof record.notifiedLoads === 'number' ? record.notifiedLoads : loads, loads)
    if (notify !== false && loads > notifiedLoads) notifications.push(notifyObservedLoad(record, notifiedLoads, loads).catch(() => undefined))
    return { ...record, loads, firstLoad, lastLoad, events, ownEvents: [...ownEvents], notifiedLoads: loads }
  })
  await chrome.storage.local.set({ records: updated })
  await Promise.all(notifications)
}

// ---- Gmail tabs follow the extension's state ----
// Gmail scripts hold this port so they can tell when the extension is turned off or reloaded.
chrome.runtime.onConnect.addListener(port => { if (port.name !== 'leadsghr-gmail') port.disconnect() })

/**
 * After install, update, reload, or turning the extension back on, open Gmail tabs still run no
 * LeadsGhr script (or an orphaned old one). Reload each fully loaded Gmail tab that does not answer
 * a ping, so the compose bar and ticks appear without a manual refresh.
 */
async function reloadStaleGmailTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' })
  await Promise.all(tabs.map(async tab => {
    if (tab.id === undefined || tab.status !== 'complete' || tab.discarded) return
    try {
      const reply = await chrome.tabs.sendMessage(tab.id, { kind: 'leadsghr:ping' }) as { ok?: boolean } | undefined
      if (reply?.ok) return
    } catch { /* no live LeadsGhr script in this tab */ }
    await chrome.tabs.reload(tab.id).catch(() => undefined)
  }))
}
chrome.runtime.onInstalled.addListener(() => { void reloadStaleGmailTabs() })
// A worker start after the extension is turned back on fires no install event, so check on every start.
void reloadStaleGmailTabs().catch(() => undefined)

chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (!message || typeof message !== 'object' || !('kind' in message)) return
  if (message.kind === 'tracking:refresh') { void refresh().then(() => respond({ ok: true }), error => respond({ error: String(error) })); return true }
  if (message.kind === 'tracking:arm' && 'id' in message && typeof message.id === 'string') {
    const id = message.id
    void (async () => { const config = await settings(); const url = endpointUrl(config.endpoint); url.searchParams.set('id', id); url.searchParams.set('arm', '1'); await requestEndpoint(url, { method: 'POST', headers: { 'X-LeadsGhr-Key': config.registrationKey } }); const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }; await chrome.storage.local.set({ records: records.map(record => record.id === id ? { ...record, sent: true, sentAt: Date.now() } : record) }); return { ok: true } })().then(respond, error => respond({ error: String(error) }))
    return true
  }
  if (message.kind === 'tracking:skipped') {
    const reason = 'reason' in message && typeof message.reason === 'string' ? message.reason.slice(0, 200) : 'Unknown reason.'
    chrome.notifications.create(`leadsghr-skipped-${Date.now()}`, { type: 'basic', iconUrl: chrome.runtime.getURL('icon.png'), title: 'Email sent without tracking', message: reason, priority: 1 })
    respond({ ok: true })
    return
  }
  if (message.kind === 'tracking:open-report') {
    const id = 'id' in message && typeof message.id === 'string' ? message.id : undefined
    void openReport(id).then(() => respond({ ok: true }), error => respond({ error: String(error) }))
    return true
  }
  if (message.kind === 'tracking:own-view' && 'id' in message && typeof message.id === 'string') {
    const id = message.id
    void (async () => {
      const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }
      await chrome.storage.local.set({ records: records.map(record => record.id === id ? { ...record, ownViews: [...(record.ownViews ?? []), Date.now()].slice(-30) } : record) })
    })().then(() => respond({ ok: true }), error => respond({ error: String(error) }))
    return true
  }
  if (message.kind !== 'tracking:register' || !('recipient' in message) || !('subject' in message)) return
  void (async () => {
    const config = await settings()
    if (!config.enabled || !config.endpoint || !config.registrationKey) throw new Error('Configure the public tracking endpoint in extension settings first.')
    const recipient = String(message.recipient).trim().slice(0, 320)
    const subject = String(message.subject).trim().slice(0, 200)
    const sender = 'sender' in message && typeof message.sender === 'string' ? message.sender.trim().toLowerCase().slice(0, 320) : ''
    if (!recipient || !subject) throw new Error('Recipient and subject are required.')
    const id = crypto.randomUUID()
    const url = endpointUrl(config.endpoint)
    await requestEndpoint(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-LeadsGhr-Key': config.registrationKey }, body: JSON.stringify({ id }) })
    const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }
    await chrome.storage.local.set({ records: [{ id, recipient, subject, sender, sentAt: Date.now(), sent: false, loads: 0, lastLoad: null, events: [], notifiedLoads: 0 }, ...records].slice(0, 500) })
    url.searchParams.set('id', id)
    url.searchParams.set('pixel', '1')
    return { pixelUrl: url.toString(), id }
  })().then(respond, error => respond({ error: error instanceof Error ? error.message : String(error) }))
  return true
})
