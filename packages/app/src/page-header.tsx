import type { ReactNode } from 'react'

/** Shared title and subtitle for every desktop tab. Optional children sit on the right. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="la-topbar">
      <div className="la-topbar-heading">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="la-topbar-tools">{children}</div> : null}
    </header>
  )
}
