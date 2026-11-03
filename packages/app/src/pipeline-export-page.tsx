import type { CrawlExport } from '@leadsghr/schemas'
import { Icon } from '@leadsghr/ui'
import { formatBytes } from './crawl-run-bridge'

export function PipelineExportPage({ item, onPipeline, onExports }: { item: CrawlExport; onPipeline(): void; onExports(): void }) {
  return <div className="la-pipeline-export">
    <div className="la-pipeline-export-mark"><Icon name="exports" size={28}/></div>
    <h2>Pipeline exported</h2><p>The crawl results were saved to this CSV file.</p>
    <dl><div><dt>File</dt><dd>{item.fileName}</dd></div><div><dt>Entries</dt><dd>{item.entryCount.toLocaleString()}</dd></div><div><dt>Size</dt><dd>{formatBytes(item.fileSize)}</dd></div><div><dt>Location</dt><dd className="la-pipeline-export-path">{item.filePath}</dd></div></dl>
    <div className="la-pipeline-export-actions"><button type="button" className="la-button" onClick={onPipeline}>View pipelines</button><button type="button" className="la-button secondary" onClick={onExports}>Export history</button></div>
  </div>
}
