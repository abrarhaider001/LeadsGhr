import { cn } from './lib/utils'

/*
 * The LeadsGhr "Growth" logo: three rising bars with a trend line above them (public/new-logo/).
 * Drawn from the design tokens, so it follows the light and dark themes: --ui-logo-bar (the two tall bars and
 * "Leads"), --ui-logo-bar-soft (the short bar), and --ui-color-primary (the trend line and "Ghr").
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return <svg className={cn('la-logo-mark', className)} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="LeadsGhr">
    <rect x="10" y="40" width="10" height="14" rx="4" style={{ fill: 'var(--ui-logo-bar-soft)' }} />
    <rect x="27" y="31" width="10" height="23" rx="4" style={{ fill: 'var(--ui-logo-bar)' }} />
    <rect x="44" y="22" width="10" height="32" rx="4" style={{ fill: 'var(--ui-logo-bar)' }} />
    <path d="M10 24 25 13l8 5 19-13" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--ui-color-primary)' }} />
  </svg>
}

/** The mark with the "LeadsGhr" wordmark in the app font. Its size follows the element's font size. */
export function BrandLogo({ className }: { className?: string }) {
  return <span className={cn('la-logo', className)} role="img" aria-label="LeadsGhr">
    <BrandMark className="la-logo-mark" />
    <span className="la-logo-word" aria-hidden="true">Leads<em>Ghr</em></span>
  </span>
}
