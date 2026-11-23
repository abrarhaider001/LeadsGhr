# Theme, fonts, sizing and motion

LeadsGhr has a **light** and a **dark** theme, matching the new charcoal-and-green brand. Light: white cards on a very light grey canvas (`#FAFAFA`), charcoal text (`#1F2328`), green actions (`#16A34A`). Dark: charcoal surfaces (`#1F2328` on a `#15181C` canvas), light text (`#E8EAED`), bright green actions (`#4ADE80`) with dark text on them. The user picks **Light**, **Dark**, or **Match Windows** in **Settings → Preferences → Appearance** (preference `theme`, default Light); `packages/app/src/theme.ts` sets `data-theme` on the page, remembers the choice so the next start opens in the right theme without a flash, and follows Windows live when **Match Windows** is chosen. The Chrome extensions and the setup and uninstall windows use the light theme.

## Design tokens: one file for the whole look

**`packages/ui/src/tokens.css` is the only place that defines how LeadsGhr looks.** Every colour, font, text size, weight, space, corner radius, border, shadow, and button/field size used by the desktop app, both Chrome extensions, and the setup and uninstall windows comes from it. To change the look, edit that file; nothing else.

- **Two themes in one file:** the `:root, [data-theme='light']` block holds the light values (brand, neutrals, status colours, canvas, tint strengths), the `[data-theme='dark']` block holds the dark values, and the `:root, [data-theme]` block builds every role token, scale, and control size from whichever theme is active. A part of a page can show the other theme by setting `data-theme` on it (the Appearance previews do this). Images with fixed colours need a dark version; show the right one with the `la-for-light` / `la-for-dark` classes (the sidebar and splash logos do this).
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

Current theme values:

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--ui-brand-primary` | `#16A34A` | `#4ADE80` | Primary buttons, active items, links, chart lines |
| `--ui-brand-primary-hover` | `#15803D` | `#22C55E` | Primary hover and pressed |
| `--ui-brand-ink` | `#1F2328` | `#E8EAED` | Main text |
| `--ui-on-primary` | `#FFFFFF` | `#0E1A12` | Text and icons on primary buttons |
| `--ui-canvas` | `#FAFAFA` | `#15181C` | App background behind cards |
| `--ui-neutral-0` | `#FFFFFF` | `#1F2328` | Cards, panels, inputs, sidebar |
| `--ui-neutral-700` | `#6B7078` | `#9AA1AB` | Supporting labels and descriptions |
| `--ui-line` | `#E6E8EB` | `#2E343C` | Input, card, and table dividers |
| `--ui-brand-accent` | `#4ADE80` | `#86EFAC` | Second brand colour (gradients, progress) |

## Layout and components

- The sidebar keeps Dashboard and Pipeline first, then discovery tools and workspace pages. Active items use solid purple with white icons and text. Search and the local profile remain in the rail.
- The white header with title, short description, and local-workspace identity appears on Dashboard only. Other pages begin directly with their own content and controls.
- Dashboard metrics, chart, and quick actions use white cards with light lavender borders, matching the Pipeline overview cards. The same white panel treatment applies to Pipeline setup, Niche Library, Profile, Email Filtering, and Email Spam Check. Metric icons sit on lavender squares with purple strokes. Latest pipelines has an open heading above a full-width table, without an outer card; its data and export controls stay available.
- Every table sits in the same card as the Leads table: a soft green header row (`--ui-color-primary-subtle`) inside a white surface (`--ui-color-surface`) with one border and the `--ui-radius-2xl` corner, so no table body shows the page background through it. The shared rule covers `.la-table-scroll`, `.la-records-table-wrap`, `.la-crawler-table-wrap`, and `.la-email-filter-table-wrap`; wrap any new table in one of these.
- The Dashboard workspace uses a plain white background. Its cards keep their normal opaque surfaces.
- Tables have a pale-lavender header, white and faint-lavender rows, thin dividers, and a subtle hover state. Long values still truncate to one line where their component calls for it.
- Primary actions use purple with white labels. Secondary controls remain light. Play, Pause, and Stop retain their distinct functional colors.
- Selected chips, custom dropdown options, tabs, and current pagination use lavender. Every dropdown uses the shared `CustomSelect` component.
- Profile, Email Filtering, and Email Spam Check panels use white surfaces and lavender borders. Filtering statuses and reasons retain their semantic colors and text.
- The Crawler worker-count setting uses the same full-width preference row as adjacent radio and checkbox settings, with its bounded number field aligned to the right.

## Typography and sizing

Use **Plus Jakarta Sans** (`--ui-font-sans`) for interface text and **IBM Plex Mono** (`--ui-font-mono`) for technical or numeric labels such as file names, dates, and counts, and use the `--ui-text-*` sizes rather than typed px sizes. Both fonts are open-licence (SIL OFL, licence files beside them) and bundled: `tokens.css` declares them with `@font-face` from `packages/ui/src/fonts/` (Plus Jakarta Sans as one variable file covering weights 200–800, IBM Plex Mono as 400/500/600), so the desktop app and both extensions load them from that one place with no internet. The setup and uninstall windows embed static Plus Jakarta Sans Regular, SemiBold, and Bold from `apps/desktop/setup/assets/`, because Windows' GDI+ cannot use variable fonts. They replaced Instrument Sans and Monaspace Neon on 2026-11-22. To change the font, add the new files to `packages/ui/src/fonts/`, update the `@font-face` rules and `--ui-font-*` in `tokens.css`, and replace the static files in `setup/assets/`. Body text is about 13 px, navigation 12 px, table copy 11-12 px, section headings 16-21 px, and controls about 38-42 px high. Buttons and text fields retain matching rounded corners. **Font size** (preference `fontSize`, 80–150% in steps of 10, default 100%) scales only the type: every `--ui-text-*` size and the large headings are multiplied by `--ui-font-scale`. Spacing, corner radius, and control sizes stay the same, and the Chrome extensions stay at 100%. Electron opens maximized at the saved **Display size** (preference `displaySize`, 70–200%, default 100%). Settings → Preferences → Appearance shows it in the settings-row style (`.la-profile-option-list`): a Zoom row with a − 100% + stepper and a Reset link, and a Keyboard shortcuts row with `kbd` keycaps (`.la-kbd`); `Ctrl + Plus`, `Ctrl + Minus`, and `Ctrl + 0` change the same saved setting from the main process.

## Brand, motion, and accessibility

The splash uses the canvas colour with a fine dot grid (26 px spacing) coloured in the brand gradient (`--ui-color-primary` through `--ui-color-primary-light` to `--ui-color-accent`) left to right; the dots fade out behind the centered content and at the screen edges, and a soft brand glow sits behind the logo (`SplashBackground` in `packages/app/src/splash-screen.tsx`, `.la-splash__dots` in `packages/ui/src/styles.css`). Any screen that shares the splash background, such as the license screen, uses the same component. The setup and uninstall windows (`apps/desktop/setup/`) have a plain white background without a pattern. It replaced the earlier curved purple line fans. The LeadsGhr wordmark, a short product message, and a purple loading bar form the center stack; there are no splash buttons. The brand mark is the Growth logo (three rising bars and a trend line); see `docs/icons/ICONS_README.md`. The Profile avatar is separate from the brand logo: `react-nice-avatar` creates it from a locally saved seed and changes it only when **Generate new** is clicked.

Use gentle hover and entrance transitions, accessible names for icon-only buttons, and `prefers-reduced-motion` support. Editable fields and custom dropdown triggers use one thin black border on focus, with no inner outline; compound search controls draw that border on their outer wrapper. Other interactive controls retain a visible keyboard focus indicator. Text and icon meaning remain visible without relying on color alone.
