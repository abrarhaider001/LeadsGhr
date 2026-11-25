import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { EmptyState } from './empty-state'

const PAGE_SIZES = [10, 20, 50, 100] as const

export type TableColumn<Row> = {
  field: string
  header: React.ReactNode
  cell?: (row: Row) => React.ReactNode
  className?: string
}

export type TablePageEvent = {
  page: number
  limit: number
  first: number
}

export type TableProps<Row> = {
  data?: Row[]
  columns?: TableColumn<Row>[]
  loading?: boolean | null
  loadingDelay?: number
  paginator?: boolean
  lazy?: boolean
  rows?: number
  totalRecords?: number
  first?: number
  onPage?: (event: TablePageEvent) => void
  empty?: React.ReactNode
  rowKey?: (row: Row, index: number) => string
  rowClassName?: (row: Row) => string | undefined
  isRowActive?: (row: Row) => boolean
  onRowClick?: (row: Row) => void
  className?: string
  tableClassName?: string
}

function readField(row: unknown, field: string): unknown {
  if (!row || typeof row !== 'object') return undefined
  return (row as Record<string, unknown>)[field]
}

function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'string') return value.trim() === '' ? 'N/A' : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return 'N/A'
}

function Table<Row>({
  data = [],
  columns = [],
  loading = null,
  loadingDelay = 500,
  paginator = true,
  lazy = false,
  rows = 10,
  totalRecords = 0,
  first = 0,
  onPage,
  empty,
  rowKey,
  rowClassName,
  isRowActive,
  onRowClick,
  className,
  tableClassName,
}: TableProps<Row>) {
  const [autoLoading, setAutoLoading] = React.useState(loading === null)
  const [pageFirst, setPageFirst] = React.useState(first)
  const [pageRows, setPageRows] = React.useState(rows)

  React.useEffect(() => {
    if (loading !== null) return
    setAutoLoading(true)
    const timer = window.setTimeout(() => setAutoLoading(false), loadingDelay)
    return () => window.clearTimeout(timer)
  }, [loading, loadingDelay])

  React.useEffect(() => setPageFirst(first), [first])
  React.useEffect(() => setPageRows(rows), [rows])

  const isLoading = loading === null ? autoLoading : loading
  const total = lazy ? totalRecords : data.length
  const shown = paginator && !lazy ? data.slice(pageFirst, pageFirst + pageRows) : data
  const from = total === 0 ? 0 : pageFirst + 1
  const to = Math.min(pageFirst + pageRows, total)

  function emitPage(nextFirst: number, nextRows: number) {
    const lastPageStart = Math.max(0, Math.ceil(total / nextRows) - 1) * nextRows
    const aligned = Math.min(Math.max(0, nextFirst), lastPageStart)
    setPageFirst(aligned)
    setPageRows(nextRows)
    onPage?.({
      page: Math.floor(aligned / nextRows) + 1,
      limit: nextRows,
      first: aligned,
    })
  }

  return (
    <div
      data-slot="table"
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-(--ui-radius-xl) border border-border bg-card',
        className,
      )}
    >
      {isLoading ? (
        <div>
          <div
            className="grid gap-(--ui-space-4) border-b border-border p-(--ui-space-4)"
            style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
          >
            {columns.map((column) => (
              <div
                key={column.field}
                className="h-(--ui-space-4) w-[70%] animate-pulse rounded-(--ui-radius-md) bg-muted"
              />
            ))}
          </div>
          {Array.from({ length: 8 }, (_, row) => (
            <div
              key={row}
              className="grid gap-(--ui-space-4) border-b border-border p-(--ui-space-4) last:border-b-0"
              style={{
                gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {columns.map((column) => (
                <div
                  key={column.field}
                  className="h-(--ui-space-4) w-full animate-pulse rounded-(--ui-radius-md) bg-muted"
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <table className={cn('w-full border-collapse text-left', tableClassName)}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.field}
                    className={cn(
                      'sticky top-0 z-10 border-b border-border bg-card px-(--ui-space-3-5) py-(--ui-space-3) text-(length:--ui-text-xs) font-(--ui-weight-medium) text-foreground',
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            {shown.length > 0 && (
            <tbody>
              {shown.map((row, index) => {
                  const active = isRowActive?.(row) ?? false
                  return (
                    <tr
                      key={rowKey?.(row, pageFirst + index) ?? String(pageFirst + index)}
                      className={cn('group', onRowClick && 'cursor-pointer', rowClassName?.(row))}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.field}
                          className={cn(
                            'border-b border-border px-(--ui-space-3-5) py-(--ui-space-3) text-(length:--ui-text-sm) text-foreground transition-colors group-hover:bg-accent group-last:border-b-0',
                            active ? 'bg-accent' : 'bg-card',
                            column.className,
                          )}
                        >
                          {column.cell
                            ? column.cell(row)
                            : formatCellValue(readField(row, column.field))}
                        </td>
                      ))}
                    </tr>
                  )
                })}
            </tbody>
            )}
          </table>
          {shown.length === 0 && (empty ?? <EmptyState className="min-h-0 flex-1" />)}
        </div>
      )}
      {paginator && !isLoading && (
        <div className="flex flex-wrap items-center justify-between gap-(--ui-space-3) border-t border-border bg-transparent px-(--ui-space-4) py-(--ui-space-3)">
          <p className="m-0 text-(length:--ui-text-sm) text-muted-foreground">
            {total === 0 ? '0 records' : `${from}–${to} of ${total}`}
          </p>
          <div className="flex flex-wrap items-center gap-(--ui-space-2)">
            {PAGE_SIZES.map((size) => (
              <Button
                key={size}
                type="button"
                variant={pageRows === size ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={pageRows === size}
                onClick={() => emitPage(0, size)}
              >
                {size}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageFirst === 0}
              onClick={() => emitPage(pageFirst - pageRows, pageRows)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageFirst + pageRows >= total}
              onClick={() => emitPage(pageFirst + pageRows, pageRows)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { Table }
