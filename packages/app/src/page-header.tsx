import type { ReactNode } from 'react'
import { Icon } from '@leadsghr/ui'

/** Shared title and subtitle for every desktop tab. `action` is a control the parent passes in, shown on the right. `onBack` turns the title into a back control. */
export function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
  children?: ReactNode
}) {
  const tools = action || children
  return (
    <header className="la-topbar">
      <div className="la-topbar-heading">
        <h1>
          {onBack ? (
            <button type="button" className="la-topbar-back" onClick={onBack}>
              <span className="la-topbar-back-mark" aria-hidden="true">
                <Icon name="chevron" size={22} />
              </span>
              {title}
            </button>
          ) : (
            title
          )}
        </h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {tools ? (
        <div className="la-topbar-tools">
          {action}
          {children}
        </div>
      ) : null}
    </header>
  )
}
