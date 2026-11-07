type QueueStatus = 'queued' | 'fetching' | 'ready' | 'crawling' | 'crawled' | 'skipped'

export function crawlQueueWindow<T>(items: T[], statusOf: (item: T) => QueueStatus, limit = 20): { item: T; index: number }[] {
  const indexed = items.map((item, index) => ({ item, index }))
  const completed = indexed.filter(({ item }) => ['crawled', 'skipped'].includes(statusOf(item)))
  const active = indexed.filter(({ item }) => ['fetching', 'ready', 'crawling'].includes(statusOf(item)))
  const queued = indexed.filter(({ item }) => statusOf(item) === 'queued')
  if (!active.length && !queued.length) return completed.slice(-limit)

  // Keep the crawl frontier near the middle. As a page completes, the oldest
  // completed row leaves the window and the next queued row enters below it.
  const activeRows = active.slice(0, limit)
  const completedCount = Math.min(completed.length, Math.floor((limit - activeRows.length) / 2))
  const queuedCount = Math.min(queued.length, limit - activeRows.length - completedCount)
  const extraCompleted = Math.min(completed.length - completedCount, limit - activeRows.length - completedCount - queuedCount)
  return [
    ...completed.slice(-(completedCount + extraCompleted)),
    ...activeRows,
    ...queued.slice(0, queuedCount),
  ]
}
