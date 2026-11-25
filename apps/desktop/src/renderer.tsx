import React from 'react'
import { createRoot } from 'react-dom/client'
import { LeadsGhrApp, applySavedTheme } from '@leadsghr/app'
// import '@leadsghr/ui/styles.css'
import '@leadsghr/ui/globals.css'

applySavedTheme() // light or dark before the first paint (Settings → Preferences → Appearance)
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LeadsGhrApp />
  </React.StrictMode>,
)
