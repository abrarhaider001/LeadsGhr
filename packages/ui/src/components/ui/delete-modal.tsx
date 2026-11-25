import { useEffect, useId, useRef, type CSSProperties } from 'react'

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'grid',
  placeItems: 'center',
  padding: 'var(--ui-space-6)',
  background: 'var(--ui-color-overlay)',
}
const dialog: CSSProperties = {
  display: 'grid',
  gap: 'var(--ui-space-3)',
  width: 'min(420px, 100%)',
  padding: 'var(--ui-space-5)',
  borderRadius: 'var(--ui-radius-2xl)',
  background: 'var(--ui-color-surface)',
  boxShadow: '0 20px 50px color-mix(in srgb, var(--ui-color-shadow) 22%, transparent)',
}
const titleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--ui-color-text)',
  fontSize: 'var(--ui-text-2xl)',
  fontWeight: 'var(--ui-weight-semibold)',
}
const bodyStyle: CSSProperties = {
  margin: 0,
  color: 'var(--ui-color-text-muted)',
  fontSize: 'var(--ui-text-sm)',
  lineHeight: 1.5,
}
const errorStyle: CSSProperties = {
  margin: 0,
  color: 'var(--ui-color-danger)',
  fontSize: 'var(--ui-text-xs)',
  lineHeight: 1.5,
}
const actions: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--ui-space-2)',
  marginTop: 'var(--ui-space-2)',
}
const buttonStyle: CSSProperties = {
  minHeight: 'var(--ui-control-height-md)',
  padding: '0 var(--ui-space-3-5)',
  border: '1px solid var(--ui-color-border)',
  borderRadius: 'var(--ui-button-radius)',
  background: 'var(--ui-color-surface)',
  color: 'var(--ui-color-text)',
  font: 'inherit',
  fontSize: 'var(--ui-text-md)',
  fontWeight: 'var(--ui-weight-semibold)',
  cursor: 'pointer',
}
const dangerStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'var(--ui-color-danger)',
  background: 'var(--ui-color-danger)',
  color: 'var(--ui-color-on-primary)',
}

/** Confirmation shown before a delete. Cancel leaves the item in place; Delete runs `onConfirm`. */
export function DeleteModal({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  busy = false,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  busyLabel?: string
  busy?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  const titleId = useId()
  const bodyId = useId()
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => cancelRef.current?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return
      event.preventDefault()
      event.stopPropagation()
      onCancelRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, busy])

  if (!open) return null

  return (
    <div
      style={backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        style={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} style={titleStyle}>
          {title}
        </h2>
        <p id={bodyId} style={bodyStyle}>
          {description}
        </p>
        {error ? (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        ) : null}
        <div style={actions}>
          <button
            ref={cancelRef}
            type="button"
            style={busy ? { ...buttonStyle, opacity: 0.6, cursor: 'default' } : buttonStyle}
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            style={busy ? { ...dangerStyle, opacity: 0.6, cursor: 'default' } : dangerStyle}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
