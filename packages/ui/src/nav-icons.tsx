import { cn } from './lib/utils'

/*
 * Sidebar icons in the LeadsGhr duotone line style (owner-approved 2026-11-22): every icon is an outline on a
 * 24 px grid with a 1.8 px stroke, drawn in the menu text colour (currentColor, so the open item turns with its
 * text), plus ONE accent part in the brand colour (--ui-color-primary). Both colours come from the design tokens,
 * so the icons follow the light and dark themes. Email Sending uses the Mailer plane (green upper wing) and Email
 * Tracking the Tracker double tick (green "opened" tick).
 *
 * To add a sidebar tab, add its icon here as { base, accent } in the same style (see AGENTS.md, "Sidebar icons").
 * Paths starting with "F:" are filled shapes instead of lines.
 */
const ICONS = {
  dashboard: { base: ['M4 4h6v6H4z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'], accent: ['M14 4h6v6h-6z'] },
  pipeline: { base: ['M4 4h4v4H4z', 'M10 16h4v4h-4z', 'M8 6h6a4 4 0 0 1 4 4v1', 'M6 8v4a4 4 0 0 0 4 4'], accent: ['M16 11h4v4h-4z'] },
  crawler: { base: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M3 12h18', 'M12 3c-3 3-3 15 0 18', 'M12 3c3 3 3 15 0 18'], accent: ['F:M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z'] },
  newSearch: { base: ['M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z', 'M15.5 15.5 20 20'], accent: ['M10.5 7.8v5.4', 'M7.8 10.5h5.4'] },
  nicheLibrary: { base: ['M4 5h5v15H4z', 'M9 5h5v15H9z'], accent: ['M15.5 6.2l3.6-1 3 13.6-3.6 1z'] },
  emailFiltering: { base: ['M4 5h16l-6 7v5l-4 2v-7z'], accent: ['M17 17h4', 'M19 15v4'] },
  emailValidation: { base: ['M3 6h14v11H3z', 'M3 7l7 5 7-5'], accent: ['M15 18.5l2.2 2.2 4.3-4.7'] },
  emailSpamCheck: { base: ['M8 3h8l5 5v8l-5 5H8l-5-5V8z'], accent: ['M12 8v5', 'M12 16.5h.01'] },
  emailSending: { base: ['M21 3 10.5 13.5 13.5 21z'], accent: ['M21 3 3 10.5l7.5 3z'] },
  emailTracking: { base: ['M1.8 12.6l4.6 4.6L15.2 7'], accent: ['M11 16l1.2 1.2L22.2 7'] },
  leads: { base: ['M9 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6z', 'M3.5 20a5.5 5.5 0 0 1 11 0'], accent: ['M16 5.5a2.8 2.8 0 0 1 0 5.4', 'M17.5 14a5 5 0 0 1 3 5.5'] },
  runs: { base: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z'], accent: ['M12 7v5l3.5 2'] },
  profiles: { base: ['M6 3h9l4 4v14H6z', 'M15 3v4h4'], accent: ['M9 12h7', 'M9 16h5'] },
  exports: { base: ['M4 15v5h16v-5'], accent: ['M12 3v12', 'M7.5 10.5 12 15l4.5-4.5'] },
  compliance: { base: ['M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z'], accent: ['M8.8 12l2.2 2.2 4.2-4.4'] },
  settings: { base: ['M12 2.8l2 2.1 2.9-.4.6 2.8 2.5 1.5-1.2 2.7 1.2 2.7-2.5 1.5-.6 2.8-2.9-.4-2 2.1-2-2.1-2.9.4-.6-2.8-2.5-1.5 1.2-2.7-1.2-2.7 2.5-1.5.6-2.8 2.9.4z'], accent: ['M12 9.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6z'] },
} satisfies Record<string, { base: string[]; accent: string[] }>

export type NavIconName = keyof typeof ICONS

function Part({ d, colour }: { d: string; colour: string }) {
  return d.startsWith('F:')
    ? <path d={d.slice(2)} stroke="none" style={{ fill: colour }} />
    : <path d={d} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: colour }} />
}

/** A sidebar icon: outline in the text colour, one accent part in the brand colour. */
export function NavIcon({ name, size = 18, className }: { name: NavIconName; size?: number; className?: string }) {
  const icon = ICONS[name]
  return <svg className={cn('la-nav-icon', className)} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    {icon.base.map((d) => <Part key={d} d={d} colour="currentColor" />)}
    {icon.accent.map((d) => <Part key={d} d={d} colour="var(--ui-color-primary)" />)}
  </svg>
}
