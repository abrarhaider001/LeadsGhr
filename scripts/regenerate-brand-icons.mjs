// Regenerates the desktop app icon (window, taskbar, installer) from the Growth logo's app-icon tile.
// Run from the repository root: node scripts/regenerate-brand-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const svg = readFileSync('public/leadsghr-app-icon.svg', 'utf8')
const render = (size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
writeFileSync('apps/desktop/resources/leadsghr-icon.png', render(1024))
// Every size Windows asks for, so the icon stays sharp in the taskbar, title bar, and Start menu.
writeFileSync('apps/desktop/resources/leadsghr-icon.ico', await pngToIco([16, 24, 32, 48, 64, 128, 256].map(render)))
console.log('Desktop icons regenerated.')
