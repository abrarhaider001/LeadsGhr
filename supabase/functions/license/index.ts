import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/*
 * LeadsGhr license service (AGENTS.md, "License keys"). Called by the desktop app and every extension:
 *   POST { action: 'activate' | 'check', key, product, installationId }
 * A key is activated once per product and bound to the installation that activated it. Answers carry
 * only the status, expiry date, last eight characters, and which products the key is used on.
 */

const PRODUCTS = ['desktop', 'mailer', 'tracker'] as const
const allowed = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...allowed, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Same rules as packages/license normalizeLicenseKey and the SQL function normalize_license_key (0006): 32 characters, or an older 64-character hex key. */
function normalizeKey(input: string): string | null {
  const key = input.replace(/\s/g, '')
  if (/^[A-HJ-NP-Za-km-np-z2-9!@#$%&*?]{32}$/.test(key)) return key
  return /^[0-9A-Fa-f]{64}$/.test(key) ? key.toLowerCase() : null
}

async function sha256(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: allowed })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const body = await request.json().catch(() => null) as { action?: string; key?: string; product?: string; installationId?: string } | null
  const key = typeof body?.key === 'string' ? normalizeKey(body.key) : null
  const product = PRODUCTS.find((item) => item === body?.product)
  const installation = typeof body?.installationId === 'string' && /^[A-Za-z0-9-]{16,100}$/.test(body.installationId) ? body.installationId : null
  if (!body || !['activate', 'check'].includes(body.action ?? '') || !product || !installation) return json({ error: 'Invalid request' }, 400)
  if (!key) return json({ status: 'invalid' })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: license, error } = await db.from('license_keys').select('id, license_key, expires_at, revoked_at').eq('license_key', key).maybeSingle()
  if (error) return json({ error: 'License lookup failed' }, 500)
  if (!license) return json({ status: 'invalid' })
  if (license.revoked_at) return json({ status: 'revoked' })
  if (new Date(license.expires_at).getTime() <= Date.now()) return json({ status: 'expired', expiresAt: license.expires_at })

  const installationHash = await sha256(`leadsghr-installation:${installation}`)
  const { data: activations } = await db.from('license_activations').select('product, installation_hash, activated_at').eq('license_id', license.id)
  const slots = (list: { product: string }[] | null) => Object.fromEntries(PRODUCTS.map((item) => [item, list?.some((row) => row.product === item) ? 'used' : 'available']))
  let mine = activations?.find((row) => row.product === product)

  if (!mine && body.action === 'activate') {
    const { error: insertError } = await db.from('license_activations').insert({ license_id: license.id, product, installation_hash: installationHash })
    // A simultaneous activation of the same product wins the slot; this request then sees it as used.
    if (insertError) mine = (await db.from('license_activations').select('product, installation_hash, activated_at').eq('license_id', license.id).eq('product', product).maybeSingle()).data ?? undefined
    else mine = { product, installation_hash: installationHash, activated_at: new Date().toISOString() }
  }
  if (!mine) return json({ status: 'not_activated', expiresAt: license.expires_at, products: slots(activations) })
  if (mine.installation_hash !== installationHash) return json({ status: 'used', products: slots(activations) })

  await db.from('license_activations').update({ last_checked_at: new Date().toISOString() }).eq('license_id', license.id).eq('product', product)
  const all = [...(activations ?? []).filter((row) => row.product !== product), mine]
  return json({ status: 'active', expiresAt: license.expires_at, keyEnd: license.license_key.slice(-8), products: slots(all), activatedAt: mine.activated_at })
})
