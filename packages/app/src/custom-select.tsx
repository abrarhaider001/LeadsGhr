import { useEffect, useRef, useState } from 'react'
import { Icon } from '@leadsghr/ui'

type Option = { value: string; label: string }

export function CustomSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange(value: string): void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)?.label ?? label

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="la-select" ref={root}>
      <button
        type="button"
        className="la-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <span>{selected}</span>
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div
          className="la-select-menu"
          role="listbox"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              root.current?.querySelector('button')?.focus()
            }
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
