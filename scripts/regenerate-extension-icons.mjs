// Regenerates the Chrome extension icons from the design tokens (packages/ui/src/tokens.css, light theme),
// so the extension logos use the same colours as the app. Run from the repository root:
//   node scripts/regenerate-extension-icons.mjs
// Writes:
//   apps/mailer-extension/public/icon.svg and icon.png (128 px)  - LeadsGhr Mailer toolbar and popup icon
//   apps/scraper-extension/public/icon.svg and icon.png (128 px) - LeadsGhr Scraper toolbar and popup icon (gear, globe, cursor)
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
// LeadsGhr Scraper (owner-chosen W1, 2026-11-24): flat like the Mailer, no tile. A charcoal gear holding a white
// globe (charcoal lines), and a cursor in the brand green gradient with a white edge over its lower right.
const scraper = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 1024 1024" role="img" aria-label="LeadsGhr Scraper logo">
  <defs>
    <linearGradient id="cursor" x1="900" y1="120" x2="200" y2="800" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${t.get('brand-accent')}"/>
      <stop offset="0.55" stop-color="${t.get('brand-primary')}"/>
      <stop offset="1" stop-color="${t.get('brand-primary-hover')}"/>
    </linearGradient>
  </defs>
  <path d="M365.5 167.5 L408.0 156.1 L424.1 72.6 L515.9 72.6 L532.0 156.1 L610.0 182.2 L648.2 204.2 L718.5 156.6 L783.4 221.5 L735.8 291.8 L772.5 365.5 L783.9 408.0 L867.4 424.1 L867.4 515.9 L783.9 532.0 L757.8 610.0 L735.8 648.2 L783.4 718.5 L718.5 783.4 L648.2 735.8 L574.5 772.5 L532.0 783.9 L515.9 867.4 L424.1 867.4 L408.0 783.9 L330.0 757.8 L291.8 735.8 L221.5 783.4 L156.6 718.5 L204.2 648.2 L167.5 574.5 L156.1 532.0 L72.6 515.9 L72.6 424.1 L156.1 408.0 L182.2 330.0 L204.2 291.8 L156.6 221.5 L221.5 156.6 L291.8 204.2 Z" fill="${t.get('brand-ink')}" stroke="${t.get('brand-ink')}" stroke-width="30" stroke-linejoin="round"/>
  <circle cx="470" cy="470" r="250" fill="${t.get('on-primary')}"/>
  <g fill="none" stroke="${t.get('brand-ink')}" stroke-width="34" stroke-linecap="round">
    <circle cx="470" cy="470" r="190"/><path d="M280 470 H660"/><path d="M299 384.5 H641 M299 555.5 H641"/>
    <ellipse cx="470" cy="470" rx="85.5" ry="190"/><path d="M470 280 V660"/>
  </g>
  <path d="M520.0 500.0 L520.0 920.0 L629.2 819.2 L704.8 970.4 L772.0 936.8 L696.4 785.6 L839.2 785.6 Z" fill="url(#cursor)" stroke="${t.get('on-primary')}" stroke-width="34" stroke-linejoin="round"/>
</svg>
`
mkdirSync('apps/scraper-extension/public', { recursive: true })
writeFileSync('apps/scraper-extension/public/icon.svg', scraper)
writeFileSync('apps/scraper-extension/public/icon.png', png(scraper, 128))
console.log('Extension icons regenerated.')
