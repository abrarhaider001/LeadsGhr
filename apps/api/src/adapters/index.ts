import { createClient } from '@supabase/supabase-js'
import PgBoss from 'pg-boss'
import type { PlatformAdapters } from '@leadsghr/platform'
import { WebStorageAdapter } from './storage'
import { WebHttpAdapter } from './http'
import { WebQueueAdapter } from './queue'
import { WebFileSaveAdapter } from './files'

export interface WebAdapterConfig { supabaseUrl: string; serviceRoleKey: string; databaseUrl: string; orgId: string }
export async function createWebAdapters(config: WebAdapterConfig): Promise<PlatformAdapters & { close(): Promise<void> }> {
  const db = createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false } })
  const boss = new PgBoss(config.databaseUrl)
  await boss.start()
  return {
    kind: 'web', storage: new WebStorageAdapter(db), http: new WebHttpAdapter(),
    queue: new WebQueueAdapter(boss), files: new WebFileSaveAdapter(db, config.orgId),
    close: () => boss.stop(),
  }
}
