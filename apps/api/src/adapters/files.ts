import type { SupabaseClient } from '@supabase/supabase-js'
import type { FileSaveAdapter } from '@leadsghr/platform'

export class WebFileSaveAdapter implements FileSaveAdapter {
  constructor(private readonly db: SupabaseClient, private readonly orgId: string) {}
  async save(name: string, bytes: Uint8Array, mimeType: string): Promise<string> {
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${this.orgId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await this.db.storage.from('exports').upload(path, bytes, { contentType: mimeType, upsert: false })
    if (error) throw error
    return path
  }
}
