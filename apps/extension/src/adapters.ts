import type { PlatformAdapters } from '@leadsghr/platform'

/** Explicit MV3 seam: IndexedDB, credential-free fetch, alarms and downloads. */
export function createExtensionAdapters(): PlatformAdapters {
  const unavailable = async (): Promise<never> => {
    throw new Error('Extension platform adapter not implemented')
  }
  return {
    kind: 'extension',
    storage: { saveLead: unavailable, getLead: unavailable, listLeads: unavailable },
    http: { get: unavailable },
    queue: { enqueue: unavailable },
    files: { save: unavailable },
  }
}
