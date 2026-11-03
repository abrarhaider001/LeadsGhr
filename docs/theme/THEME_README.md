# Theme, fonts, sizing and motion

LeadsGhr is a light-only desktop app. The supplied reference informs its contrast and surface treatment: a deep-purple navigation frame, white workspace, soft lavender cards, purple actions, and restrained cyan highlights. LeadsGhr retains its own pages, data, and branding.

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#FFFFFF` | Main workspace, inputs, table rows and splash |
| Navigation | `#170927` | Sidebar and shared page header |
| Action purple | `#5B12C9` | Primary buttons, active sidebar item and links |
| Lavender | `#F2F1FF` | Cards, filter panels and profile surfaces |
| Selected lavender | `#ECE9FA` | Selected chips, tabs and pagination |
| Cyan | `#29CBEA` | Keyboard focus and small attention accents |
| Text | `#190B2D` | Main content text |
| Muted text | `#675E76` | Supporting labels and descriptions |
| Border | `#DFD9EC` | Input, card and table dividers |

The token definitions and final component overrides live in `packages/ui/src/styles.css`. The app does not offer a dark-mode switch. The dark purple sidebar and header frame the otherwise white interface. The sidebar uses `public/leadsghr-logo-sidebar.svg`; the light-background wordmark stays available for the splash. Reference-site logos, product copy, awards, and marketing forms are not part of LeadsGhr.

## Layout and components

- The sidebar keeps Dashboard and Pipeline first, then discovery tools and workspace pages. Active items use solid purple with white icons and text. Search and the local profile remain in the rail.
- The dark header with title, short description, and local-workspace identity appears on Dashboard only. Other pages begin directly with their own content and controls.
- Dashboard metrics, chart, and quick actions use rounded lavender cards on white. The Latest pipelines table keeps its current data and export controls.
- The Dashboard workspace uses a plain white background. Its cards keep their normal opaque surfaces.
- Tables have a pale-lavender header, white and faint-lavender rows, thin dividers, and a subtle hover state. Long values still truncate to one line where their component calls for it.
- Primary actions use purple with white labels. Secondary controls remain light. Play, Pause, and Stop retain their distinct functional colors.
- Selected chips, custom dropdown options, tabs, and current pagination use lavender. Every dropdown uses the shared `CustomSelect` component.
- Profile and Email Filtering panels use lavender surfaces with white inputs. Filtering statuses and reasons retain their semantic colors and text.

## Typography and sizing

Keep **Instrument Sans** for interface text and **Monaspace Neon** for technical or numeric labels. Body text is about 13 px, navigation 12 px, table copy 11-12 px, section headings 16-21 px, and controls about 38-42 px high. Buttons and text fields retain matching rounded corners. Electron opens maximized; `Ctrl + 0`, `Ctrl + Plus`, and `Ctrl + Minus` control zoom.

## Brand, motion, and accessibility

The splash centers the new wordmark over a purple progress indicator. The mark uses a geometric white L, a rising stroke, and a violet square on a dark-purple rounded tile. Smaller brand placements and the desktop installer use the mark-only SVG. The Profile avatar is separate from the brand logo: `react-nice-avatar` creates it from a locally saved seed and changes it only when **Generate new** is clicked.

Use gentle hover and entrance transitions, a visible cyan keyboard focus outline, accessible names for icon-only buttons, and `prefers-reduced-motion` support. Text and icon meaning remain visible without relying on color alone.
