> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Appendices

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Glossary, build checklists, keyboard shortcuts, MVP scope, and open product decisions.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 87

PART A
Appendices
Appendix A: Glossary
Term Meaning
Niche pack A set of keywords, synonyms and negative keywords describing a business type.
Cell A small geographic area (city or ZIP group) used to split a search.
Adapter A plug-in that knows how to read one source.
Lead One company record with contact data and provenance.
Provenance The source and date of every piece of data.
Dedupe Merging records that describe the same company.
MX record DNS entry that tells where a domain receives email.
Catch-all A mail server that accepts every address, so validity cannot be proven.
E.164 International phone format, for example +17135550182.
robots.txt File where a site states which paths automated tools may visit.
SSRF Server-side request forgery: tricking a server into fetching internal addresses; blocked by
checking every host.
Takeoff (QTO) Measuring quantities of materials from construction drawings.
BOQ Bill of quantities, a priced list of materials and labour.
Multi-tenant One system serving many customers with strictly separated data.
SSE Server-Sent Events: a one-way live stream from server to browser.
RLS Row Level Security: Postgres rules that decide which rows each logged-in user may read or write.
pg-boss A job queue library that stores its queue inside Postgres.
Manifest V3 The current Chrome extension format with service workers instead of background pages.
Offscreen document A hidden page an extension can open to use browser features such as DOMParser.
Selector pack A small JSON file that tells the extension where to find company fields on a given website.
Appendix B: Build checklist (first 30 days of the website)
Day Task Done when
1 - 2 Monorepo, Supabase project and CLI migrations, React and Light and dark theme switch works
Vite shell with theme tokens and sidebar
3 - 4 Auth (sign up, verify, log in), org and member tables, RLS Two users in two orgs cannot see each
policies other's data
5 - 7 Safe fetcher with SSRF guard, robots, politeness gate table Blocks internal addresses; respects delay and
robots
8 - 10 Page ranker and crawler (undici and cheerio) Crawls 20 sample sites correctly

## Source page 88

Day Task Done when
11 - 13 Email, phone, structured data extractors with fixtures All fixture tests pass
14 - 15 Dedupe and provenance Merge tests pass
16 - 18 Import page and enrichment run through pg-boss Excel produced from a CSV of domains
19 - 21 Live Excel export to Supabase Storage with journal Kill worker and resume test passes
22 - 24 Run page with Realtime progress, pause and stop Refresh page and state is restored
25 - 27 Niche library v1 and geo targeting Run from niche and city
28 - 30 Search discovery with slow pacing, challenge pause, quota 100 domains discovered for one city within
checks plan limits
First 15 days of the extension (start after the website core works)
Day Task Done when
1 - 2 Manifest V3 project, side panel in React, login with Supabase Panel opens and signs in
3 - 5 Site scan with permission prompt, offscreen parser and Scan returns emails and phones for 10 test
shared extractors sites
6 - 7 Local list in IndexedDB with dedupe, CSV and Excel export Export opens correctly in Excel
8 - 9 Guard rules: robots, caps, delays, block list Test cases T24 and T27 pass
10 - 12 Capture with first two selector packs Capture works on two directory pages
13 - 15 Sync endpoint, queue, store listing draft Leads appear in the website table
Appendix C: Keyboard shortcuts
Action Shortcut Action Shortcut
New search Ctrl + N Pause or resume run Ctrl + P
Open leads Ctrl + L Stop run Ctrl + Shift + S
Search in table Ctrl + F Export Ctrl + E
Add filter Ctrl + Shift + F Toggle theme Ctrl + Shift + D
Open compliance Ctrl + K Settings Ctrl + ,
Appendix D: Suggested first release scope (MVP)
If time is short, build only these P0 features first, release to a small group, then add the rest:
ID Feature Days
A1 Niche Library 4
A2 Custom Niche Builder and Keyword Expansion 5
A3 Geo Targeting 5
A4 Filter Engine 6
B1 Search Engine Discovery 8
B2 Map Listings Adapter 9

## Source page 89

ID Feature Days
B8 Bring Your Own List 3
C1 Website Crawler 10
C2 Contact Page Detector 3
C3 Email Extractor 6
C4 Phone Extractor and Normaliser 5
D1 Deduplication and Entity Resolution 6
D2 Email Verifier 7
D5 Source Tracking and Confidence 4
E1 Live Excel Export 5
E3 Database and Run History 6
F1 Job Queue and Scheduler 8
F3 Politeness Engine and robots.txt 5
F4 Resilience Layer 7
F5 Challenge and Block Policy 4
G1 Dashboard 6
G2 Live Run Console 5
G3 Lead Table Workspace 8
G5 Compliance Center 6
G6 Accounts, Billing and Plans 12
Website MVP total: about 153 developer days.
Extension MVP (build after the website core)
ID Feature Days
X1 Extension Shell, Side Panel and Login 6
X2 One-Click Site Scan 8
X3 Page Data Capture (Assisted) 7
X5 Local Lead List and Dedupe 4
X7 Export in the Browser (CSV and Excel) 3
X9 Compliance Guard in the Extension 4
Extension MVP total: about 32 developer days.
Appendix E: Decisions you need to make next
1. Final product name and domain.
2. Supabase cloud (Free for testing, Pro for launch) or self-hosted Supabase on your own server.
3. Server provider and region for the Node API and workers (it affects speed and IP reputation).
4. Payment method: manual invoices for the first customers, and when to add a payment gateway.

## Source page 90

5. Which countries to support first (US, UK, Gulf, South Asia).
6. Which high-risk sources to leave out of the hosted workers entirely and offer only through the
extension's assisted capture.
7. Extension listing: public on the Chrome Web Store or unlisted for early users; who owns the developer
account.
8. Proxy strategy: none at first, shared pool, or paid residential.
9. Who will review the terms of use, privacy policies (website and extension) and acceptable-use rules
before launch.
End of document.

