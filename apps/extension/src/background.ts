type TrackingRecord = { id: string; recipient: string; subject: string; sentAt: number; loads: number; lastLoad: string | null }
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

chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage() })
chrome.runtime.onInstalled.addListener(() => { void chrome.alarms.create('tracking-refresh', { periodInMinutes: 1 }) })
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'tracking-refresh') void refresh() })

async function refresh(): Promise<void> {
  const config = await settings()
  if (!config.endpoint) return
  const { records = [] } = await chrome.storage.local.get('records') as { records?: TrackingRecord[] }
  const base = endpointUrl(config.endpoint)
  const updated = await Promise.all(records.map(async (record) => {
    try {
      const url = new URL(base)
      url.searchParams.set('id', record.id)
      const response = await requestEndpoint(url, { headers: { 'X-LeadsGhr-Key': config.registrationKey } })
      const data = await response.json() as { loads?: number; lastLoad?: string | null }
      return { ...record, loads: data.loads ?? record.loads, lastLoad: data.lastLoad ?? record.lastLoad }
    } catch { return record }
  }))
  await chrome.storage.local.set({ records: updated })
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (!message || typeof message !== 'object' || !('kind' in message)) return
  if (message.kind === 'tracking:refresh') { void refresh().then(() => respond({ ok: true }), error => respond({ error: String(error) })); return true }
  if (message.kind === 'tracking:arm' && 'id' in message && typeof message.id === 'string') {
    const id = message.id
    void (async () => { const config = await settings(); const url = endpointUrl(config.endpoint); url.searchParams.set('id', id); url.searchParams.set('arm', '1'); await requestEndpoint(url, { method: 'POST', headers: { 'X-LeadsGhr-Key': config.registrationKey } }); return { ok: true } })().then(respond, error => respond({ error: String(error) }))
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
    await chrome.storage.local.set({ records: [{ id, recipient, subject, sentAt: Date.now(), loads: 0, lastLoad: null }, ...records].slice(0, 500) })
    url.searchParams.set('id', id)
    url.searchParams.set('pixel', '1')
    return { pixelUrl: url.toString(), id }
  })().then(respond, error => respond({ error: error instanceof Error ? error.message : String(error) }))
  return true
})
