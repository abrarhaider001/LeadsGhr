import { useState } from 'react'
import { Card, EmptyTable, Icon, type IconName } from '@leadsghr/ui'
import type { CrawlRunSummary } from '@leadsghr/schemas'
import { formatBytes } from './crawl-run-bridge'

type Range = '7D' | '30D' | '90D' | '1Y'
const rangeDays: Record<Range, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 }

export function DashboardPage({
  onNavigate,
  crawlRuns,
  exportCount,
  onExport,
}: {
  onNavigate(page: string): void
  crawlRuns: CrawlRunSummary[]
  exportCount: number
  onExport(id: string): void
}) {
  const [range, setRange] = useState<Range>('30D')
  const totalResults = crawlRuns.reduce((sum, run) => sum + run.entryCount, 0)
  const completedRuns = crawlRuns.filter((run) => run.status === 'completed').length
  const activeRuns = crawlRuns.filter((run) => run.status === 'running').length
  const stoppedRuns = crawlRuns.filter(
    (run) => run.status === 'stopped' || run.status === 'failed',
  ).length
  const metrics: { label: string; value: string; detail: string; icon: IconName }[] = [
    {
      label: 'Results saved',
      value: totalResults.toLocaleString(),
      detail: 'Across local pipeline runs',
      icon: 'leads',
    },
    {
      label: 'Pipelines',
      value: crawlRuns.length.toLocaleString(),
      detail: `${activeRuns} running`,
      icon: 'runs',
    },
    {
      label: 'Completed',
      value: completedRuns.toLocaleString(),
      detail: `${stoppedRuns} stopped or failed`,
      icon: 'dashboard',
    },
    {
      label: 'CSV exports',
      value: exportCount.toLocaleString(),
      detail: 'Saved on this computer',
      icon: 'exports',
    },
  ]
  const days = rangeDays[range]
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(today.getTime() - (days - 1) * 86_400_000)
  const daily = Array.from({ length: days }, () => 0)
  for (const run of crawlRuns) {
    const day = new Date(run.startedAt)
    if (Number.isNaN(day.getTime())) continue
    day.setUTCHours(0, 0, 0, 0)
    const index = Math.round((day.getTime() - start.getTime()) / 86_400_000)
    if (index >= 0 && index < days) daily[index] += run.entryCount
  }
  const visibleBars =
    days > 90
      ? daily
          .filter((_, index) => index % 7 === 0)
          .map((_, bucket) =>
            daily.slice(bucket * 7, bucket * 7 + 7).reduce((sum, value) => sum + value, 0),
          )
      : daily
  const maximum = Math.max(0, ...visibleBars)
  const scale = Math.max(1, maximum)
  const points = visibleBars
    .map(
      (value, index) =>
        `${(index + 0.5) * (960 / visibleBars.length)},${160 - (value / scale) * 135}`,
    )
    .join(' ')

  return (
    <div className="la-dashboard">
      <div className="la-dashboard-metrics">
        {metrics.map(({ label, value, detail, icon }) => (
          <Card key={label} className="la-dashboard-metric">
            <div className="la-dashboard-metric-icon">
              <Icon name={icon} size={19} />
            </div>
            <div className="la-dashboard-metric-copy">
              <span>
                {label} <Icon name="info" size={13} />
              </span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          </Card>
        ))}
      </div>

      <div className="la-dashboard-middle">
        <Card className="la-dashboard-chart-card">
          <div className="la-card-heading">
            <h3>Saved results by run date</h3>
            <div className="la-range" role="group" aria-label="Chart range">
              {(['7D', '30D', '90D', '1Y'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={range === item}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="la-chart-layout">
            <div className="la-chart-axis">
              <span>{maximum.toLocaleString()}</span>
              <span>{Math.round(maximum * 0.75).toLocaleString()}</span>
              <span>{Math.round(maximum * 0.5).toLocaleString()}</span>
              <span>{Math.round(maximum * 0.25).toLocaleString()}</span>
              <span>0</span>
            </div>
            <svg
              className="la-dashboard-chart"
              viewBox="0 0 960 175"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${totalResults.toLocaleString()} saved results across local pipeline runs; ${range} view`}
            >
              {[20, 54, 88, 122, 156].map((y) => (
                <line key={y} x1="0" x2="960" y1={y} y2={y} className="la-chart-gridline" />
              ))}
              {visibleBars.map(
                (value, index) =>
                  value > 0 && (
                    <rect
                      key={index}
                      x={index * (960 / visibleBars.length) + 4}
                      y={160 - (value / scale) * 135}
                      width={Math.max(2, 960 / visibleBars.length - 8)}
                      height={(value / scale) * 135}
                      rx="2"
                      className="la-chart-column"
                    />
                  ),
              )}
              {visibleBars.some(Boolean) && <polyline points={points} className="la-chart-line" />}
              {visibleBars.map(
                (value, index) =>
                  value > 0 && (
                    <circle
                      key={index}
                      cx={(index + 0.5) * (960 / visibleBars.length)}
                      cy={160 - (value / scale) * 135}
                      r="3.1"
                      className="la-chart-point"
                    />
                  ),
              )}
            </svg>
          </div>
          <div className="la-chart-bottom">
            <span>{start.toISOString().slice(0, 10)}</span>
            <span>{today.toISOString().slice(0, 10)}</span>
          </div>
          <div className="la-chart-legend">
            <span>
              <i />
              Results saved
            </span>
            {!visibleBars.some(Boolean) && <span>No pipeline results in this period</span>}
          </div>
        </Card>
        <Card className="la-dashboard-actions-card">
          <div className="la-card-heading">
            <h3>Quick actions</h3>
          </div>
          <button
            className="la-quick-action la-quick-action--primary"
            type="button"
            onClick={() => onNavigate('New Search')}
          >
            <Icon name="search" size={19} />
            <span>New Search</span>
            <Icon name="chevron" size={16} />
          </button>
          <button className="la-quick-action" type="button" onClick={() => onNavigate('Crawler')}>
            <Icon name="search" size={19} />
            <span>
              Crawler test<small>Find emails on one public page</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
          <button className="la-quick-action" type="button" onClick={() => onNavigate('Runs')}>
            <Icon name="runs" size={19} />
            <span>View local runs</span>
            <Icon name="chevron" size={16} />
          </button>
        </Card>
      </div>

      <section className="la-dashboard-table-section">
        <div className="la-card-heading">
          <h3>Latest pipelines</h3>
          <button type="button" onClick={() => onNavigate('Runs')}>
            View all
          </button>
        </div>
        <div className="la-table-scroll">
          <table className="la-table">
            <thead>
              <tr>
                <th>Niche</th>
                <th>States</th>
                <th>Queries</th>
                <th>Entries</th>
                <th>Status</th>
                <th>Latest CSV</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              {crawlRuns.slice(0, 5).map((run) => (
                <tr key={run.id}>
                  <td title={run.niches.join(', ')}>{run.niches.join(', ')}</td>
                  <td title={run.states.join(', ')}>{run.states.join(', ')}</td>
                  <td>
                    {run.nextQueryIndex}/{run.totalQueries}
                  </td>
                  <td>{run.entryCount.toLocaleString()}</td>
                  <td>{run.status}</td>
                  <td title={run.latestFilePath ?? undefined}>
                    {run.latestFileName ?? '—'}{' '}
                    {run.latestFileSize !== null && (
                      <small>({formatBytes(run.latestFileSize)})</small>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="la-history-export-button"
                      onClick={() => onExport(run.id)}
                      title="Re-export CSV"
                      aria-label={`Re-export ${run.niches.join(', ')} run`}
                    >
                      <Icon name="exports" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!crawlRuns.length && (
            <EmptyTable
              title="No pipelines yet"
              description="Start a crawl from Pipeline to see recent runs here."
            />
          )}
        </div>
      </section>

      <p className="la-dashboard-disclaimer">
        Counts reflect saved local pipeline runs. The chart groups each run's current results by its
        start date; repeated businesses across runs are counted in each run.
      </p>
    </div>
  )
}
