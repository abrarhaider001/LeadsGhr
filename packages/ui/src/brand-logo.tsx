import { useId } from 'react'
import { cn } from './lib/utils'

/*
 * The LeadsGhr "Growth" logo: three rising bars with a trend line above them (image files in public/).
 * Drawn from the design tokens, so it follows the light and dark themes: --ui-logo-bar (the two tall bars and
 * "Leads"), --ui-logo-bar-soft (the short bar), and --ui-color-primary (the trend line and "Ghr").
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn('la-logo-mark', className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="LeadsGhr"
    >
      <rect
        x="10"
        y="40"
        width="10"
        height="14"
        rx="4"
        style={{ fill: 'var(--ui-logo-bar-soft)' }}
      />
      <rect x="27" y="31" width="10" height="23" rx="4" style={{ fill: 'var(--ui-logo-bar)' }} />
      <rect x="44" y="22" width="10" height="32" rx="4" style={{ fill: 'var(--ui-logo-bar)' }} />
      <path
        d="M10 24 25 13l8 5 19-13"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--ui-color-primary)' }}
      />
    </svg>
  )
}

/** The mark with the "LeadsGhr" wordmark in the app font. Its size follows the element's font size. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn('la-logo', className)} role="img" aria-label="LeadsGhr">
      <BrandMark className="la-logo-mark" />
      <span className="la-logo-word" aria-hidden="true">
        Leads<em>Ghr</em>
      </span>
    </span>
  )
}

/*
 * Product marks for the two Chrome extensions, drawn from the tokens so they follow the light and dark themes
 * (the extensions' own toolbar icons are generated from the same colours by scripts/regenerate-extension-icons.mjs).
 */
/** LeadsGhr Tracker: a double tick on a rounded tile ("sent" and "opened"). */
export function TrackerMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn('la-product-mark', className)}
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      aria-hidden="true"
    >
      <rect
        x="96"
        y="96"
        width="832"
        height="832"
        rx="190"
        style={{ fill: 'var(--ui-logo-bar)' }}
      />
      <path
        d="M250 560 L380 690 L600 430"
        fill="none"
        strokeWidth="88"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--ui-color-surface)' }}
      />
      <path
        d="M520 640 L570 690 L790 430"
        fill="none"
        strokeWidth="88"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--ui-logo-accent)' }}
      />
    </svg>
  )
}

/** LeadsGhr Mailer: a faceted paper plane, upper wing in the brand green, lower wing in the logo ink. */
export function MailerMark({ size = 18, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      className={cn('la-product-mark', className)}
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`wing-${id}`}
          x1="900"
          y1="120"
          x2="260"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" style={{ stopColor: 'var(--ui-brand-accent)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--ui-brand-primary)' }} />
          <stop offset="1" style={{ stopColor: 'var(--ui-brand-primary-hover)' }} />
        </linearGradient>
      </defs>
      <path d="M922 102 L70 462 L438 590 Z" fill={`url(#wing-${id})`} />
      <path d="M922 102 L484 626 L612 930 Z" style={{ fill: 'var(--ui-logo-bar)' }} />
    </svg>
  )
}
