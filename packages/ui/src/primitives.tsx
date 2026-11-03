import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export type IconName = 'selectAll' | 'clear' | 'add' | 'pipeline' | 'dashboard' | 'search' | 'spider' | 'leads' | 'runs' | 'profiles' | 'exports' | 'shield' | 'settings' | 'arrow' | 'download' | 'mail' | 'mailCheck' | 'spamCheck' | 'bell' | 'chevron' | 'info' | 'library' | 'back' | 'play' | 'pause' | 'resume' | 'stop'
const paths: Record<IconName, ReactNode> = {
  selectAll: <><path d="m2 12 4 4L16 6M8 12l4 4L22 6"/></>,
  clear: <><path d="M3.5 4.5 10 11M10 4.5 3.5 11M13 5h8M13 10h8M3 15h18M3 20h18"/></>,
  add: <path d="M12 5v14M5 12h14"/>,
  pipeline: <><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><path d="M8 5.5h8M5.5 8v5h6.5v3M18.5 8v5H12v3"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  spider: <><path d="M8 7 5 4M16 7l3-3M7 10 3 2m7-2-3 2M7 14l-4 2m14-2 4 2M8 17l-4 3m12-3 4 3"/><path d="M8 8c0-2 1.8-3 4-3s4 1 4 3v2c1.2 1 2 2.4 2 4 0 3.3-2.7 6-6 6s-6-2.7-6-6c0-1.6.8-3 2-4V8Z"/><path d="M9 10h6"/></>,
  leads: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></>,
  runs: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  profiles: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  exports: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 17v3h16v-3"/></>,
  shield: <><path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 19h16"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  mailCheck: <><path d="M20 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8M4 7l8 6 7-5"/><path d="m16 17 2 2 4-4"/></>,
  spamCheck: <><path d="M6 3h12l4 5v8l-4 5H6l-4-5V8z"/><path d="M12 7v6m0 4h.01"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  back: <path d="m14 5-7 7 7 7M7 12h14"/>,
  play: <path d="m8 5 11 7-11 7V5Z"/>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  resume: <><path d="m10 7 8 5-8 5V7Z"/><path d="M5 5v14"/></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="1"/>,
  library: <><path d="M4 4.5h6a3 3 0 0 1 3 3V20H7a3 3 0 0 0-3 1V4.5Z"/><path d="M20 4.5h-4a3 3 0 0 0-3 3V20h4a3 3 0 0 1 3 1V4.5Z"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`la-button ${className}`} {...props}>{children}</button>
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`la-card ${className}`} {...props}>{children}</section>
}
