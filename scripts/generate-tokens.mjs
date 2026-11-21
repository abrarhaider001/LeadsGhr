// Generates copies of the design tokens for code that cannot read CSS variables, from the single source
// packages/ui/src/tokens.css:
//   - packages/ui/src/tokens.generated.ts  (Gmail content scripts, inline styles in other pages)
//   - apps/desktop/setup/Tokens.g.cs        (the C# setup and uninstall windows)
// Runs before dev and every build (see the package.json scripts). `node scripts/generate-tokens.mjs --check`
// exits with an error when a generated file is out of date (used by the @leadsghr/ui test).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'packages/ui/src/tokens.css')
const outputs = { ts: join(root, 'packages/ui/src/tokens.generated.ts'), cs: join(root, 'apps/desktop/setup/Tokens.g.cs') }

/** Reads `--ui-name: value;` declarations from the :root block (comments removed). */
export function readTokens(css = readFileSync(source, 'utf8')) {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const raw = new Map()
  for (const m of body.matchAll(/--ui-([a-z0-9-]+)\s*:\s*([^;]+);/g)) raw.set(m[1], m[2].trim())
  return raw
}

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] }
function parseColor(text) {
  const t = text.trim().toLowerCase()
  if (NAMED[t]) return NAMED[t]
  const hex = t.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = [...h].map((c) => c + c).join('')
    const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a]
  }
  return null
}
function splitTop(text) { // split on commas that are not inside parentheses
  const parts = []; let depth = 0; let cur = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  parts.push(cur)
  return parts.map((p) => p.trim())
}
/** Resolves var() references and evaluates color-mix(in srgb, ...) and simple calc(px + px). */
export function resolve(raw) {
  const done = new Map()
  const value = (name, seen = new Set()) => {
    if (done.has(name)) return done.get(name)
    if (seen.has(name)) throw new Error(`Token --ui-${name} refers to itself`)
    seen.add(name)
    let v = raw.get(name)
    if (v === undefined) throw new Error(`Unknown token --ui-${name}`)
    v = v.replace(/var\(--ui-([a-z0-9-]+)\)/g, (_, n) => value(n, seen))
    v = v.replace(/color-mix\(in srgb,([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) => {
      const [a, b] = splitTop(inner)
      const pa = a.match(/^(.*?)\s+([\d.]+)%$/); const pb = b.match(/^(.*?)\s+([\d.]+)%$/)
      const ca = parseColor(pa ? pa[1] : a); const cb = parseColor(pb ? pb[1] : b)
      if (!ca || !cb) return `color-mix(in srgb,${inner})`
      const wa = pa ? Number(pa[2]) / 100 : pb ? 1 - Number(pb[2]) / 100 : 0.5
      const wb = 1 - wa
      const alpha = ca[3] * wa + cb[3] * wb
      const mix = [0, 1, 2].map((i) => alpha === 0 ? 0 : Math.round((ca[i] * ca[3] * wa + cb[i] * cb[3] * wb) / alpha))
      return toHex([...mix, alpha])
    })
    v = v.replace(/calc\(\s*([\d.]+)px\s*([+-])\s*([\d.]+)px\s*\)/g, (_, x, op, y) => `${op === '+' ? Number(x) + Number(y) : Number(x) - Number(y)}px`)
    done.set(name, v)
    return v
  }
  for (const name of raw.keys()) value(name)
  return done
}
function toHex([r, g, b, a = 1]) {
  const h = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase()
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a * 255) : ''}`
}
const camel = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
const pascal = (name) => camel(name).replace(/^./, (c) => c.toUpperCase())

export function render(resolved) {
  const entries = [...resolved.entries()]
  const ts = ['// Generated from packages/ui/src/tokens.css by scripts/generate-tokens.mjs. Do not edit; edit tokens.css.',
    '// Resolved values for code that cannot use CSS variables (for example Gmail content scripts).',
    'export const tokens = {',
    ...entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
    '} as const', '', 'export type TokenName = keyof typeof tokens', '']
  const colors = entries.filter(([, v]) => parseColor(v))
  const cs = ['// Generated from packages/ui/src/tokens.css by scripts/generate-tokens.mjs. Do not edit; edit tokens.css.',
    '// The colours of the LeadsGhr design tokens for the C# setup and uninstall windows.',
    'using System.Drawing;', '', 'namespace LeadsGhr.Branding', '{', '    static class Tokens', '    {',
    ...colors.map(([k, v]) => { const [r, g, b, a] = parseColor(v); return `        public static readonly Color ${pascal(k)} = Color.FromArgb(${Math.round(a * 255)}, ${r}, ${g}, ${b});` }),
    '    }', '}', '']
  return { ts: ts.join('\n'), cs: cs.join('\r\n') }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = render(resolve(readTokens()))
  const check = process.argv.includes('--check')
  let stale = []
  for (const [kind, path] of Object.entries(outputs)) {
    let current = ''
    try { current = readFileSync(path, 'utf8') } catch {}
    const lf = (text) => text.replace(/\r\n/g, '\n') // Git may convert line endings on checkout
    if (lf(current) === lf(files[kind])) continue
    if (check) stale.push(path)
    else writeFileSync(path, files[kind])
  }
  if (stale.length) { console.error(`Out of date (run pnpm.cmd tokens): ${stale.join(', ')}`); process.exit(1) }
  if (!check) console.log('Design tokens generated.')
}
