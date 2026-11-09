# Theme, fonts, sizing and motion

LeadsGhr is a light-only desktop app. The sidebar, Dashboard header, and workspace use white surfaces, with light lavender borders, purple actions, and restrained cyan highlights. LeadsGhr retains its own pages, data, and branding.

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#FFFFFF` | Main workspace, inputs, table rows and splash |
| Dark purple | `#170927` | Reserved dark surface token |
| Action purple | `#5B12C9` | Primary buttons, active sidebar item and links |
| White surface | `#FFFFFF` | Cards, forms, profile panels and workspace sections |
| Selected lavender | `#ECE9FA` | Selected chips, tabs and pagination |
| Cyan | `#29CBEA` | Keyboard focus and small attention accents |
| Text | `#190B2D` | Main content text |
| Muted text | `#675E76` | Supporting labels and descriptions |
| Border | `#DFD9EC` | Input, card and table dividers |

Token definitions and screen layout rules live in `packages/ui/src/styles.css`, loaded through `packages/ui/src/globals.css` with Tailwind CSS (no Preflight) and the shadcn theme variables. The desktop renderer imports `@leadsghr/ui/globals.css` and does not import `styles.css` directly. Shared controls come from shadcn-style components in `packages/ui/src/components/ui/`. The app does not offer a dark-mode switch. The sidebar and Dashboard header use white backgrounds. The sidebar uses the light-background `public/leadsghr-logo-v1.svg` wordmark. Reference-site logos, product copy, awards, and marketing forms are not part of LeadsGhr.

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

Keep **Instrument Sans** for interface text and **Monaspace Neon** for technical or numeric labels. Body text is about 13 px, navigation 12 px, table copy 11-12 px, section headings 16-21 px, and controls about 38-42 px high. Buttons and text fields retain matching rounded corners. Electron opens maximized; `Ctrl + 0`, `Ctrl + Plus`, and `Ctrl + Minus` control zoom.

## Brand, motion, and accessibility

The splash centers the LeadsGhr wordmark over a purple progress indicator. The brand mark is the transparent angular LG monogram in `public/leadsghr-lg-monogram-transparent.png`. Smaller brand placements and the desktop installer use variants generated from this image. The Profile avatar is separate from the brand logo: `react-nice-avatar` creates it from a locally saved seed and changes it only when **Generate new** is clicked.

Use gentle hover and entrance transitions, accessible names for icon-only buttons, and `prefers-reduced-motion` support. Editable fields and custom dropdown triggers use one thin black border on focus, with no inner outline; compound search controls draw that border on their outer wrapper. Other interactive controls retain a visible keyboard focus indicator. Text and icon meaning remain visible without relying on color alone.
