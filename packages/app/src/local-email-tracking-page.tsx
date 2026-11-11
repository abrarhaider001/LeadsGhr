import { useEffect, useState, type FormEvent } from 'react'
import { EmptyTable } from '@leadsghr/ui'
import { FiExternalLink } from 'react-icons/fi'
import { MdOutlineDeleteOutline } from 'react-icons/md'
import type { LocalTrackingRecord } from '@leadsghr/schemas'
import { ExtensionInstallPage } from './extension-install-page'

type TrackingBridge = {
  createLocalTracking(input: { recipient: string; subject: string }): Promise<string>
  listLocalTracking(): Promise<LocalTrackingRecord[]>
  openLocalTrackingPreview(id: string): Promise<void>
  deleteLocalTracking(id: string): Promise<boolean>
  downloadTrackingExtension(): Promise<string | null>
}
const bridge = () => (window as Window & { leadsGhrDesktop?: TrackingBridge }).leadsGhrDesktop

export function LocalEmailTrackingPage() {
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [records, setRecords] = useState<LocalTrackingRecord[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function refresh() {
    try {
      const api = bridge()
      if (!api?.listLocalTracking) throw new Error('Restart the desktop app to load the tracking demo.')
      setRecords(await api.listLocalTracking())
    } catch (error) { setMessage(String(error)) }
  }
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 3000)
    return () => window.clearInterval(timer)
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const api = bridge()
      if (!api?.createLocalTracking) throw new Error('Restart the desktop app to enable local tracking.')
      await api.createLocalTracking({ recipient, subject })
      setRecipient('')
      setSubject('')
      setMessage('Test record saved locally. Open its preview on this computer to register an image load.')
      await refresh()
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }
  async function preview(id: string) {
    try {
      const api = bridge()
      if (!api?.openLocalTrackingPreview) throw new Error('Restart the desktop app to enable the preview.')
      await api.openLocalTrackingPreview(id)
      window.setTimeout(() => { void refresh() }, 1000)
    } catch (error) { setMessage(String(error)) }
  }
  async function remove(record: LocalTrackingRecord) {
    if (!window.confirm(`Delete the local tracking test for ${record.recipient}?`)) return
    setDeletingId(record.id)
    try {
      const api = bridge()
      if (!api?.deleteLocalTracking) throw new Error('Restart the desktop app to enable deleting test records.')
      await api.deleteLocalTracking(record.id)
      setRecords((previous) => previous.filter((item) => item.id !== record.id))
      setMessage('Local tracking test deleted.')
    } catch (error) { setMessage(String(error)) }
    finally { setDeletingId(null) }
  }

  async function downloadExtension() {
    try {
      const api = bridge()
      if (!api?.downloadTrackingExtension) throw new Error('Restart the desktop app to enable extension download.')
      const path = await api.downloadTrackingExtension()
      setMessage(path ? `Saved to ${path}` : 'Download cancelled')
    } catch (error) { setMessage(String(error)) }
  }

  if (showDownload) return <ExtensionInstallPage onBack={() => setShowDownload(false)} onDownload={() => { void downloadExtension() }} message={message} />

  return <section className="la-local-tracking">
    <div className="la-local-tracking-heading"><div><h2>Email Tracking · Local test</h2><p>Create a test record and open its tracking pixel in your browser. No email is sent.</p></div><button type="button" onClick={() => setShowDownload(true)}>Get Chrome extension</button></div>
    <form className="la-local-tracking-form" onSubmit={(event) => void create(event)}>
      <label>Recipient address<input type="email" required maxLength={320} value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="recipient@example.com" /></label>
      <label>Subject<input required maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Test message" /></label>
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create test record'}</button>
    </form>
    <p className="la-local-tracking-note">This loopback test works only while LeadsGhr is running on this computer. It does not track a recipient opening a real email.</p>
    {message && <p role="status" className="la-local-tracking-message">{message}</p>}
    <div className="la-records-table-wrap"><table className="la-table la-records-table"><thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Image loads</th><th>Last load</th><th>Actions</th></tr></thead><tbody>
      {records.map((record) => <tr key={record.id}><td>{record.recipient}</td><td>{record.subject}</td><td>{record.openCount ? 'Open detected' : 'No open detected'}</td><td>{record.openCount}</td><td>{record.lastOpenedAt ? new Date(record.lastOpenedAt).toLocaleString() : '—'}</td><td><div className="la-local-tracking-actions"><button type="button" title="Open preview" aria-label={`Open preview for ${record.recipient}`} onClick={() => void preview(record.id)}><FiExternalLink size={17} aria-hidden="true" /></button><button type="button" title="Delete test record" aria-label={`Delete tracking test for ${record.recipient}`} disabled={deletingId === record.id} onClick={() => void remove(record)}><MdOutlineDeleteOutline size={19} aria-hidden="true" /></button></div></td></tr>)}
    </tbody></table>{!records.length && <EmptyTable title="No test records yet" description="Create a record above to test local open detection." />}</div>
  </section>
}
