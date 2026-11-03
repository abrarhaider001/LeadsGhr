> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Design System

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

The soft minimal palette, typography, spacing, components, responsive behavior, motion, website pages, wizard, and extension screens.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 14

PART 3
Design System (Soft Minimal Palette)
A complete visual specification: colour tokens, typography, spacing, components and every
main screen. Four brand colours only: soft white, graphite black, silver grey and one blue.
Black is for headlines, grey for descriptions, white for surfaces and blue for everything
interactive or highlighted. The look is soft and premium: pill shapes, large radii and gentle
shadows.
3.1 Colour palette and rules
These are the four brand colours. Nothing else is used as a brand colour: no red, green, yellow or orange
anywhere, including charts, statuses and warnings. Meaning is carried by blue, grey and black plus icons
and text.
# Name Hex Role
1 Soft White Page background, panels, light surfaces
#F5F5F7
2 Graphite Black Headlines, titles, strong text, dark theme background
#1D1D1F
3 Silver Grey Descriptions on dark theme, icons, placeholders, disabled
#AAAAAA
states, dividers
4 Action Blue Buttons, chips, links, selected states, progress, highlights
#0A237D
Usage rules
Element Light theme Dark theme (reversed)
Headlines and titles Graphite Black #1D1D1F Soft White #F5F5F7
Descriptions and helper text Grey (see note below) Silver Grey #AAAAAA
Page background Soft White #F5F5F7 Graphite Black #1D1D1F
Cards, sidebar, panels White #FFFFFF or Soft White with #2A2A2D
soft shadow
Buttons, chips, links, highlights, selected Action Blue #0A237D Action Blue #0A237D
states
Text on blue button White White
Borders and dividers Hairline #E3E3E8 #3A3A3C
Icons and placeholders Silver Grey #AAAAAA Silver Grey #AAAAAA

## Source page 15

Accessibility note about Silver Grey
#AAAAAA on a #F5F5F7 background has a contrast ratio of only about 2.1:1, which is too low for small text.
So on the light theme, use Silver Grey for icons, borders and placeholders, and use a darker supporting grey
#6E6E73 (about 4.6:1) for descriptions. On the dark theme, #AAAAAA on #1D1D1F is about 7:1, so it works
for descriptions as it is. For small blue text links on light backgrounds use the darker blue #0062CC.
Supporting shades (derived from the four colours)
Token Hex Use
Description grey (light theme) Descriptions and helper text on light backgrounds
#6E6E73
Body text Long paragraphs and table cell text
#424245
Hairline Borders on light theme
#E3E3E8
White Inputs, table rows, raised cards
#FFFFFF
Blue pressed / text-safe Pressed buttons, small blue text on light backgrounds
#0062CC
Blue tint Selected rows, info callouts, soft chip background
#E5F1FF
Blue light Secondary chart bars
#66AFFF
Dark card Cards on dark theme
#2A2A2D
Dark hairline Borders on dark theme
#3A3A3C
Dark theme tokens
In the dark theme the roles reverse: Graphite Black becomes the background, headlines turn Soft White
and descriptions use Silver Grey. Blue stays the same.
Token Light Dark
Background #F5F5F7 #1D1D1F
Card #FFFFFF #2A2A2D
Headline #1D1D1F #F5F5F7
Description #6E6E73 #AAAAAA
Icon / placeholder #AAAAAA #AAAAAA
Divider #E3E3E8 #3A3A3C
Action blue #0A237D #0A237D
Blue tint #E5F1FF #12263F
Text on blue button #FFFFFF #FFFFFF
How meaning is shown without red, green or yellow

## Source page 16

Meaning Visual treatment
Success / Valid Blue filled check icon plus the word 'Valid'
Warning / Risky Grey outlined triangle icon plus the word 'Risky' on a soft grey chip
Error / Invalid Graphite cross icon plus the word 'Invalid'; row text may use strike-through
Unknown / Pending Silver grey dot plus 'Unknown'
High score Blue ring and bold number; low score: grey ring
Blocked source / paused Soft grey banner with graphite text and a blue action button
Critical error Graphite banner with white text and a white outlined button
3.2 Typography
Font family: Inter (open source, self-hosted as WOFF2 for speed and privacy). It is very close to Apple's
own system font, which is licensed only for Apple platforms. The CSS stack is: Inter, -apple-system,
BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif. Headlines use slightly tight letter spacing (minus 2
percent) for the premium look.
Role Font and weight Size / line Colour (light) Use
Display Inter Bold 40 / 44 px #1D1D1F Landing page and big numbers
Headline Inter Semibold 28 / 36 px #1D1D1F Page titles
Title Inter Semibold 18 / 26 px #1D1D1F Cards, dialogs, section headers
Body Inter Regular 15 / 24 px #424245 Normal text, tables
Description Inter Regular 14 / 22 px #6E6E73 Helper text under titles
Caption Inter Medium 12 / 16 px #6E6E73 Badges, footers, labels
Code and JetBrains Mono Regular 13 / 20 px #424245 Console, JSON, regex
logs
3.3 Spacing, shape and elevation
The look follows the soft, rounded style of modern premium interfaces: large pill shapes and gentle raised
surfaces.
- 8 px base grid; common gaps 8, 16, 24, 32, 48.
- Corner radius: buttons and chips fully round (pill), inputs 14 px, cards 24 px, dialogs 28 px, big feature
tiles 32 px.
- Raised surface shadow (soft): 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px
rgba(0,0,0,0.04). A subtle light highlight on the top-left edge gives the soft raised look.
- Pressed or selected input: inner shadow, never a heavy outline. Keep a visible 2 px blue focus ring for
keyboards.
- Dark theme: replace shadows with a 1 px hairline (#3A3A3C) because shadows are invisible on dark
backgrounds.
- Layout: sidebar 248 px (collapsed 72 px), content max width 1200 px, 24 px page padding on desktop,
16 px on mobile.

## Source page 17

3.4 Core components
Component Specification
Primary button Fill #0A237D, white text 15 px semibold, height 44, pill radius; hover slightly lighter, pressed
#0062CC, focus ring 2 px blue with 2 px offset.
Secondary button Soft white fill with hairline border, graphite text; hover white with soft shadow.
Danger button Graphite #1D1D1F fill with white text, used only for delete and stop (no red anywhere).
Chips Height 36, pill; unselected: soft grey fill with graphite text; selected: blue fill with white text and a
check.
Cards White or soft white, 24 px radius, 20 px padding, soft raised shadow; stat cards may show a blue
number.
Inputs Height 44, 14 px radius, white fill, hairline border, silver grey placeholder; focus shows blue ring.
Tables Row 52 px, header caption style in grey, no heavy grid, hairline row dividers, hover soft grey,
selected row blue tint.
Status badges Valid: blue check; Risky: grey outline; Invalid: graphite cross; Unknown: silver dot; always icon plus
text.
Progress ring and bars Blue on a light grey track; centre shows percent.
Toast Graphite pill with white text, bottom centre, 4 s; action text in light blue.
Banner Soft grey bar for warnings (graphite text, blue action button); graphite bar with white text for errors.
Empty state Four soft pill shapes (white, graphite, grey, blue) as illustration, one sentence and one button.
Tooltips Graphite, white 12 px text, 400 ms delay; every icon button has one.
Modals and drawers 28 px radius, soft backdrop blur and 40 percent graphite overlay; drawer slides from the right in 240
ms.
3.5 Responsive layout
Breakpoint Width Layout
Mobile Under 640 px Single column, bottom tab bar (Dashboard, Search, Leads, Runs, More),
tables become stacked cards, filters in a bottom sheet
Tablet 640 to 1024 px Collapsed icon sidebar (72 px), two-column cards, side drawers become
full-height sheets
Desktop Over 1024 px Full sidebar, multi-column dashboard, dense tables with column chooser
Large Over 1440 px Content centred at 1200 px max width
3.6 Motion and accessibility
- Motion: 150 to 250 ms ease-out for entrances, spring-like easing for pill buttons; respect the 'reduce
motion' setting.
- Contrast: body text at least 4.5:1; use #6E6E73 (not #AAAAAA) for small grey text on light
backgrounds.
- Focus: visible 2 px blue focus ring on every interactive element; full keyboard navigation.
- Screen readers: label all icons; announce run progress politely every 10 percent.

## Source page 18

- Language: all UI strings in resource files from day one so Hinglish, Urdu or Arabic can be added;
support right-to-left layout.
- Theme: follows the system setting by default, with a manual light, dark or system switch.
3.7 Pages and screens
Every page of the web application with its address (route), purpose and main components.
Page Route Purpose and main components Key states
Landing and pricing / and /pricing Hero, features, plan cards, call to action Visitor, signed-in
(public)
Sign up and log in /signup, /login Email or OAuth, verification, forgot password Error, verifying
Onboarding /welcome 3-step intro, usage policy checkbox First sign-in
Dashboard /dashboard Stat cards, leads chart, recent runs, quota meter Empty, active run,
quota low
New Search wizard /search/new Stepper: Niche, Place, Filters, Sources, Output, Draft, estimating,
Review ready
Niche picker /niches Category tree, search, keyword chips, builder Library, custom
Run page (live) /runs/:id Progress ring, counters, event stream, pause and Running, paused,
stop, Download blocked, done
Run history /runs List of runs, compare, re-export Filtered
Leads workspace /leads Virtual table, search, filter chips, bulk actions Loading, selection,
editing
Lead drawer /leads/:id Fields with source badges, notes, map pin Edited, merged,
verified
Exports /exports Format tiles, column list, presets, file history Preparing, ready
Template designer /exports/template Column drag area, theme picker, preview Draft, saved
s
Profiles /profiles Saved setups, schedule button Empty, many
Outreach segments /outreach Segments, merge templates, preview Empty, ready
Compliance Center /compliance Source switches, suppression list, retention OK, needs attention
Proxies (Agency) /settings/proxies Bring your own proxies, health Empty, healthy, failing
Team /settings/team Members, roles, invites, seats Invited, active
Settings /settings Speed, defaults, theme, notifications, data export Default, advanced
Billing /billing Plan, usage meters, invoices, upgrade Free, trial, past due
Extension page /extension Install guide, feature list, permissions explained, Web Not installed, installed
Store link, sync status
Admin console /admin Users, plans, data packs, proxies, adapters health, Admin only
(internal) global source switches
3.8 New Search wizard: field-by-field behaviour

## Source page 19

Step Fields Validation Helper text
1 Niche Selected niches, keyword chips, At least 1 niche and 3 keywords Tip: add services you want, like
negative keywords 'takeoff'.
2 Place Country, state, city, radius At least 1 area Smaller cities give more
complete results.
3 Filters Rules, any/all Rules must reference available Filters run live; you can change
fields them later.
4 Sources Source toggles, speed profile At least 1 source on Slower speed means fewer
blocks.
5 Output File name, template, extra formats Name valid The file updates while the run is
going.
6 Review Summary and Estimate Quota check Estimated leads and time before
you start.
3.9 Chrome extension interface
The extension uses the same tokens, fonts and components as the website, in a narrow layout. The main
interface is a side panel, so it stays open while the user moves between websites.
Item Specification
Side panel width 400 px (browser controlled); content padding 16 px; light and dark follow the system
Toolbar icon Solid blue map pin on a white rounded square (16, 32, 48 and 128 px); badge shows the
number of unsaved leads in a blue pill
Header Logo, sync chip ('Synced just now'), shield icon for compliance rules, account avatar
Tabs Pill-shaped tabs: Home, Leads, Queue, Export, Settings
Primary action Large blue pill button: 'Scan this site' on websites, 'Capture page' on supported listing pages
Result card Soft raised card with email chips, phone numbers, address, social icons and a blue 'Save lead'
button
Empty state Four soft pill shapes and one line: 'Open a company website and press Scan'
Permission sheet Plain-language bottom sheet: 'Allow LeadAtlas Lite to read example.com? It reads public
pages only and never sends your cookies.'
Store assets Screenshots 1280 x 800, small promo tile 440 x 280, short description under 132 characters
Extension screens
Screen Purpose and main components Key states
Login Email or OAuth sign-in, 'Use without account' link Signed out, signing in, error
Home Current site card, big Scan or Capture button, daily scan meter No site, scanning, result,
limit reached
Leads Local list, search, filter chips, quick score, detail drawer Empty, many, selection
Queue Pasted domains, progress, pause and stop, failures with reasons Idle, running, paused, done
Export Format tiles (Excel, CSV), column checklist, row count Ready, building, done
Settings Delays, daily cap view, theme, auto-sync, clear local data, sign out Default, advanced

