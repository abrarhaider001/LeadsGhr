import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const gif = Uint8Array.from(atob('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='), character => character.charCodeAt(0))
const allowed = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-LeadsGhr-Key' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...allowed, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: allowed })
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ error: 'Invalid token' }, 400)
  const key = Deno.env.get('MAIL_TRACKING_REGISTRATION_KEY')
  if (!key) return json({ error: 'Tracking service is not configured' }, 503)
  const authorized = request.headers.get('X-LeadsGhr-Key') === key
  if (!authorized && !(request.method === 'GET' && id && url.searchParams.get('pixel') === '1')) return json({ error: 'Unauthorized' }, 401)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  if (request.method === 'POST') {
    if (id && url.searchParams.get('arm') === '1') {
      const { error } = await db.from('mail_tracking_pixels').update({ armed_at: new Date().toISOString() }).eq('id', id)
      return error ? json({ error: 'Could not arm pixel' }, 500) : json({ ok: true })
    }
    const body = await request.json().catch(() => null) as { id?: string } | null
    if (!body?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) return json({ error: 'Invalid token' }, 400)
    const { error } = await db.from('mail_tracking_pixels').insert({ id: body.id })
    return error ? json({ error: 'Could not register pixel' }, 500) : json({ ok: true }, 201)
  }
  if (request.method === 'GET' && id && url.searchParams.get('pixel') === '1') {
    await db.rpc('record_mail_pixel_load', { pixel_id: id })
    return new Response(gif, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } })
  }
  if (request.method === 'GET' && id) {
    const { data, error } = await db.from('mail_tracking_pixels').select('image_loads,first_loaded_at,last_loaded_at').eq('id', id).single()
    if (error) return json({ error: 'Pixel not found' }, 404)
    const { data: events, error: eventsError } = await db
      .from('mail_tracking_events')
      .select('observed_at')
      .eq('pixel_id', id)
      .order('observed_at', { ascending: false })
      .limit(50)
    if (eventsError) return json({ error: 'Could not read observed image-load history' }, 500)
    return json({ loads: data.image_loads, firstLoad: data.first_loaded_at, lastLoad: data.last_loaded_at, events: events.map(event => event.observed_at) })
  }
  return json({ error: 'Unsupported request' }, 405)
})
