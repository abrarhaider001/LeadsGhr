import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = 'public'
const wordmarkPath = join(root, 'leadsghr-logo-v1.svg')

// A compact L and rising stroke form the LeadsGhr mark. Keep all shapes inside the tile.
const mark = `<rect width="1024" height="1024" rx="170" fill="#170927"/>
  <path d="M210 230h120v450h215v114H210V230Z" fill="#FFFFFF"/>
  <path d="m375 555 285-285 86 86-285 285-86-86Z" fill="#FFFFFF"/>
  <path d="M665 230h135v135H665z" fill="#A932F5"/>`
const sizes = [16, 32, 64, 128, 256, 512, 1024]
const symbol = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024" role="img" aria-label="LeadsGhr logo">
  ${mark}
</svg>
`
writeFileSync(join(root, 'logo-leadsghr.svg'), symbol(1024))
for (const size of sizes) writeFileSync(join(root, `logo-leadsghr-${size}x${size}.svg`), symbol(size))

const full = (sidebar) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2149" height="732" viewBox="0 0 2149 732" role="img" aria-label="LeadsGhr logo">
  <g transform="translate(100 110) scale(.49)">${mark}</g>
  <text x="670" y="500" font-family="Arial, Helvetica, sans-serif" font-size="270" font-weight="800" letter-spacing="-12" fill="${sidebar ? '#FFFFFF' : '#190B2D'}">Leads<tspan fill="${sidebar ? '#C983FF' : '#5B12C9'}">Ghr</tspan></text>
</svg>
`
}
writeFileSync(wordmarkPath, full(false))
writeFileSync(join(root, 'leadsghr-logo-sidebar.svg'), full(true))
