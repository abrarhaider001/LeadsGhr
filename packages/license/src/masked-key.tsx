import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { applyMaskedKeyEdit, maskKeyForDisplay } from './index'

/** How long a typed key character stays visible before it turns into a dot. */
export const KEY_REVEAL_MS = 1000

/**
 * Key-field state for the license screens: the real key is kept in memory and the field shows dots, except
 * the character just typed, which stays visible for one second. Pasted text is hidden at once.
 */
export function useMaskedKey(onEdit?: () => void) {
  const [key, setKey] = useState('')
  const [reveal, setReveal] = useState(-1)
  const field = useRef<HTMLTextAreaElement>(null)
  const caret = useRef<[number, number] | null>(null)
  const display = maskKeyForDisplay(key, reveal)

  useEffect(() => {
    if (reveal < 0) return
    const timer = window.setTimeout(() => {
      const node = field.current
      if (node) caret.current = [node.selectionStart, node.selectionEnd]
      setReveal(-1)
    }, KEY_REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [key, reveal])

  // Changing the shown text (a character turning into a dot, or a paste being hidden) would move the caret to the end.
  useLayoutEffect(() => {
    const node = field.current
    if (node && caret.current && document.activeElement === node) node.setSelectionRange(caret.current[0], caret.current[1])
    caret.current = null
  }, [display])

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const node = event.target
    const next = applyMaskedKeyEdit(key, display, node.value)
    caret.current = [node.selectionStart, node.selectionEnd]
    setKey(next.key)
    setReveal(next.reveal)
    onEdit?.()
  }

  return { key, fieldProps: { ref: field, value: display, onChange } }
}
