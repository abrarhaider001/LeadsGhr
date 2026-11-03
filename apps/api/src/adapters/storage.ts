import type { SupabaseClient } from '@supabase/supabase-js'
import { leadSchema, type Lead } from '@leadsghr/schemas'
import type { StorageAdapter } from '@leadsghr/platform'

export class WebStorageAdapter implements StorageAdapter {
  constructor(private readonly db: SupabaseClient) {}

  async saveLead(lead: Lead): Promise<Lead> {
    const parsed = leadSchema.parse(lead)
    const id = parsed.id ?? crypto.randomUUID()
    const payload = { ...parsed, id }
    const { data, error } = await this.db.from('lead').upsert({ id, org_id: parsed.orgId, payload }, { onConflict: 'id' }).select('payload').single()
    if (error) throw error
    return leadSchema.parse(data.payload)
  }

  async getLead(orgId: string, id: string): Promise<Lead | null> {
    const { data, error } = await this.db.from('lead').select('payload').eq('org_id', orgId).eq('id', id).maybeSingle()
    if (error) throw error
    return data ? leadSchema.parse(data.payload) : null
  }

  async listLeads(orgId: string, limit: number): Promise<Lead[]> {
    const { data, error } = await this.db.from('lead').select('payload').eq('org_id', orgId).limit(Math.min(Math.max(limit, 1), 1000))
    if (error) throw error
    return (data ?? []).map((row) => leadSchema.parse(row.payload))
  }
}
