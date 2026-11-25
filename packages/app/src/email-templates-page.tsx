import { useEffect, useId, useRef, useState } from 'react'
import {
  emailBodyLooksLikeHtml,
  type EmailTemplate,
  type EmailTemplateDraft,
} from '@leadsghr/schemas'
import { Button, DeleteModal, Icon, Input, Label, Table, Textarea } from '@leadsghr/ui'

type TemplateResult = { templates: EmailTemplate[]; synced: boolean }
type TemplateBridge = {
  listEmailTemplates(): Promise<TemplateResult>
  saveEmailTemplate(input: EmailTemplateDraft): Promise<TemplateResult>
  deleteEmailTemplate(id: string): Promise<TemplateResult>
}
type Draft = EmailTemplateDraft
type Editor = { draft: Draft; view: 'write' | 'preview' }
type Drawer = { kind: 'edit'; editor: Editor } | { kind: 'preview'; template: EmailTemplate }

const emptyDraft: Draft = { id: '', name: '', subject: '', format: 'plain', body: '' }
const bridge = () => (window as Window & { leadsGhrDesktop?: TemplateBridge }).leadsGhrDesktop

function previewDocument(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:16px;font-family:sans-serif;font-size:14px;line-height:1.5">${body}</body></html>`
}

function updatedLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function TemplatePreview({ body, format }: { body: string; format: Draft['format'] }) {
  if (!body.trim()) {
    return <p className="la-template-preview la-template-preview--empty">Nothing to preview yet.</p>
  }
  if (format === 'plain') {
    return <pre className="la-template-preview">{body}</pre>
  }
  return (
    <iframe
      className="la-template-preview-frame"
      sandbox=""
      title="HTML preview"
      srcDoc={previewDocument(body)}
    />
  )
}

export function EmailTemplatesPage() {
  const nameId = useId()
  const subjectId = useId()
  const bodyId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [query, setQuery] = useState('')
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const [drawer, setDrawer] = useState<Drawer | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<EmailTemplate | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    const api = bridge()
    if (!api?.listEmailTemplates) {
      setMessage('Restart the desktop app to use saved templates.')
      setReady(true)
      return
    }
    void api
      .listEmailTemplates()
      .then((result) => {
        if (!active) return
        setTemplates(result.templates)
        setReady(true)
      })
      .catch((error: unknown) => {
        if (!active) return
        setMessage(error instanceof Error ? error.message : 'Could not load templates.')
        setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const editorKey = drawer?.kind === 'edit' ? `edit:${drawer.editor.draft.id}` : ''
  useEffect(() => {
    if (!editorKey) return
    const frame = requestAnimationFrame(() => nameRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [editorKey])

  useEffect(() => {
    if (!drawer || pendingDelete) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer, pendingDelete])

  const needle = query.trim().toLocaleLowerCase()
  const visible = templates.filter((item) =>
    [item.name, item.subject].some((part) => part.toLocaleLowerCase().includes(needle)),
  )
  const editor = drawer?.kind === 'edit' ? drawer.editor : null
  const plainWithTags =
    editor?.draft.format === 'plain' && emailBodyLooksLikeHtml(editor.draft.body)

  function openCreate() {
    setFormError('')
    setMessage('')
    setDrawer({ kind: 'edit', editor: { draft: { ...emptyDraft }, view: 'write' } })
  }
  function openEdit(template: EmailTemplate) {
    setFormError('')
    setMessage('')
    setDrawer({
      kind: 'edit',
      editor: {
        view: 'write',
        draft: {
          id: template.id,
          name: template.name,
          subject: template.subject,
          format: template.format,
          body: template.body,
        },
      },
    })
  }
  function openPreview(template: EmailTemplate) {
    setMessage('')
    setDrawer({ kind: 'preview', template })
  }
  function patchDraft(patch: Partial<Draft>) {
    setDrawer((current) =>
      current?.kind === 'edit'
        ? { kind: 'edit', editor: { ...current.editor, draft: { ...current.editor.draft, ...patch } } }
        : current,
    )
  }
  function setView(view: Editor['view']) {
    setDrawer((current) =>
      current?.kind === 'edit' ? { kind: 'edit', editor: { ...current.editor, view } } : current,
    )
  }
  function applyResult(result: TemplateResult, notice: string) {
    setTemplates(result.templates)
    setMessage(
      result.synced ? notice : `${notice} LeadsGhr Mailer could not be updated.`,
    )
  }

  async function save() {
    if (!editor) return
    const draft: Draft = {
      ...editor.draft,
      id: editor.draft.id || crypto.randomUUID(),
      name: editor.draft.name.trim(),
      subject: editor.draft.subject.trim(),
      body: editor.draft.body.trim(),
    }
    if (!draft.name || !draft.subject || !draft.body) {
      setFormError('A template needs a name, subject, and body.')
      return
    }
    if (
      templates.some(
        (item) => item.id !== draft.id && item.name.toLocaleLowerCase() === draft.name.toLocaleLowerCase(),
      )
    ) {
      setFormError(`A template named "${draft.name}" already exists.`)
      return
    }
    const api = bridge()
    if (!api?.saveEmailTemplate) {
      setFormError('Restart the desktop app to save templates.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const result = await api.saveEmailTemplate(draft)
      applyResult(result, editor.draft.id ? `Saved "${draft.name}".` : `Added "${draft.name}".`)
      setDrawer(null)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the template.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const api = bridge()
    if (!api?.deleteEmailTemplate) {
      setDeleteError('Restart the desktop app to delete templates.')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      const result = await api.deleteEmailTemplate(pendingDelete.id)
      applyResult(result, `Deleted "${pendingDelete.name}".`)
      if (drawer?.kind === 'edit' && drawer.editor.draft.id === pendingDelete.id) setDrawer(null)
      if (drawer?.kind === 'preview' && drawer.template.id === pendingDelete.id) setDrawer(null)
      setPendingDelete(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete the template.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="la-templates">
      <div className="la-section-heading">
        <div>
          <h2>Saved templates</h2>
          <p>
            Plain text keeps its line breaks. HTML is previewed as the message. Placeholders such as{' '}
            {'{{name}}'} stay as written until a send fills them.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Icon name="add" size={16} /> Add template
        </Button>
      </div>
      <div className="la-templates-toolbar">
        <label className="la-templates-search">
          <Icon name="search" size={15} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
          />
        </label>
        <span className="la-templates-count">
          {ready ? `${templates.length} template${templates.length === 1 ? '' : 's'}` : 'Loading…'}
        </span>
      </div>
      {ready && (
        <Table
          data={visible}
          loading={false}
          paginator={false}
          tableClassName="la-template-table"
          rowKey={(item) => item.id}
          columns={[
            {
              field: 'name',
              header: 'Name',
              cell: (item) => <span title={item.name}>{item.name}</span>,
            },
            {
              field: 'subject',
              header: 'Subject',
              cell: (item) => <span title={item.subject}>{item.subject}</span>,
            },
            {
              field: 'format',
              header: 'Type',
              cell: (item) => (
                <span
                  className={
                    item.format === 'html' ? 'la-template-pill la-template-pill--html' : 'la-template-pill'
                  }
                >
                  {item.format === 'html' ? 'HTML' : 'Plain'}
                </span>
              ),
            },
            {
              field: 'updatedAt',
              header: 'Updated',
              cell: (item) => (
                <span title={new Date(item.updatedAt).toLocaleString()}>{updatedLabel(item.updatedAt)}</span>
              ),
            },
            {
              field: 'action',
              header: 'Actions',
              cell: (item) => (
                <div className="la-template-actions">
                  <button type="button" title="Edit" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    title="Preview"
                    aria-label={`Preview ${item.name}`}
                    onClick={() => openPreview(item)}
                  >
                    <Icon name="eye" size={15} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    title="Delete"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => {
                      setDeleteError('')
                      setPendingDelete(item)
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
      {message && (
        <p className="la-template-message" role="status">
          {message}
        </p>
      )}
      {drawer && (
        <div
          className="la-niche-panel-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDrawer(null)
          }}
        >
          <aside
            className="la-niche-panel la-template-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="la-template-drawer-title"
          >
            {drawer.kind === 'preview' ? (
              <>
                <div className="la-niche-panel-heading">
                  <div>
                    <h2 id="la-template-drawer-title">{drawer.template.name}</h2>
                    <p>{drawer.template.subject}</p>
                  </div>
                  <button
                    type="button"
                    className="la-niche-panel-close"
                    aria-label="Close preview"
                    onClick={() => setDrawer(null)}
                  >
                    &times;
                  </button>
                </div>
                <span
                  className={
                    drawer.template.format === 'html'
                      ? 'la-template-pill la-template-pill--html'
                      : 'la-template-pill'
                  }
                >
                  {drawer.template.format === 'html' ? 'HTML' : 'Plain text'}
                </span>
                <div className="la-template-preview-pane">
                  <TemplatePreview body={drawer.template.body} format={drawer.template.format} />
                </div>
                <div className="la-template-drawer-actions">
                  <Button type="button" onClick={() => openEdit(drawer.template)}>
                    Edit template
                  </Button>
                </div>
              </>
            ) : (
              <form
                className="la-template-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void save()
                }}
              >
                <div className="la-niche-panel-heading">
                  <div>
                    <h2 id="la-template-drawer-title">
                      {editor?.draft.id ? 'Edit template' : 'Add template'}
                    </h2>
                    <p>Name the message, choose plain text or HTML, and preview it before saving.</p>
                  </div>
                  <button
                    type="button"
                    className="la-niche-panel-close"
                    aria-label="Close template panel"
                    onClick={() => setDrawer(null)}
                  >
                    &times;
                  </button>
                </div>
                <div className="la-template-field">
                  <Label htmlFor={nameId}>Name</Label>
                  <Input
                    ref={nameRef}
                    id={nameId}
                    value={editor?.draft.name ?? ''}
                    maxLength={80}
                    placeholder="Introduction"
                    onChange={(event) => patchDraft({ name: event.target.value })}
                  />
                </div>
                <div className="la-template-field">
                  <Label htmlFor={subjectId}>Subject</Label>
                  <Input
                    id={subjectId}
                    value={editor?.draft.subject ?? ''}
                    maxLength={200}
                    placeholder="Hello {{name}}"
                    onChange={(event) => patchDraft({ subject: event.target.value })}
                  />
                </div>
                <fieldset className="la-template-format">
                  <legend>Format</legend>
                  <button
                    type="button"
                    aria-pressed={editor?.draft.format === 'plain'}
                    onClick={() => patchDraft({ format: 'plain' })}
                  >
                    <strong>Plain text</strong>
                    <small>Line breaks kept</small>
                  </button>
                  <button
                    type="button"
                    aria-pressed={editor?.draft.format === 'html'}
                    onClick={() => patchDraft({ format: 'html' })}
                  >
                    <strong>HTML</strong>
                    <small>Shown as a message</small>
                  </button>
                </fieldset>
                <div className="la-template-field la-template-body-field">
                  <div className="la-template-body-head">
                    <Label htmlFor={bodyId}>Body</Label>
                    <div className="la-template-switch" role="tablist" aria-label="Body view">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={editor?.view === 'write'}
                        onClick={() => setView('write')}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={editor?.view === 'preview'}
                        onClick={() => setView('preview')}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                  {editor?.view === 'preview' ? (
                    <div className="la-template-preview-pane">
                      <TemplatePreview body={editor.draft.body} format={editor.draft.format} />
                    </div>
                  ) : (
                    <Textarea
                      id={bodyId}
                      value={editor?.draft.body ?? ''}
                      maxLength={200_000}
                      spellCheck={editor?.draft.format === 'plain'}
                      placeholder={
                        editor?.draft.format === 'html'
                          ? '<p>Hi {{name}},</p>'
                          : 'Hi {{name}},\n\nWe help teams like {{company}}.'
                      }
                      onChange={(event) => patchDraft({ body: event.target.value })}
                    />
                  )}
                </div>
                {plainWithTags ? (
                  <p className="la-template-warning" role="status">
                    This body contains HTML tags. Choose HTML to preview it as a message, or remove
                    the tags to keep it plain. LeadsGhr Mailer sends tagged bodies as HTML.
                  </p>
                ) : (
                  <p className="la-template-note">
                    Use {'{{column}}'} for a value from the recipient file, such as {'{{name}}'}.
                  </p>
                )}
                {formError && (
                  <p className="la-template-warning" role="alert">
                    {formError}
                  </p>
                )}
                <div className="la-template-drawer-actions">
                  <Button type="button" variant="secondary" onClick={() => setDrawer(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editor?.draft.id ? 'Save changes' : 'Save template'}
                  </Button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
      <DeleteModal
        open={pendingDelete !== null}
        title="Delete template?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed from this computer and from LeadsGhr Mailer.`
            : ''
        }
        busy={deleting}
        error={deleteError}
        onCancel={() => {
          if (deleting) return
          setPendingDelete(null)
          setDeleteError('')
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
