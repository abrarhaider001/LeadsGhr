import { useEffect, useState } from 'react'
import { DATA_CHANGED_KEY } from './data-folder'
import { deleteTemplate, loadTemplates, saveTemplate } from './storage'
import { readTemplateFile } from './template'
import type { SavedTemplate } from './types'

type Draft = { id: string | null; name: string; subject: string; bodyHtml: string }

const emptyDraft: Draft = { id: null, name: '', subject: '', bodyHtml: '' }

/**
 * LeadsGhr Mailer settings page: manage the saved templates the popup sends.
 * Recipients, range, delay, and Start/Pause/Stop live in the toolbar popup.
 */
export function EmailSendingPanel() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadTemplates().then(setTemplates)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (changes[DATA_CHANGED_KEY]) void loadTemplates().then(setTemplates)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  async function importFile(file: File) {
    try {
      const loaded = await readTemplateFile(file)
      setDraft((current) => ({ ...(current ?? emptyDraft), ...loaded, name: current?.name || file.name.replace(/\.[^.]+$/, '') }))
      setMessage(`Loaded ${file.name}. Review it, then save.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
  }

  async function save() {
    if (!draft) return
    const name = draft.name.trim()
    const subject = draft.subject.trim()
    if (!name || !subject || !draft.bodyHtml.trim()) { setMessage('A template needs a name, subject, and body.'); return }
    if (templates.some((item) => item.id !== draft.id && item.name.toLowerCase() === name.toLowerCase())) { setMessage(`A template named "${name}" already exists.`); return }
    try {
      await saveTemplate({ id: draft.id ?? crypto.randomUUID(), name, subject, bodyHtml: draft.bodyHtml.trim(), updatedAt: Date.now() })
      setTemplates(await loadTemplates())
      setDraft(null)
      setMessage(`Saved "${name}" to the data folder. It is now in the popup's template list.`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  async function remove(template: SavedTemplate) {
    if (!window.confirm(`Delete the template "${template.name}"?`)) return
    try {
      await deleteTemplate(template.id)
      setTemplates(await loadTemplates())
      if (draft?.id === template.id) setDraft(null)
      setMessage(`Deleted "${template.name}".`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return <>
    <section>
      <div className="section-head">
        <div><h2>Saved templates</h2><p className="muted">Pick these in the toolbar popup to send. Use {'{{email}}'} or any CSV/Excel column name, such as {'{{name}}'}, as a placeholder.</p></div>
        {!draft && <button type="button" onClick={() => { setDraft({ ...emptyDraft }); setMessage('') }}>New template</button>}
      </div>

      {draft && <div className="editor">
        <label>Name<input type="text" value={draft.name} maxLength={80} placeholder="Quick hello" onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
        <label>Subject<input type="text" value={draft.subject} maxLength={200} placeholder="Quick hello for {{name}}" onChange={(event) => setDraft({ ...draft, subject: event.target.value })}/></label>
        <label>Body (HTML or text)<textarea value={draft.bodyHtml} rows={9} placeholder={'Hi {{name}},\n\nWe help teams like {{company}}.\n\nThanks'} onChange={(event) => setDraft({ ...draft, bodyHtml: event.target.value })}/></label>
        <div className="actions">
          <button type="button" onClick={() => void save()}>{draft.id ? 'Save changes' : 'Save template'}</button>
          <label className="file-button">Import from file<input type="file" accept=".html,.htm,.txt,.json,text/html,text/plain,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = '' }}/></label>
          <button type="button" className="secondary" onClick={() => { setDraft(null); setMessage('') }}>Cancel</button>
        </div>
      </div>}

      {templates.map((item) => <div className="row" key={item.id}>
        <div className="row-main"><strong>{item.name}</strong><div className="muted">{item.subject}</div></div>
        <div className="row-actions">
          <button type="button" className="secondary" onClick={() => { setDraft({ id: item.id, name: item.name, subject: item.subject, bodyHtml: item.bodyHtml }); setMessage('') }}>Edit</button>
          <button type="button" className="secondary danger" onClick={() => void remove(item)}>Delete</button>
        </div>
      </div>)}
      {!templates.length && !draft && <p className="muted">No saved templates yet. Select New template to create one.</p>}
      {message && <p role="status">{message}</p>}
    </section>
  </>
}
