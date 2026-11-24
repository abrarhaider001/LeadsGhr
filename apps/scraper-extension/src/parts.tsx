import type { ReactNode } from 'react'
import type { ScraperSearch } from '@leadsghr/schemas'

const glyph = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
export const icons = {
  folder: glyph(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />),
  check: glyph(<path d="m5 12 5 5 9-10" />),
  play: glyph(<path d="M7 5v14l12-7z" />),
  pause: glyph(<path d="M8 5v14M16 5v14" />),
  stop: glyph(<rect x="6" y="6" width="12" height="12" rx="2" />),
  warn: glyph(<><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>),
  desktop: glyph(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>),
  pin: glyph(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
}

export function Header() {
  return (
    <div className="sc-hd">
      <img src="/icon.svg" alt="" width={32} height={32} />
      <div>
        <b>LeadsGhr Scraper</b>
        <small>Google Search business listings</small>
      </div>
    </div>
  )
}

export function LocationList({
  searches,
  done,
  current,
  page,
  blockedAt,
  counts,
}: {
  searches: ScraperSearch[]
  done: Set<number>
  current: number
  page: number
  blockedAt: number
  counts: Record<number, number>
}) {
  return (
    <ul className="sc-locs">
      {searches.map((search) => (
        <li key={search.index}>
          <span className="sc-pin">{icons.pin}</span>
          <span className="sc-ln" title={search.query}>
            {search.place}
            {searches.some((other) => other.place === search.place && other.term !== search.term) ? ` · ${search.term}` : ''}
          </span>
          {done.has(search.index) ? (
            <span className="sc-pill sc-ok">
              {icons.check}
              {counts[search.index] ?? 'done'}
            </span>
          ) : search.index === blockedAt ? (
            <span className="sc-pill sc-warn">stopped here</span>
          ) : search.index === current ? (
            <span className="sc-pill sc-run">
              <i className="sc-spin" />
              page {Math.max(page, 1)} of 5
            </span>
          ) : (
            <span className="sc-pill">waiting</span>
          )}
        </li>
      ))}
    </ul>
  )
}
