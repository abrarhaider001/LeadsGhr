import { contextBridge, ipcRenderer } from 'electron'
import { scanRequestSchema, searchCriteriaSchema, mapsScanSchema, desktopPreferencesSchema, createCrawlRunSchema, crawlRunIdSchema, crawlRunRowInputSchema, crawlRunProgressSchema } from '@leadsghr/schemas'

contextBridge.exposeInMainWorld('leadsGhrDesktop', {
  scan: (input: unknown) => ipcRenderer.invoke('leadsghr:scan', scanRequestSchema.parse(input)),
  leads: () => ipcRenderer.invoke('leadsghr:leads'),
  runs: () => ipcRenderer.invoke('leadsghr:runs'),
  createCrawlRun: (input: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:create', createCrawlRunSchema.parse(input)),
  getCrawlRun: (id: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:get', crawlRunIdSchema.parse(id)),
  deleteCrawlRun: (id: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:delete', crawlRunIdSchema.parse(id)),
  listCrawlRuns: () => ipcRenderer.invoke('leadsghr:crawl-runs:list'),
  listCrawlExports: () => ipcRenderer.invoke('leadsghr:crawl-runs:exports'),
  saveCrawlRow: (input: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:row', crawlRunRowInputSchema.parse(input)),
  filterCrawlRunEmails: (id: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:filter-emails', crawlRunIdSchema.parse(id)),
  enqueuePipelineWebsite: (input: unknown) => ipcRenderer.invoke('leadsghr:pipeline-pages:enqueue', crawlRunRowInputSchema.parse(input)),
  listPipelinePages: (id: unknown) => ipcRenderer.invoke('leadsghr:pipeline-pages:list', crawlRunIdSchema.parse(id)),
  startPipelinePages: (id: unknown) => ipcRenderer.invoke('leadsghr:pipeline-pages:start', crawlRunIdSchema.parse(id)),
  pausePipelinePages: (id: unknown) => ipcRenderer.invoke('leadsghr:pipeline-pages:pause', crawlRunIdSchema.parse(id)),
  onPipelinePagesEvent: (callback: (message: unknown) => void) => { const listener = (_event: unknown, message: unknown) => callback(message); ipcRenderer.on('leadsghr:pipeline-pages:event', listener); return () => ipcRenderer.removeListener('leadsghr:pipeline-pages:event', listener) },
  updateCrawlRun: (input: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:progress', crawlRunProgressSchema.parse(input)),
  exportCrawlRun: (id: unknown, saveAs = false) => ipcRenderer.invoke('leadsghr:crawl-runs:export', crawlRunIdSchema.parse(id), saveAs === true),
  reexportCrawlSnapshot: (id: unknown) => ipcRenderer.invoke('leadsghr:crawl-runs:reexport-snapshot', crawlRunIdSchema.parse(id)),
  startMapsScan: (input: unknown) => ipcRenderer.invoke('leadsghr:maps-scan:start', mapsScanSchema.parse(input)),
  stopMapsScan: (id: string) => ipcRenderer.invoke('leadsghr:maps-scan:stop', id),
  openWebsite: (url: string) => ipcRenderer.invoke('leadsghr:website:open', url),
  onMapsScanEvent: (callback: (message: unknown) => void) => { const listener = (_event: unknown, message: unknown) => callback(message); ipcRenderer.on('leadsghr:maps-scan:event', listener); return () => ipcRenderer.removeListener('leadsghr:maps-scan:event', listener) },
  loadPreferences: () => ipcRenderer.invoke('leadsghr:preferences:load'),
  savePreferences: (input: unknown) => ipcRenderer.invoke('leadsghr:preferences:save', desktopPreferencesSchema.parse(input)),
  loadSearchCriteria: () => ipcRenderer.invoke('leadsghr:search-criteria:load'),
  saveSearchCriteria: (input: unknown) => ipcRenderer.invoke('leadsghr:search-criteria:save', searchCriteriaSchema.parse(input)),
  prepareCrawlerTest: (input: unknown) => ipcRenderer.invoke('leadsghr:crawler-test:prepare', scanRequestSchema.parse(input)),
})

