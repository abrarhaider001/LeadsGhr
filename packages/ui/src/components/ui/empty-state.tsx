import { cn } from '../../lib/utils'

const DEFAULT_TITLE = 'No Data Found!'
const DEFAULT_DESCRIPTION = 'No Data Available to Display!'

function SearchX({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="m13.5 8.5-5 5" />
      <path d="m8.5 8.5 5 5" />
    </svg>
  )
}

export function EmptyState({
  boxed = false,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  className,
}: {
  boxed?: boolean
  title?: string
  description?: string
  className?: string
}) {
  return (
    <div
      role="status"
      data-slot="empty"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-(--ui-space-4) px-(--ui-space-4) py-(--ui-space-20) text-center',
        boxed && 'rounded-(--ui-radius-xl) border border-border bg-card',
        className,
      )}
    >
      <div className="flex size-24 items-center justify-center rounded-full border border-border text-primary">
        <SearchX className="size-12" />
      </div>
      <div className="flex flex-col gap-(--ui-space-1-5)">
        <p className="m-0 text-(length:--ui-text-3xl) font-(--ui-weight-semibold) text-foreground">
          {title}
        </p>
        <p className="m-0 text-(length:--ui-text-xl) text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
