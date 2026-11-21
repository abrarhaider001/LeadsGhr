# Theme, fonts, sizing and motion

LeadsGhr is a light-only desktop app. The sidebar, Dashboard header, and workspace use white surfaces, with light lavender borders, purple actions, and restrained cyan highlights. LeadsGhr retains its own pages, data, and branding.

## Design tokens: one file for the whole look

**`packages/ui/src/tokens.css` is the only place that defines how LeadsGhr looks.** Every colour, font, text size, weight, space, corner radius, border, shadow, and button/field size used by the desktop app, both Chrome extensions, and the setup and uninstall windows comes from it. To change the look, edit that file; nothing else.

- **Re-theme:** change the brand values at the top (`--ui-brand-primary`, `--ui-brand-primary-hover`, `--ui-brand-ink`, `--ui-brand-accent`, `--ui-brand-highlight`). The soft tints (selected rows, hover, chips, tinted borders) are mixed from the brand colour with `color-mix()`, so they follow automatically.
- **Roles, not values:** screens use role tokens such as `--ui-color-primary`, `--ui-color-text`, `--ui-color-text-muted`, `--ui-color-border`, `--ui-color-surface`, `--ui-color-primary-soft`, and `--ui-color-success` / `-warning` / `-danger` / `-info` (each with `-soft` and `-border` variants).
- **Scales:** text sizes `--ui-text-3xs` (9 px) to `--ui-text-display-lg` (54 px), weights `--ui-weight-*`, spacing `--ui-space-0-5` (2 px) to `--ui-space-20` (80 px), corners `--ui-radius-xs` (4 px) to `--ui-radius-full`, shadows `--ui-shadow-*`, and motion `--ui-duration-*`.
- **Controls:** `--ui-control-height-sm|md|lg|xl`, `--ui-button-radius` (compact buttons; the large `Button` component uses `--ui-button-radius-lg`, 4 px rounder), `--ui-button-padding-x`, `--ui-button-font-size`, `--ui-field-radius`, `--ui-field-height`, and `--ui-card-radius`. Changing `--ui-button-radius` reshapes every button in the product.

How each part reads the tokens:

| Part | How |
| --- | --- |
| Desktop app | `packages/ui/src/globals.css` imports `tokens.css`, maps the Tailwind and shadcn names (`bg-primary`, `text-muted-foreground`, `border-border`, ...) to the tokens, then loads `styles.css`, whose rules use only `var(--ui-*)` |
| Shared components | `Button`, `Input`, `Textarea`, `Card`, `Badge`, and `Label` in `packages/ui/src/components/ui/` use Tailwind classes that point at the tokens, for example `rounded-(--ui-button-radius-lg)` |
| Chrome extension pages | Popups and settings pages import `@leadsghr/ui/tokens.css` and use `var(--ui-*)` in their styles |
| Gmail content scripts | Gmail has no LeadsGhr CSS variables, so `apps/extension/src/gmail.ts` reads resolved values from `packages/ui/src/tokens.generated.ts` |
| Setup and uninstall windows (C#) | `apps/desktop/setup/Tokens.g.cs`, compiled into both programs by `build-setup.ps1` |

`tokens.generated.ts` and `Tokens.g.cs` are generated from `tokens.css` by `scripts/generate-tokens.mjs` (`pnpm.cmd tokens`). It runs automatically before `dev` and every desktop and extension build, so editing `tokens.css` is enough. `pnpm.cmd --filter @leadsghr/ui test` fails if a generated copy is out of date; if a hex or rgb colour, px font size, px corner radius, or font name is typed into a stylesheet, component, extension page, or the C# windows; or if code uses a token that does not exist. The only typed colours allowed are third-party brand logos (Facebook and LinkedIn in `pipeline-provider-icon.tsx`) and the content of outgoing emails.

Current brand values:

| Token | Value | Use |
| --- | --- | --- |
| `--ui-brand-primary` | `#5B12C9` | Primary buttons, active items, links |
| `--ui-brand-primary-hover` | `#450A9C` | Primary hover and pressed |
| `--ui-brand-ink` | `#190B2D` | Main text and dark surfaces |
| `--ui-brand-accent` | `#1FA9C9` | Second brand colour (gradients, progress) |
| `--ui-brand-highlight` | `#29CBEA` | Keyboard focus and bright accents |
| `--ui-color-text-muted` | `#675E76` | Supporting labels and descriptions |
| `--ui-color-border` | Lavender mixed from the brand colour | Input, card, and table dividers |

## Layout and components

- The sidebar keeps Dashboard and Pipeline first, then discovery tools and workspace pages. Active items use solid purple with white icons and text. Search and the local profile remain in the rail.
- The white header with title, short description, and local-workspace identity appears on Dashboard only. Other pages begin directly with their own content and controls.
- Dashboard metrics, chart, and quick actions use white cards with light lavender borders, matching the Pipeline overview cards. The same white panel treatment applies to Pipeline setup, Niche Library, Profile, Email Filtering, and Email Spam Check. Metric icons sit on lavender squares with purple strokes. Latest pipelines has an open heading above a full-width table, without an outer card; its data and export controls stay available.
- The Dashboard workspace uses a plain white background. Its cards keep their normal opaque surfaces.
- Tables have a pale-lavender header, white and faint-lavender rows, thin dividers, and a subtle hover state. Long values still truncate to one line where their component calls for it.
- Primary actions use purple with white labels. Secondary controls remain light. Play, Pause, and Stop retain their distinct functional colors.
- Selected chips, custom dropdown options, tabs, and current pagination use lavender. Every dropdown uses the shared `CustomSelect` component.
- Profile, Email Filtering, and Email Spam Check panels use white surfaces and lavender borders. Filtering statuses and reasons retain their semantic colors and text.
- The Crawler worker-count setting uses the same full-width preference row as adjacent radio and checkbox settings, with its bounded number field aligned to the right.

## Typography and sizing

Keep **Instrument Sans** (`--ui-font-sans`) for interface text and **Monaspace Neon** (`--ui-font-mono`) for technical or numeric labels, and use the `--ui-text-*` sizes rather than typed px sizes. Body text is about 13 px, navigation 12 px, table copy 11-12 px, section headings 16-21 px, and controls about 38-42 px high. Buttons and text fields retain matching rounded corners. Electron opens maximized; `Ctrl + 0`, `Ctrl + Plus`, and `Ctrl + Minus` control zoom.

## Brand, motion, and accessibility

The splash uses a white canvas with a fine dot grid (26 px spacing) coloured from brand purple `#5B12C9` through `#8B5CF6` to teal `#1FA9C9` left to right; the dots fade out behind the centered content and at the screen edges, and a soft purple glow sits behind the logo (`SplashBackground` in `packages/app/src/splash-screen.tsx`, `.la-splash__dots` in `packages/ui/src/styles.css`). Any screen that shares the splash background, such as the license screen, uses the same component. The setup and uninstall windows (`apps/desktop/setup/`) have a plain white background without a pattern. It replaced the earlier curved purple line fans. The LeadsGhr wordmark, a short product message, and a purple loading bar form the center stack; there are no splash buttons. The brand mark is the transparent angular LG monogram in `public/leadsghr-lg-monogram-transparent.png`. Smaller brand placements and the desktop installer use variants generated from this image. The Profile avatar is separate from the brand logo: `react-nice-avatar` creates it from a locally saved seed and changes it only when **Generate new** is clicked.

Use gentle hover and entrance transitions, accessible names for icon-only buttons, and `prefers-reduced-motion` support. Editable fields and custom dropdown triggers use one thin black border on focus, with no inner outline; compound search controls draw that border on their outer wrapper. Other interactive controls retain a visible keyboard focus indicator. Text and icon meaning remain visible without relying on color alone.
