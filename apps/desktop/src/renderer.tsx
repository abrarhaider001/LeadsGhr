import React from 'react'
import { createRoot } from 'react-dom/client'
import { LeadsGhrApp } from '@leadsghr/app'
// import '@leadsghr/ui/styles.css'
import '@leadsghr/ui/globals.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><LeadsGhrApp /></React.StrictMode>)

