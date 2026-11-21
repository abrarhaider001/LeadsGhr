// Keeps tokens.css the single place that defines the product's look (see docs/theme/THEME_README.md).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const read = (path) => readFileSync(join(root, path), 'utf8')
const tokensCss = read('packages/ui/src/tokens.css')
const defined = new Set([...tokensCss.matchAll(/--ui-([a-z0-9-]+)\s*:/g)].map((m) => m[1]))

function files(dir, pattern) {
  const out = []
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name)
    if (name === 'node_modules' || name === 'dist' || name === 'email-assets') continue
    if (statSync(join(root, path)).isDirectory()) out.push(...files(path, pattern))
    else if (pattern.test(name)) out.push(path)
  }
  return out
}
// Places where colours are typed into code on purpose: third-party brand logos.
const ALLOWED_COLOURS = new Map([['packages/app/src/pipeline-provider-icon.tsx', ['#0866FF', '#0A66C2']]])
const STYLED = [
  'packages/ui/src/styles.css', 'packages/ui/src/globals.css',
  ...files('packages/ui/src', /\.tsx$/), ...files('packages/app/src', /\.tsx?$/),
  ...files('apps/extension/src', /\.tsx?$/), ...files('apps/mailer-extension/src', /\.tsx?$/),
].map((p) => p.replaceAll('\\', '/'))

test('generated token copies match tokens.css', () => {
  execFileSync(process.execPath, [join(root, 'scripts/generate-tokens.mjs'), '--check'], { stdio: 'pipe' })
})

test('no colour is typed in directly; every colour comes from a token', () => {
  const problems = []
  for (const path of STYLED) {
    const allowed = ALLOWED_COLOURS.get(path) ?? []
    for (const m of read(path).matchAll(/#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?(?:[0-9A-Fa-f]{2})?\b/g)) {
      const before = read(path).slice(Math.max(0, m.index - 12), m.index)
      if (/&$|href=["']?$|url\(\s*$/.test(before)) continue // HTML entities, anchors, URLs
      if (!allowed.includes(m[0].toUpperCase())) problems.push(`${path}: ${m[0]}`)
    }
    for (const m of read(path).matchAll(/rgba?\(\s*\d+\s*,/g)) problems.push(`${path}: ${m[0]}`)
  }
  for (const path of ['apps/desktop/setup/Brand.cs', 'apps/desktop/setup/LeadsGhrSetup.cs', 'apps/desktop/setup/LeadsGhrUninstall.cs']) {
    for (const m of read(path).matchAll(/Color\.FromArgb\(0x[^)]*\)|Color\.White|Brushes\.White/g)) problems.push(`${path}: ${m[0]}`)
  }
  assert.deepEqual(problems, [], 'Use a token from packages/ui/src/tokens.css instead')
})

test('font sizes and corner radii in the stylesheets use the token scale', () => {
  const problems = []
  for (const path of ['packages/ui/src/styles.css']) {
    const css = read(path).replace(/@font-face[^}]*\}/g, '')
    for (const m of css.matchAll(/font-size:\s*\d+(?:\.\d+)?px/g)) problems.push(`${path}: ${m[0]}`)
    for (const m of css.matchAll(/border-radius:\s*[^;}]*\d+px[^;}]*/g)) problems.push(`${path}: ${m[0]}`)
    for (const m of css.matchAll(/font(?:-family)?:[^;}]*'(?:Instrument Sans|Monaspace Neon)'/g)) problems.push(`${path}: ${m[0]}`)
  }
  assert.deepEqual(problems, [])
})

test('every token used in code exists in tokens.css', () => {
  const missing = new Set()
  for (const path of STYLED) {
    for (const m of read(path).matchAll(/--ui-([a-z0-9-]+)/g)) if (!defined.has(m[1])) missing.add(`${path}: --ui-${m[1]}`)
    for (const m of read(path).matchAll(/tokens\['([a-z0-9-]+)'\]/g)) if (!defined.has(m[1])) missing.add(`${path}: tokens['${m[1]}']`)
  }
  assert.deepEqual([...missing], [])
})

test('re-theming is a one-line change: tints follow the brand colour', async () => {
  const { readTokens, resolve } = await import(pathToFileURL(join(root, 'scripts/generate-tokens.mjs')).href)
  const raw = readTokens()
  raw.set('brand-primary', '#16A34A')
  const green = resolve(raw)
  assert.equal(green.get('color-primary'), '#16A34A')
  assert.notEqual(green.get('color-primary-soft'), resolve(readTokens()).get('color-primary-soft'))
})
