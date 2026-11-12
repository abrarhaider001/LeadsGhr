type TrackingRecord = { id: string; recipient: string; subject: string; sentAt: number; sent?: boolean; loads: number; firstLoad?: string | null; lastLoad: string | null; events?: string[]; notifiedLoads?: number }
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

async function ensureRefreshAlarm(): Promise<void> {
  if (!await chrome.alarms.get(REFRESH_ALARM)) await chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 1 })
}
chrome.runtime.onInstalled.addListener(() => { void ensureRefreshAlarm() })
chrome.runtime.onStartup.addListener(() => { void ensureRefreshAlarm() })
void ensureRefreshAlarm()
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === REFRESH_ALARM) void refresh() })
chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return
  void chrome.notifications.clear(notificationId)
  void chrome.runtime.openOptionsPage()
})

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
    // Records saved before notifications existed start at their current count without a backlog alert.
    const notifiedLoads = typeof record.notifiedLoads === 'number' ? record.notifiedLoads : update.loads
    if (notify !== false && update.loads > notifiedLoads) notifications.push(notifyObservedLoad(record, notifiedLoads, update.loads).catch(() => undefined))
    return {
      ...record,
      loads: update.loads,
      firstLoad: update.firstLoad ?? record.firstLoad ?? null,
      lastLoad: update.lastLoad ?? record.lastLoad,
      events: update.events ?? record.events,
      notifiedLoads: Math.max(notifiedLoads, update.loads)
    }
  })
  await chrome.storage.local.set({ records: updated })
  await Promise.all(notifications)
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (!message || typeof message !== 'object' || !('kind' in message)) return
  if (message.kind === 'tracking:refresh') { void refresh().then(() => respond({ ok: true }), error => respond({ error: String(error) })); return true }
  if (message.kind === 'tracking:arm' && 'id' in message && typeof message.id === 'string') {
    const id = message.id
    void (async () => { const config = await settings(); const url = endpointUrl(config.endpoint); url.searchParams.set('id', id); url.searchParams.set('arm', '1'); await requestEndpoint(url, { method: 'POST', headers: { 'X-LeadsGhr-Key': config.registrationKey } }); const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }; await chrome.storage.local.set({ records: records.map(record => record.id === id ? { ...record, sent: true, sentAt: Date.now() } : record) }); return { ok: true } })().then(respond, error => respond({ error: String(error) }))
    return true
  }
  if (message.kind !== 'tracking:register' || !('recipient' in message) || !('subject' in message)) return
  void (async () => {
    const config = await settings()
    if (!config.enabled || !config.endpoint || !config.registrationKey) throw new Error('Configure the public tracking endpoint in extension settings first.')
    const recipient = String(message.recipient).trim().slice(0, 320)
    const subject = String(message.subject).trim().slice(0, 200)
    if (!recipient || !subject) throw new Error('Recipient and subject are required.')
    const id = crypto.randomUUID()
    const url = endpointUrl(config.endpoint)
    await requestEndpoint(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-LeadsGhr-Key': config.registrationKey }, body: JSON.stringify({ id }) })
    const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }
    await chrome.storage.local.set({ records: [{ id, recipient, subject, sentAt: Date.now(), sent: false, loads: 0, lastLoad: null, events: [], notifiedLoads: 0 }, ...records].slice(0, 500) })
    url.searchParams.set('id', id)
    url.searchParams.set('pixel', '1')
    return { pixelUrl: url.toString(), id }
  })().then(respond, error => respond({ error: error instanceof Error ? error.message : String(error) }))
  return true
})
