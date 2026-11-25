/*
 * The license-screen key illustration, drawn from the design tokens like the logo: outlines in the text colour,
 * the key body in the surface colour, and shading in the brand colour, so it follows the light and dark themes.
 * Drawn lying flat (tip on the left), then turned 45 degrees so the head and ring sit top right.
 */
const INK = 'var(--ui-color-text)'
const BODY = 'var(--ui-color-surface)'
const SHADE = 'var(--ui-color-primary)'

export function LicenseKeyArt({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <g
        transform="translate(262 262) rotate(-45) translate(-285 4)"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        style={{ stroke: INK }}
      >
        <circle cx="482" cy="-6" r="62" strokeWidth="17" />
        <circle cx="482" cy="-6" r="62" strokeWidth="6" style={{ stroke: BODY }} />
        <path d="M500 -65 A62 62 0 0 1 540 16" strokeWidth="3" style={{ stroke: SHADE }} />
        <path
          d="M258 -26 L74 -26 L38 -4 L60 24 L82 24 L90 38 L102 24 L112 24 L120 38 L132 24 L142 24 L150 38 L162 24 L174 24 L182 36 L190 24 L258 24 Z"
          strokeWidth="8"
          style={{ fill: BODY }}
        />
        <path d="M252 -12 L96 -12 L84 -20 L70 -20" strokeWidth="5" />
        <path d="M246 4 L84 4 L64 14" strokeWidth="5" />
        <path d="M240 11 L92 11" strokeWidth="5" style={{ stroke: SHADE }} />
        <path d="M244 -6 L104 -6" strokeWidth="3" style={{ stroke: SHADE }} />
        <path d="M236 19 L196 19" strokeWidth="4" style={{ stroke: SHADE }} />
        <path d="M256 -34 L276 -34 L276 34 L256 34 Z" strokeWidth="8" style={{ fill: BODY }} />
        <path d="M266 -30 L266 30" strokeWidth="4" style={{ stroke: SHADE }} />
        <path
          d="M276 -22 C292 -24 300 -34 312 -44 L312 44 C300 34 292 24 276 22 Z"
          strokeWidth="8"
          style={{ fill: BODY }}
        />
        <path d="M282 14 C292 16 300 24 306 32" strokeWidth="4" style={{ stroke: SHADE }} />
        <path
          d="M306 -40 C312 -82 368 -94 416 -84 C458 -74 470 -40 468 0 C466 42 452 76 410 84 C364 92 312 80 306 40 C302 14 302 -14 306 -40 Z"
          strokeWidth="9"
          style={{ fill: BODY }}
        />
        <path
          d="M322 -34 C328 -66 372 -74 410 -68 C444 -62 454 -36 452 -2 C450 34 440 60 406 66 C368 72 326 64 322 34 C319 12 319 -12 322 -34 Z"
          strokeWidth="5"
        />
        <path
          d="M330 44 C340 64 372 70 404 66 C432 62 446 44 450 18"
          strokeWidth="7"
          style={{ stroke: SHADE }}
        />
        <path d="M316 50 C326 76 362 84 400 80" strokeWidth="3" style={{ stroke: SHADE }} />
        <path d="M338 -48 C350 -62 374 -64 396 -60" strokeWidth="3" style={{ stroke: SHADE }} />
        <circle cx="428" cy="-40" r="14" strokeWidth="7" style={{ fill: BODY }} />
        <path d="M418 -32 A14 14 0 0 0 440 -34" strokeWidth="3" style={{ stroke: SHADE }} />
        <path d="M428 -40 A62 62 0 0 1 463 -65" strokeWidth="17" />
        <path d="M428 -40 A62 62 0 0 1 463 -65" strokeWidth="6" style={{ stroke: BODY }} />
      </g>
    </svg>
  )
}
