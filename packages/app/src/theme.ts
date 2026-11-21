import type { DesktopPreferences } from '@leadsghr/schemas'

type ThemeChoice = DesktopPreferences['theme']
const STORAGE_KEY = 'leadsghr.theme'
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Sets data-theme on the page (the light or dark tokens in packages/ui/src/tokens.css) and remembers the choice. */
export function applyTheme(choice: ThemeChoice): void {
  const dark = choice === 'dark' || (choice === 'system' && darkQuery().matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  try { localStorage.setItem(STORAGE_KEY, choice) } catch {}
}

/** Applies the last chosen theme before the first paint, so the app does not flash the wrong theme. */
export function applySavedTheme(): void {
  let saved: string | null = null
  try { saved = localStorage.getItem(STORAGE_KEY) } catch {}
  applyTheme(saved === 'dark' || saved === 'system' ? saved : 'light')
}

/** Keeps "Match Windows" in step when the Windows setting changes; returns a cleanup function. */
export function followSystemTheme(choice: ThemeChoice): () => void {
  if (choice !== 'system') return () => {}
  const query = darkQuery()
  const update = () => applyTheme('system')
  query.addEventListener('change', update)
  return () => query.removeEventListener('change', update)
}
