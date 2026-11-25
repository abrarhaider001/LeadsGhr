import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

const glyph = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
/** Small line icons used by the popup and the settings page (colours from the surrounding text). */
export const icons = {
  check: glyph(<path d="m5 12 5 5 9-10" />),
  play: glyph(<path d="M7 5v14l12-7z" />),
  pause: glyph(<path d="M8 5v14M16 5v14" />),
  stop: glyph(<rect x="6" y="6" width="12" height="12" rx="2" />),
  stopFilled: (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
    </svg>
  ),
  gear: glyph(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>,
  ),
  pin: glyph(
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>,
  ),
  trash: glyph(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />),
  chevron: glyph(<path d="m6 9 6 6 6-6" />),
}

export type JobOption = { id: string; name: string; detail?: string }

/** The job picker: a custom dropdown like LeadsGhr Mailer's template picker (keyboard: arrows, Enter, Escape). */
export function JobSelect({
  options,
  value,
  disabled,
  labelledBy,
  onChange,
}: {
  options: JobOption[]
  value: string
  disabled?: boolean
  labelledBy: string
  onChange(id: string): void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const selected = options.find((item) => item.id === value)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function toggle() {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((item) => item.id === value)))
    setOpen((current) => !current)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (disabled) return
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      toggle()
      return
    }
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(options.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if ((event.key === 'Enter' || event.key === ' ') && options[active]) {
      event.preventDefault()
      onChange(options[active].id)
      setOpen(false)
    }
  }

  return (
    <div className="sc-select" ref={root}>
      <button
        type="button"
        className="sc-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelledBy}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? 'sc-select-value' : 'sc-select-value sc-select-placeholder'}>{selected ? selected.name : 'Choose a job'}</span>
        {icons.chevron}
      </button>
      {open && (
        <ul className="sc-menu" role="listbox" aria-labelledby={labelledBy}>
          {options.map((item, index) => (
            <li
              key={item.id}
              role="option"
              aria-selected={item.id === value}
              className={`sc-option${index === active ? ' sc-option-active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => {
                onChange(item.id)
                setOpen(false)
              }}
            >
              <span>{item.name}</span>
              {item.detail && <small>{item.detail}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
