// Regenerates the Chrome extension icons from the design tokens (packages/ui/src/tokens.css, light theme),
// so the extension logos use the same colours as the app. Run from the repository root:
//   node scripts/regenerate-extension-icons.mjs
// Writes:
//   apps/mailer-extension/public/icon.svg and icon.png (128 px)  - LeadsGhr Mailer toolbar and popup icon
//   apps/scraper-extension/public/icon.svg and icon.png (128 px) - LeadsGhr Scraper toolbar and popup icon (robot head)
//   apps/extension/public/icon.svg and icon.png (128 px)         - LeadsGhr Tracker toolbar and popup icon
//   apps/mailer-extension/email-assets/leadsghr-mailer-logo.png - image used in outgoing emails (upload it to the
//     Supabase `assets` bucket under email-assets/ yourself; uploading is a live service change)
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const { readTokens, resolve } = await import(pathToFileURL(join(process.cwd(), 'scripts/generate-tokens.mjs')).href)
const t = resolve(readTokens())
const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()

// LeadsGhr Mailer: a faceted paper plane. Upper wing in the brand green gradient, lower wing in the ink colour.
const mailer = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 1024 1024" role="img" aria-label="LeadsGhr Mailer logo">
  <defs>
    <linearGradient id="wing" x1="900" y1="120" x2="260" y2="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${t.get('brand-accent')}"/>
      <stop offset="0.55" stop-color="${t.get('brand-primary')}"/>
      <stop offset="1" stop-color="${t.get('brand-primary-hover')}"/>
    </linearGradient>
  </defs>
  <!-- Upper wing: the brand green (generated from tokens.css by scripts/regenerate-extension-icons.mjs) -->
  <path d="M922 102 L70 462 L438 590 Z" fill="url(#wing)"/>
  <!-- Lower wing: the ink colour -->
  <path d="M922 102 L484 626 L612 930 Z" fill="${t.get('brand-ink')}"/>
</svg>
`
writeFileSync('apps/mailer-extension/public/icon.svg', mailer)
writeFileSync('apps/mailer-extension/public/icon.png', png(mailer, 128))
writeFileSync('apps/mailer-extension/email-assets/leadsghr-mailer-logo.png', png(mailer, 128))
// LeadsGhr Tracker: a double tick on the charcoal tile (like the LeadsGhr app icon): "sent" in white, "opened" in green.
const tracker = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 1024 1024" role="img" aria-label="LeadsGhr Tracker logo">
  <rect x="96" y="96" width="832" height="832" rx="190" fill="${t.get('brand-ink')}"/>
  <path d="M250 560 L380 690 L600 430" fill="none" stroke="${t.get('on-primary')}" stroke-width="88" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M520 640 L570 690 L790 430" fill="none" stroke="${t.get('brand-accent')}" stroke-width="88" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
writeFileSync('apps/extension/public/icon.svg', tracker)
writeFileSync('apps/extension/public/icon.png', png(tracker, 128))
// LeadsGhr Scraper (owner-chosen R2, 2026-11-24): like the Tracker, a charcoal tile; on it a solid white robot head
// with ears and an antenna, green eyes and antenna light, and a charcoal mouth.
const scraper = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 1024 1024" role="img" aria-label="LeadsGhr Scraper logo">
  <rect x="96" y="96" width="832" height="832" rx="190" fill="${t.get('brand-ink')}"/>
  <rect x="250" y="360" width="524" height="410" rx="110" fill="${t.get('on-primary')}"/>
  <rect x="180" y="500" width="70" height="140" rx="35" fill="${t.get('on-primary')}"/>
  <rect x="774" y="500" width="70" height="140" rx="35" fill="${t.get('on-primary')}"/>
  <rect x="484" y="250" width="56" height="130" rx="28" fill="${t.get('on-primary')}"/>
  <circle cx="512" cy="230" r="58" fill="${t.get('brand-accent')}"/>
  <circle cx="415" cy="540" r="58" fill="${t.get('brand-accent')}"/>
  <circle cx="609" cy="540" r="58" fill="${t.get('brand-accent')}"/>
  <rect x="410" y="650" width="204" height="40" rx="20" fill="${t.get('brand-ink')}"/>
</svg>
`
mkdirSync('apps/scraper-extension/public', { recursive: true })
writeFileSync('apps/scraper-extension/public/icon.svg', scraper)
writeFileSync('apps/scraper-extension/public/icon.png', png(scraper, 128))
console.log('Extension icons regenerated.')
