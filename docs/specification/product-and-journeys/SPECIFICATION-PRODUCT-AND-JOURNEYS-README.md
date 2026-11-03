> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Product And Journeys

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

LeadAtlas identity, voice, first-search and repeat journeys, import and agency workflows, and the website/extension split.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 11

PART 2
Product Identity and User Journeys
Name, tagline, voice and the main paths a user takes through the product.
2.1 Tool name
Working name: LeadAtlas. 'Lead' says what it produces; 'Atlas' says it maps businesses across regions.
It is short, easy to spell, works in English and Hinglish conversation, and is neutral enough to cover every
niche, not only estimation.
Candidate Meaning Pros Cons
LeadAtlas Map of leads Broad, memorable, easy .com chance Generic
NicheScout Scout for niches Fits 'choose any niche' Sounds like a research tool
EstiLeads Estimating leads Perfect for the first market Too narrow for all-rounder
BidFinder Find bidding clients Contractor friendly Confused with tender sites
ContactCompass Directional contact finder Friendly Long
Tagline options: 'Pick a niche. Get the leads.' | 'Every business in your niche, in one Excel.' | 'Find. Verify.
Export.' Suggested primary tagline: Pick a niche. Get the leads.
2.2 Brand and voice
- Voice: clear, friendly, confident. Short sentences. No jargon on main screens.
- Logo idea: a rounded map pin in solid blue with a small white magnifier cut-out, shown on black or
white backgrounds. Needs an original design, not a copy of any existing Google logo.
- Icon style: outlined rounded icons (Material Symbols Rounded, open licence), 24 px grid.
- Microcopy examples: 'Ready when you are', 'Found 128 new businesses', 'Source paused - needs
your attention'.
2.3 Main user journeys
Journey A: First search (new user)
1. Sign up, verify the email address, accept the usage policy (Compliance Center).
2. Welcome tour: three cards (Pick niche, Pick place, Press start).
3. Niche picker: choose 'MEP estimating'. Keyword chips appear.
4. Geo targeting: Country USA, State Texas, cities Houston, Dallas, Austin.
5. Filters: Has website, exclude franchise.
6. Sources: website crawler, search discovery, open data. Press Estimate; see 'about 420 leads, 35
minutes'.
7. Press Start. The run page updates live and the Excel file grows; Download is available at any time.
8. Run finishes; summary card with 'Download Excel' and 'View leads'; an email notification is optional.

## Source page 12

Journey B: Repeat campaign
1. Dashboard shows last profile; press 'Run again'.
2. Tool dedupes against past runs and adds only new companies.
3. Notification when finished; export segment to CSV for the mail tool.
Journey C: Enrich own list
1. Import an Excel with company names.
2. Map columns; the tool finds websites for rows without domain.
3. Crawl, extract, verify; download the enriched file.
Journey D: Agency workflow
1. Create one profile per client with their own Excel template.
2. Schedule weekly runs.
3. Share profiles with team seats; export branded workbooks.
2.4 Product principles
- Safe by default: slow, polite, public only. Power is an opt-in.
- Explain everything: each number has a tooltip, each failure has a reason.
- Never lose data: journal first, files second.
- One screen, one job: avoid cluttered pages.
- Keyboard friendly: every main action has a shortcut.
2.5 Two products, one account
Aspect Website (main product) Chrome extension (lite)
Purpose Large, scheduled, repeatable lead generation Quick scans while browsing
Runs on Your servers (Node workers, Playwright) The user's own browser and IP address
Best for Niche plus city campaigns, thousands of leads One company at a time, small batches, captured
listing pages
Discovery Automatic: search, directories, registries, open Manual: the user opens pages, the extension
data, imports captures what is visible
Crawling depth Up to 6 pages per site with browser fallback Up to 6 pages per site, no JavaScript rendering
Verification and Full Syntax locally, MX through your API, quick score
scoring
Storage Supabase Postgres IndexedDB locally, syncs to Supabase
Export Excel with templates, CSV, JSON, VCF Excel and CSV
Plans and billing Full account, team and invoices Uses the website account and plan limits
Journey E: Extension user (quick scan)
1. Install LeadAtlas Lite from the Chrome Web Store and open the side panel.
2. Visit a company website and press 'Scan this site'; allow access to that one site.

## Source page 13

3. See emails, phones and address in seconds; press 'Save lead'.
4. Repeat on other sites or press 'Capture page' on a directory page.
5. Export Excel from the browser, or press Sync to send everything to the website for verification and
scoring.
2.6 Which features live where
The full catalogue is in Part 4. The extension (group X) deliberately contains only the features that make
sense in a browser. Everything heavy stays on the website.
Feature area Website Extension
Niche library and keyword expansion Full Receives synced keyword packs only
Geo targeting and cells Full Not included
Filters Full filter engine Lite filters (X10)
Discovery sources All adapters (B1 to B8) Capture of pages the user opens (X3)
Website crawler Full (C1) One-click site scan (X2) and batch
queue (X4)
Extractors (email, phone, address, Shared TypeScript package Same package inside the extension
social)
Dedupe Full entity resolution Domain and phone dedupe (X5)
Verification Full (D2, D3) Quick verify (X6)
Scoring Editable weights (D4) Quick score (X10)
Export E1 to E4 CSV and Excel (X7)
Compliance Compliance Center (G5) Guard rules (X9)
Queue, proxies, schedules F1 to F6 Not included
Dashboard, team, billing G1 to G7 Uses the website account, sync (X8)

