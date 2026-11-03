import type { Lead } from '@leadsghr/schemas'

export type PlatformKind = 'desktop'
export interface StorageAdapter {
  saveLead(lead: Lead): Promise<Lead>
  getLead(orgId: string, id: string): Promise<Lead | null>
  listLeads(orgId: string, limit: number): Promise<Lead[]>
}
export interface HttpResponse { url: string; status: number; contentType: string; body: string }
export interface HttpAdapter {
  /** Reject local/private IPs, recheck redirects, and omit cookies. */
  get(url: string, options?: { maxBytes?: number; timeoutMs?: number }): Promise<HttpResponse>
}
export interface QueueAdapter { enqueue<T>(name: string, payload: T): Promise<string> }
export interface FileSaveAdapter { save(name: string, bytes: Uint8Array, mimeType: string): Promise<string> }
export interface PlatformAdapters {
  kind: PlatformKind
  storage: StorageAdapter
  http: HttpAdapter
  queue: QueueAdapter
  files: FileSaveAdapter
}
