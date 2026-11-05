import type { CrawlExport, CrawlRow, CrawlRunDetail, CrawlRunSummary, CreateCrawlRun } from '@leadsghr/schemas'

export type CrawlRunBridge = {
  createCrawlRun(input: CreateCrawlRun): Promise<CrawlRunDetail>
  getCrawlRun(id: string): Promise<CrawlRunDetail | null>
  listCrawlRuns(): Promise<CrawlRunSummary[]>
  listCrawlExports(): Promise<CrawlExport[]>
  deleteCrawlRun(id: string): Promise<boolean>
  saveCrawlRow(input: { id: string; row: CrawlRow }): Promise<unknown>
  filterCrawlRunEmails(id: string): Promise<{ before: number; kept: number; removed: number }>
  enqueuePipelineWebsite(input: { id: string; row: CrawlRow }): Promise<boolean>
  listPipelinePages(id: string): Promise<PipelinePage[]>
  startPipelinePages(id: string): Promise<'completed' | 'paused'>
  pausePipelinePages(id: string): Promise<boolean>
  onPipelinePagesEvent(callback: (message: { id: string; text: string; pages: PipelinePage[] }) => void): () => void
  updateCrawlRun(input: { id: string; nextQueryIndex: number; status: 'running' | 'stopped' | 'completed' | 'failed'; error?: string }): Promise<CrawlRunSummary>
  exportCrawlRun(id: string, saveAs?: boolean): Promise<CrawlExport | null>
  reexportCrawlSnapshot(id: string): Promise<CrawlExport | null>
}

export type PipelinePage = { rowKey: string; url: string; kind: 'Homepage' | 'Contact page' | 'Page'; status: 'queued' | 'fetching' | 'ready' | 'crawling' | 'crawled' | 'skipped'; emails: string[]; error: string | null }

export const crawlRunBridge = () => (window as Window & { leadsGhrDesktop?: CrawlRunBridge }).leadsGhrDesktop

export function formatBytes(bytes: number | null) {
  if (bytes === null) return '—'
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
