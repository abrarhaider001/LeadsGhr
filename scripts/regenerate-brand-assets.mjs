import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = 'public'
const wordmarkPath = join(root, 'leadsghr-logo-v1.svg')

// Three public sources converge at a diamond hub and produce one highlighted lead.
// The left-to-right graph differs from a radial hub mark and stays legible at small sizes.
const mark = `<rect width="1024" height="1024" rx="180" fill="#170927"/>
  <path d="M258 260 449 451M188 512h214M258 764l191-191M684 512h140" fill="none" stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <circle cx="258" cy="260" r="63" fill="#FFFFFF"/>
  <circle cx="188" cy="512" r="63" fill="#FFFFFF"/>
  <circle cx="258" cy="764" r="63" fill="#FFFFFF"/>
  <rect x="439" y="403" width="218" height="218" rx="42" transform="rotate(45 548 512)" fill="#170927" stroke="#FFFFFF" stroke-width="70"/>
  <circle cx="824" cy="512" r="84" fill="#B66AFF"/>`
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
