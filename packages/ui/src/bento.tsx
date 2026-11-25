import type { ReactNode } from 'react'
import { cn } from './lib/utils'

/*
 * Bento tiles for product pages (LeadsGhr Mailer and LeadsGhr Tracker): a grid of large tiles, each with a short
 * headline, one sentence, and a floating piece of the product's own interface as its picture. Everything is drawn
 * from the design tokens (.la-bento* in styles.css), so the tiles follow the brand colour and the light and dark
 * themes. Pages place the floating pieces with their own classes.
 */

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('la-bento', className)}>{children}</div>
}

/** brand: the green gradient tile; soft: a light tile with a faint brand tint. */
export function BentoTile({
  tone = 'soft',
  title,
  children,
  art,
  className,
}: {
  tone?: 'brand' | 'soft'
  title: string
  children: ReactNode
  art?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('la-bento-tile', `is-${tone}`, className)}>
      {art ? (
        <div className="la-bento-art" aria-hidden="true">
          {art}
        </div>
      ) : null}
      <div className="la-bento-copy">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </section>
  )
}

/** A floating card (a piece of interface) inside a tile's picture. */
export function BentoFloat({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('la-bento-float', className)}>{children}</div>
}

/** A floating notification: a round mark, a title, and a short line under it. */
export function BentoToast({
  icon,
  title,
  subtitle,
  className,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  className?: string
}) {
  return (
    <div className={cn('la-bento-float la-bento-toast', className)}>
      <span className="la-bento-toast-mark">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </div>
  )
}

/** A floating rounded label. */
export function BentoPill({
  tone = 'brand',
  className,
  children,
}: {
  tone?: 'brand' | 'ink' | 'accent' | 'plain'
  className?: string
  children: ReactNode
}) {
  return <span className={cn('la-bento-pill', `is-${tone}`, className)}>{children}</span>
}

/** A pointer arrow, as if someone is about to click. */
export function BentoCursor({ className }: { className?: string }) {
  return (
    <svg className={cn('la-bento-cursor', className)} width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 2v18l5-5 3.5 7 3-1.5L12 13.5h7z" />
    </svg>
  )
}
