import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = 'public'
const source = join(root, 'leadsghr-lg-monogram-transparent.png')
const image = `data:image/png;base64,${readFileSync(source).toString('base64')}`

// Embed the approved, cleaned transparent monogram so every SVG is self-contained.
const mark = `<image width="1024" height="1024" href="${image}"/>`
const sizes = [16, 32, 64, 128, 256, 512, 1024]
const symbol = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024" role="img" aria-label="LeadsGhr logo">
  ${mark}
</svg>
`
writeFileSync(join(root, 'logo-leadsghr.svg'), symbol(1024))
for (const size of sizes) writeFileSync(join(root, `logo-leadsghr-${size}x${size}.svg`), symbol(size))

const full = (sidebar) => `<svg xmlns="http://www.w3.org/2000/svg" width="2149" height="732" viewBox="0 0 2149 732" role="img" aria-label="LeadsGhr logo">
  <svg x="80" y="106" width="520" height="520" viewBox="0 0 1024 1024">${mark}</svg>
  <text x="670" y="500" font-family="Arial, Helvetica, sans-serif" font-size="270" font-weight="800" letter-spacing="-12" fill="${sidebar ? '#FFFFFF' : '#190B2D'}">Leads<tspan fill="${sidebar ? '#C983FF' : '#5B12C9'}">Ghr</tspan></text>
</svg>
`
writeFileSync(join(root, 'leadsghr-logo-v1.svg'), full(false))
writeFileSync(join(root, 'leadsghr-logo-sidebar.svg'), full(true))
