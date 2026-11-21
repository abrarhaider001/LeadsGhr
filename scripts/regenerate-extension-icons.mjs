// Regenerates the Chrome extension icons from the design tokens (packages/ui/src/tokens.css, light theme),
// so the extension logos use the same colours as the app. Run from the repository root:
//   node scripts/regenerate-extension-icons.mjs
// Writes:
//   apps/mailer-extension/public/icon.svg and icon.png (128 px)  - LeadsGhr Mailer toolbar and popup icon
//   apps/extension/public/icon.svg and icon.png (128 px)         - LeadsGhr Tracker toolbar and popup icon
//   apps/mailer-extension/email-assets/leadsghr-mailer-logo.png - image used in outgoing emails (upload it to the
//     Supabase `assets` bucket under email-assets/ yourself; uploading is a live service change)
import { writeFileSync } from 'node:fs'
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
console.log('Extension icons regenerated.')
