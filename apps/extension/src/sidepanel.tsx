import React from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Card, Icon } from '@leadsghr/ui'
import '@leadsghr/ui/styles.css'

function SidePanel() {
  return <main style={{padding:16}}><h1>LeadsGhr Lite</h1><Card><h2>Quick scan</h2><p>Open a public company site, then grant access to that site to scan it.</p><Button disabled><Icon name="search"/> Scan this site</Button><p>Scanning will be enabled after the compliance guard and platform adapters are complete.</p></Card></main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><SidePanel/></React.StrictMode>)
