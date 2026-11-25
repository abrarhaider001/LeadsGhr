import { cn } from '../../lib/utils'

const DEFAULT_TITLE = 'No data found'
const DEFAULT_DESCRIPTION = 'There is nothing to show here yet.'

/**
 * The empty state shown in tables and empty pages: LeadsGhr's own illustration (a table with a magnifier, drawn from
 * the design tokens so it follows the light and dark themes), a title, and a short description. Styled by
 * .la-empty-table in packages/ui/src/styles.css.
 */
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
        'la-empty-table',
        boxed && 'rounded-(--ui-radius-xl) border border-border bg-card',
        className,
      )}
    >
      <svg className="la-empty-table-art" viewBox="0 0 160 132" fill="none" aria-hidden="true">
        <rect
          x="19"
          y="23"
          width="122"
          height="86"
          rx="11"
          strokeWidth="2"
          style={{
            fill: 'var(--ui-color-surface-subtle)',
            stroke: 'var(--ui-color-border-strong)',
          }}
        />
        <path d="M19 43h122" strokeWidth="2" style={{ stroke: 'var(--ui-color-border-strong)' }} />
        <circle cx="30" cy="33" r="2" style={{ fill: 'var(--ui-color-text-disabled)' }} />
        <circle cx="38" cy="33" r="2" style={{ fill: 'var(--ui-color-text-disabled)' }} />
        <circle cx="46" cy="33" r="2" style={{ fill: 'var(--ui-color-text-disabled)' }} />
        <rect
          x="32"
          y="55"
          width="45"
          height="6"
          rx="3"
          style={{ fill: 'var(--ui-color-border-neutral)' }}
        />
        <rect
          x="86"
          y="55"
          width="35"
          height="6"
          rx="3"
          style={{ fill: 'var(--ui-color-border-neutral)' }}
        />
        <rect
          x="32"
          y="70"
          width="57"
          height="6"
          rx="3"
          style={{ fill: 'var(--ui-color-border-neutral)' }}
        />
        <rect
          x="99"
          y="70"
          width="22"
          height="6"
          rx="3"
          style={{ fill: 'var(--ui-color-border-neutral)' }}
        />
        <rect
          x="32"
          y="85"
          width="37"
          height="6"
          rx="3"
          style={{ fill: 'var(--ui-color-border-neutral)' }}
        />
        <rect
          x="78"
          y="85"
          width="43"
          height="6"
          rx="3"
          style={{ fill: 'var(--ui-color-border-neutral)' }}
        />
        <circle
          cx="120"
          cy="96"
          r="18"
          strokeWidth="3"
          style={{ fill: 'var(--ui-color-surface)', stroke: 'var(--ui-color-primary)' }}
        />
        <path
          d="m133 109 12 12"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ stroke: 'var(--ui-color-primary)' }}
        />
      </svg>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}
