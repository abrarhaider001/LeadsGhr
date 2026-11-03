> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Feature Specifications

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Detailed source requirements for A1-G7 and X1-X10: behavior, dependencies, screens, benefits, and limits.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 23

PART 5
Detailed Feature Specifications
Every feature explained in the same format: what it is, how it works step by step, what it
needs, how it looks, what benefit it gives and which edge cases must be handled.
- Min plan: the lowest plan that includes the feature (see Part 9).
- Module: the file or package in the code base where it lives (see Part 6).
- Effort: estimated developer days including tests.
- Group X describes the Chrome extension (lite scraper). All other groups describe the website and its
workers.
Group A: Niche, Search and Filters
A1 Niche Library
ID Min plan Priority Effort Module
A1 Explorer P0 4 days core/niche/library.ts
A ready-made tree of business niches, each with a keyword pack: main terms, synonyms, related services,
negative keywords and typical website phrases. For the estimation industry it ships with packs such as
construction cost estimating, quantity takeoff, MEP estimating, roofing estimating, electrical estimating,
HVAC estimating, drywall and painting takeoff, landscaping and solar estimating.
HOW IT WORKS
1. User opens the Niche screen and sees a category tree with search box.
2. User ticks one or many niches; the tool loads each keyword pack into editable chips.
3. Tool merges packs, removes duplicate terms and shows the final keyword count.
4. The selection is attached to the active search profile and saved in the user's account.
REQUIREMENTS AND LIBRARIES
Supabase Postgres, JSON, Zod
SCREEN BEHAVIOUR
Category chips with icons; selected chips turn blue with a white tick, unselected chips stay light grey with
black text.
BENEFITS
- Zero setup time: the first useful search is possible in under a minute.
- Packs are tuned by hand, so results are far better than a single raw keyword.
- Packs are plain JSON, so new niches can be added without code changes.
EDGE CASES AND LIMITS
- A niche with no pack falls back to the Custom Niche Builder (A2).
- Pack updates must never overwrite the user's own edited chips; keep user edits in a separate layer.

## Source page 24

A2 Custom Niche Builder and Keyword Expansion
ID Min plan Priority Effort Module
A2 Starter P0 5 days core/niche/builder.ts
Lets the user type any niche in plain words and expands it into a full keyword pack without calling any
external API. Expansion uses a local synonym dictionary, plural and stem rules, a service-phrase template
list and optional n-gram mining from websites the tool has already crawled.
HOW IT WORKS
1. User types a niche, for example 'steel estimating services'.
2. Tool generates variants: synonyms, plural forms, 'services', 'company', 'consultants', 'near me' style
patterns.
3. Tool proposes negative keywords such as 'jobs', 'course', 'salary', 'software'.
4. User accepts, edits or drops chips; the pack can be saved as a new library niche.
REQUIREMENTS AND LIBRARIES
fastest-levenshtein or Fuse.js, natural (offline NLP), Supabase Postgres
SCREEN BEHAVIOUR
A single text field; chips animate in below it. Each chip has a small x and a drag handle for priority.
BENEFITS
- Works for any industry, not only estimation, which makes the tool a true all-rounder.
- Negative keywords remove job boards and training sites early and save crawl time.
- Mined phrases improve with use because every crawl adds vocabulary.
EDGE CASES AND LIMITS
- Very short or ambiguous niches (for example 'steel') are flagged with a warning and a suggestion to
add context.
- Non-English niches need an optional language pack; ship English first.

## Source page 25

A3 Geo Targeting
ID Min plan Priority Effort Module
A3 Explorer P0 5 days core/geo/targeting.ts
Selects where to search: country, state or province, city, ZIP or postal code, or a map radius. Uses a
GeoNames database bundled on the server, so no external geocoding service is needed.
HOW IT WORKS
1. User picks a country; state and city lists populate from the bundled place database.
2. User can multi-select cities or draw a radius around a point.
3. Tool converts the area into a list of search cells (city names plus ZIP codes) so each search stays
small.
4. Cells are queued as independent jobs so large countries can be covered in parts.
REQUIREMENTS AND LIBRARIES
GeoNames data (local), Turf.js, PostGIS
SCREEN BEHAVIOUR
Cascading dropdowns on the left, small tile map on the right with the selected area shaded in light blue.
BENEFITS
- Breaking big areas into small cells gets more unique companies per source.
- Own data means no cost and no rate limits for geo features.
- Users can run the same niche across many cities with a single click.
EDGE CASES AND LIMITS
- Cities with the same name in different states must show state in the label.
- Radius mode is approximate; the cell list is the source of truth.
A4 Filter Engine
ID Min plan Priority Effort Module
A4 Explorer P0 6 days core/filters/engine.ts
A rule builder that applies filters before and after scraping. Pre-filters decide which sources and areas to
visit; post-filters decide which leads to keep. Filters include company size hint, has email, has phone, has
website, website language, rating, review count, years in business, services keywords, country and
exclusion lists.
HOW IT WORKS
1. User opens the Filters panel and adds rules with 'Add filter' (field, operator, value).
2. Pre-filter rules are compiled into source queries; post-filter rules are compiled into a fast in-memory
predicate.
3. While the run is live, each new lead is tested; failed leads go to a 'Filtered out' bin, not deleted.
4. User can change a filter after the run and re-apply it to stored data instantly.
REQUIREMENTS AND LIBRARIES
Zod, Supabase Postgres, own JSON rule engine
SCREEN BEHAVIOUR

## Source page 26

Chips such as 'Has email', 'Rating over 4', 'Exclude: franchise'. An 'Any / All' toggle switches AND and OR
logic.
BENEFITS
- Cleaner output means fewer wasted outreach emails.
- Re-applying filters to stored data avoids re-scraping, saving time and risk of blocks.
- The filtered-out bin lets the user recover leads if a rule was too strict.
EDGE CASES AND LIMITS
- Missing values (for example no rating) need a clear rule: unknown never silently fails a filter unless the
user chooses so.
- Filters that depend on a field the source does not provide must be greyed out for that source.
A5 Saved Search Profiles and Templates
ID Min plan Priority Effort Module
A5 Explorer P1 3 days core/profiles/store.ts
Stores a complete setup (niche pack, geography, filters, sources, export template) as a named profile that
can be run again or scheduled. Profiles can be duplicated and exported as a file to share with a team.
HOW IT WORKS
1. After configuring a search the user taps 'Save as profile' and names it.
2. The profile is stored as versioned JSON in the organisation's database.
3. From the Dashboard the user can run, edit, duplicate, archive or schedule it.
4. Agency plans can export or import profiles as .atlas files.
REQUIREMENTS AND LIBRARIES
Supabase Postgres (JSONB), Zod
SCREEN BEHAVIOUR
Profiles show as cards with niche icon, area, last run date and lead count.
BENEFITS
- Repeat campaigns take two clicks.
- Teams share proven setups.
- Versioning shows which setup produced which leads.
EDGE CASES AND LIMITS
- Profile format needs a schema version for forward compatibility.
- Deleting a profile must not delete leads already collected.

## Source page 27

A6 Dry Run and Yield Estimator
ID Min plan Priority Effort Module
A6 Starter P1 4 days core/estimator/dryrun.ts
Before the full run the tool samples a few cells and sources, then predicts how many leads, emails and
phones to expect, how long the run will take and how many requests it will make.
HOW IT WORKS
1. User presses 'Estimate'.
2. The engine runs a small sample (for example 5 cells, 20 sites) with the real pipeline.
3. Hit rates for email, phone and address are measured and extrapolated to the full area.
4. A summary card shows expected leads, time, proxy usage and risk level.
REQUIREMENTS AND LIBRARIES
Supabase Postgres, plain TypeScript statistics
SCREEN BEHAVIOUR
A summary card with big black numbers, grey labels and a risk badge: Low (blue outline), Medium (grey
fill), High (black fill with white text).
BENEFITS
- Prevents long runs that would produce little value.
- Helps pick the right plan or quota before starting.
- Early risk warning reduces blocks.
EDGE CASES AND LIMITS
- Samples can mislead in uneven areas; show a confidence range, not one number.
Group B: Public Discovery Sources

## Source page 28

B1 Search Engine Discovery
ID Min plan Priority Effort Module
B1 Explorer P0 8 days sources/search_pages.ts
Finds company websites by running niche plus city queries on public search result pages using the tool's
own browser automation (no paid API). Results are filtered to business domains, social pages and
directories are separated, and each domain is queued for crawling.
HOW IT WORKS
1. Engine builds queries from keyword pack x geo cells.
2. A real Chromium instance, driven by Playwright, opens the results page with human-like pacing.
3. Result URLs are parsed, normalised to registrable domains and de-duplicated.
4. Known junk domains (job boards, marketplaces, news) are dropped through a block list.
REQUIREMENTS AND LIBRARIES
Playwright, cheerio, tldts
SCREEN BEHAVIOUR
Source card with an on/off switch, request budget slider and live counter of domains found.
BENEFITS
- Gives broad coverage with no per-search cost.
- Finds companies that are not listed on any directory.
- Domain-first design means the website crawler, the most reliable source, does the heavy work.
EDGE CASES AND LIMITS
- Search engines throttle automated traffic and their terms restrict it; keep volumes low, pace slowly and
expect occasional challenge pages (see F5).
- Result layouts change; keep selectors in a config file so they can be updated without a new release.
B2 Map Listings Adapter
ID Min plan Priority Effort Module
B2 Starter P0 9 days sources/map_listings.ts
Reads the public business listing panels shown on map search pages: name, category, address, phone,
website, rating and review count. Output feeds the same pipeline as every other source.
HOW IT WORKS
1. Engine opens the map search for 'niche in city' and scrolls the results list slowly.
2. For each card it reads the fields visible on screen; the website link is passed to the crawler.
3. Pagination is handled by controlled scrolling with a hard cap per cell.
4. Cells with very many results are split into smaller geographic cells automatically.
REQUIREMENTS AND LIBRARIES
Playwright, cheerio, JSON path extractors
SCREEN BEHAVIOUR
Source card shows 'Cells done 12 of 40' and a pause button.
BENEFITS

## Source page 29

- Best source for local phone numbers and verified addresses.
- Ratings and review counts enable quality filters.
- Website field links straight to the high-yield crawler.
EDGE CASES AND LIMITS
- Map providers prohibit automated collection in their terms. The adapter is therefore marked 'Higher
risk' in the app, runs slowly, never logs in and can be switched off globally in the Compliance Center
(G5).
- Listings change often; always store the date each field was seen.
B3 Public Directory Adapters
ID Min plan Priority Effort Module
B3 Starter P1 10 days sources/directories/*.ts
A plug-in set of adapters for public business directories and industry listing sites. Each adapter is a small
file that knows the listing URL pattern, pagination and field selectors of one directory.
HOW IT WORKS
1. Adapter declares supported countries, niches and fields in a manifest.
2. Engine picks adapters that match the active profile.
3. Listing pages are fetched politely and parsed into the standard Lead schema.
4. Detail pages are visited only when a required field is missing.
REQUIREMENTS AND LIBRARIES
undici, cheerio, Playwright fallback
SCREEN BEHAVIOUR
Adapters appear as a grid of cards with country flags and a health dot (blue dot working, grey dot slow,
black ring broken).
BENEFITS
- New directories are added without touching the core.
- Health checks tell the user which adapters need repair.
- Different directories fill gaps that other sources leave.
EDGE CASES AND LIMITS
- Before shipping an adapter check the directory's robots rules and terms; some forbid bulk collection
and must be excluded.
- Adapters need a nightly self-test against a saved sample page to detect layout changes.

## Source page 30

B4 Open Map Data Importer
ID Min plan Priority Effort Module
B4 Professional P1 7 days sources/osm_import.ts
Imports openly licensed map data (OpenStreetMap regional extracts, downloaded once as files) into the
platform's own PostgreSQL tables on the server. No live API is used. Users simply see an 'Open data'
source card and query it like any other source.
HOW IT WORKS
1. An admin downloads a regional extract in the Admin console (or uploads a file) and presses Import.
2. The importer indexes business points with tags such as office, craft and name into PostGIS tables.
3. User searches read the tables with tag and name matching using the keyword pack and geo cells.
4. Results are tagged 'Open data' and exports carry the required attribution line.
REQUIREMENTS AND LIBRARIES
osm2pgsql, PostgreSQL with PostGIS, pg_trgm
SCREEN BEHAVIOUR
Admin console 'Data packs' lists regions with size, last import date and an Import button. Normal users
only see the source switch.
BENEFITS
- Zero-risk source with no blocking and no rate limits.
- Works offline and is extremely fast once indexed.
- Good for finding company names and websites to crawl.
EDGE CASES AND LIMITS
- Coverage of estimating companies is patchy; treat as a seed source.
- Country extracts are large (gigabytes); plan disk space and import off-peak.
- Licence requires credit; the export module adds the attribution line automatically.

## Source page 31

B5 Professional Network Company Pages (Browser Extension, Assisted
Mode)
ID Min plan Priority Effort Module
B5 Professional P2 6 days extension/capture.ts
A small browser extension works beside the user: the user searches and applies filters in the network's
own site as they normally do, opens a results page and clicks Capture. The extension reads only the
company fields visible on that page (name, website link, location, size band) and sends them to the user's
LeadAtlas account. It never logs in for the user, never types credentials and never pages through results
by itself.
HOW IT WORKS
1. User installs the extension and signs in to LeadAtlas once.
2. User sets filters in the network's own interface and opens a results page.
3. User clicks 'Capture this page'; visible company cards are sent to the account as leads.
4. Captured websites are queued to the server-side crawler for email and phone extraction.
REQUIREMENTS AND LIBRARIES
Chrome and Edge extension (Manifest V3), content script, authenticated REST endpoint
SCREEN BEHAVIOUR
A small popup with a blue 'Capture page' button and a counter of captured companies this session.
BENEFITS
- Lets the user keep the strong professional-network filters while the tool does the tedious copying.
- Human-paced use keeps account risk much lower than automation.
- Website crawl (not the network page) supplies the actual contact data.
EDGE CASES AND LIMITS
- Networks forbid automated scraping in their terms; even assisted capture may breach them. This
feature is off by default, shows a warning at first use and is the user's own responsibility.
- Network pages rarely contain emails or phones, so the value is company discovery, not contact data.

## Source page 32

B6 Social Public Pages Reader
ID Min plan Priority Effort Module
B6 Professional P2 5 days sources/social_pages.ts
Reads the public 'About' information of business pages that are reachable without login: phone, email,
address, website and hours when the page owner has published them. Pages are found from links on
company websites or from search discovery, never by crawling the social network itself.
HOW IT WORKS
1. Crawler finds social page links on a company website (see C6).
2. Reader opens each public page once, without login, at human pace.
3. Visible contact fields are extracted and merged into the lead with source label 'Social page'.
4. If a login wall appears the page is skipped and logged.
REQUIREMENTS AND LIBRARIES
Playwright, cheerio
SCREEN BEHAVIOUR
Lead detail view shows small source badges: Website, Map, Social.
BENEFITS
- Fills missing phone or email for small firms that run mostly from social pages.
- Link-driven discovery keeps request counts low.
- Clear 'skip on wall' rule avoids account risk.
EDGE CASES AND LIMITS
- Social platforms block heavy automation and restrict scraping in their terms; keep to a handful of page
views per minute and never use a personal account.
- Page layouts change very often; expect maintenance.
B7 Associations, Chambers and Licence Registries
ID Min plan Priority Effort Module
B7 Professional P1 8 days sources/registries/*.ts
Adapters for public member lists of trade associations, chambers of commerce and government contractor
or business registries. These lists are published for the public and often include phone, address and
sometimes email.
HOW IT WORKS
1. User picks a country or trade and the app lists matching registries.
2. Adapter walks the public search form or the member list pages.
3. PDF member lists are parsed with pdfplumber into rows.
4. Rows are normalised into Lead records and matched against existing leads.
REQUIREMENTS AND LIBRARIES
undici, Playwright, pdf-parse or pdfjs-dist
SCREEN BEHAVIOUR
Registry cards show the issuing body, number of records and last refreshed date.

## Source page 33

BENEFITS
- High-trust data: these companies are real and active.
- Good for niche and region combinations missing from maps.
- Licence number is a great dedupe key.
EDGE CASES AND LIMITS
- Many registries use captchas on search forms; follow F5 and prefer bulk downloads when offered.
- Some registries restrict commercial reuse; store the terms note in the adapter manifest.
B8 Bring Your Own List
ID Min plan Priority Effort Module
B8 Explorer P0 3 days sources/import_list.ts
Imports a CSV or Excel file of company names or domains the user already has and runs enrichment only
(crawl, extract, verify, score). Column mapping is guided by a simple wizard.
HOW IT WORKS
1. User drops a file on the Import screen.
2. Tool detects encoding and header row and proposes column mapping.
3. Domains are cleaned (remove www, paths, tracking) and queued for the crawler.
4. Rows with only a company name are sent to discovery (B1) first.
REQUIREMENTS AND LIBRARIES
papaparse, exceljs, jschardet
SCREEN BEHAVIOUR
Drag-and-drop area with a live preview of the first 10 rows.
BENEFITS
- Gives value even if all discovery sources are switched off.
- Allows enriching old lead sheets.
- Safe and fully compliant source.
EDGE CASES AND LIMITS
- Very large files (over 500k rows) should be streamed and chunked.
- Duplicates inside the imported file must be reported, not hidden.

## Source page 34

Group C: Extraction Engine
C1 Website Crawler
ID Min plan Priority Effort Module
C1 Explorer P0 10 days crawler/site_crawler.ts
The core engine. For every company domain it fetches the home page and a short, prioritised list of public
pages likely to contain contact data (contact, about, team, locations, footer, privacy and imprint pages) and
extracts data from them. It uses fast HTTP first and a headless browser only when a page needs
JavaScript.
HOW IT WORKS
1. Fetch robots.txt, cache it and honour disallow rules and crawl delay.
2. Fetch the home page; parse internal links and score them by contact keywords in URL and anchor
text.
3. Visit the top N pages (default 6) with a depth limit of 2.
4. Pass each page's HTML to the extractors (C2 to C8) and merge results into one lead.
REQUIREMENTS AND LIBRARIES
undici, cheerio, Playwright fallback, robots-parser
SCREEN BEHAVIOUR
Run console shows 'Crawling example.com - 4 pages - 2 emails found' with a small spinner.
BENEFITS
- Highest yield per request among all sources, and the pages are meant to be public.
- Prioritised link scoring keeps crawls short and polite.
- HTTP-first design is 10 to 20 times cheaper than a browser for every page.
EDGE CASES AND LIMITS
- Never submit forms, never log in, never go behind paywalls; this keeps the tool inside publicly visible
data.
- Set a hard timeout and page size cap, and block private and internal IP ranges before every fetch
(SSRF protection).

## Source page 35

C2 Contact Page Detector
ID Min plan Priority Effort Module
C2 Explorer P0 3 days crawler/page_ranker.ts
Ranks internal links by how likely they are to hold contact data using multilingual keyword lists (contact,
about, team, reach us, impressum, kontakt, contacto and so on) plus URL and menu position signals.
HOW IT WORKS
1. Collect anchors from navigation, footer and body.
2. Score each by keyword match, URL depth and location on page.
3. Add sitemap.xml pages when present.
4. Return a ranked list with scores for the crawler.
REQUIREMENTS AND LIBRARIES
cheerio, Fuse.js
SCREEN BEHAVIOUR
Not user visible; scores appear in the debug view for power users.
BENEFITS
- Finds the one page that matters in a few requests.
- Multilingual list widens global coverage.
- Scores are tunable per niche.
EDGE CASES AND LIMITS
- Sites that put contact data only in a pop-up or image need the Browser fallback (see F4).
C3 Email Extractor
ID Min plan Priority Effort Module
C3 Explorer P0 6 days extract/emails.ts
Finds email addresses in page text, mailto links, JSON-LD and common obfuscations such as 'name [at]
domain [dot] com', HTML entities, split spans and simple JavaScript string joins. Results are classified as
generic (info@, sales@), role based (estimating@) or personal.
HOW IT WORKS
1. Normalise HTML: decode entities, strip zero-width characters.
2. Run regex over text, mailto hrefs and attribute values.
3. Run deobfuscation rules and a small JS-string pattern reader.
4. Classify, de-duplicate, and attach page URL and timestamp as source.
REQUIREMENTS AND LIBRARIES
regex, validator (syntax only), he (HTML entities)
SCREEN BEHAVIOUR
Lead table shows email chips: blue for role or generic, grey for personal, black with strike-through for failed
verification.
BENEFITS
- Captures emails that simple scrapers miss.

## Source page 36

- Classification helps choose safe outreach targets and respect privacy rules.
- Source URL gives proof of public availability.
EDGE CASES AND LIMITS
- Reject image filenames and placeholder emails (example@, name@domain.com).
- Cloud-protected email scripts that need a decoding secret from the page are decoded only if the
algorithm is public and local.
C4 Phone Extractor and Normaliser
ID Min plan Priority Effort Module
C4 Explorer P0 5 days extract/phones.ts
Extracts phone numbers from text and tel links, then normalises them to international E.164 form using the
target country as a hint. Type detection (mobile, landline, toll-free) is added where the numbering plan
allows.
HOW IT WORKS
1. Find candidate numbers by regex with tolerant separators.
2. Parse each with the phonenumbers library using the region hint.
3. Reject invalid or too short numbers and typical non-phone digit strings (dates, zip codes).
4. Store E.164, national format and detected type.
REQUIREMENTS AND LIBRARIES
libphonenumber-js (offline), regex
SCREEN BEHAVIOUR
Phone cells display national format with a small flag; click copies E.164.
BENEFITS
- Consistent format makes calling and CRM import easy.
- Offline library has no cost or limit.
- False positives drop sharply compared with raw regex.
EDGE CASES AND LIMITS
- Local numbers without country context are ambiguous; use the lead's country field.
- Extensions ('ext. 12') should be preserved in a separate field.

## Source page 37

C5 Address Parser and Geocoder
ID Min plan Priority Effort Module
C5 Starter P1 7 days extract/address.ts
Finds postal addresses on pages and in structured data, splits them into street, city, state, postcode and
country, and attaches latitude and longitude from the offline place database when possible.
HOW IT WORKS
1. Locate address blocks using schema.org markup, tags and keyword proximity.
2. Parse with an offline address parser into components.
3. Match city and postcode against the local GeoNames table.
4. Store a normalised one-line address and coordinates.
REQUIREMENTS AND LIBRARIES
parse-address or node-postal (offline), GeoNames, Supabase Postgres
SCREEN BEHAVIOUR
Lead detail shows a mini map pin and an 'Edit address' link.
BENEFITS
- Enables location filters and mapping.
- Normalised addresses make dedupe more accurate.
- Mailing-list use cases get clean fields.
EDGE CASES AND LIMITS
- Parsers are less accurate outside the US, UK and EU; flag low confidence.
- Company with many branches must store addresses as a list, not a single field.
C6 Social Profile Finder
ID Min plan Priority Effort Module
C6 Explorer P1 3 days extract/social.ts
Collects links to public social and professional profiles from company pages: LinkedIn, Facebook,
Instagram, X, YouTube, plus review and directory profile links.
HOW IT WORKS
1. Scan anchors and structured data (sameAs) for known social domains.
2. Strip tracking parameters and normalise to canonical URLs.
3. Validate format (company page vs personal profile).
4. Attach to lead and optionally queue for B6.
REQUIREMENTS AND LIBRARIES
cheerio, tldts
SCREEN BEHAVIOUR
Small grey network icons next to the company name; they turn blue on hover and show the URL.
BENEFITS
- Gives the user extra contact routes beyond email.

## Source page 38

- Feeds the social page reader.
- Useful for outreach research.
EDGE CASES AND LIMITS
- Personal profile URLs should be ignored by default to limit personal data.
C7 Company Profile Builder
ID Min plan Priority Effort Module
C7 Starter P1 8 days extract/profile.ts
Summarises what the company does using only text from its own public pages: services list, specialties
(for example 'MEP takeoff', 'roofing'), software mentioned, regions served, size hints (team count, years)
and a short auto-generated description made by simple extraction, not by an external AI service.
HOW IT WORKS
1. Collect text from home, about and services pages.
2. Extract headings and list items that look like services.
3. Score niche keywords with TF-IDF to detect specialties.
4. Detect size hints with patterns such as 'team of 25' or 'since 2008'.
REQUIREMENTS AND LIBRARIES
cheerio, natural (TF-IDF), Fuse.js
SCREEN BEHAVIOUR
A 'Profile' tab with specialty tags and a one-paragraph summary.
BENEFITS
- Allows filtering by real services, not only by category.
- Helps personalise outreach.
- Everything runs offline.
EDGE CASES AND LIMITS
- Summaries are extractive; mark them 'auto-generated' and keep the source page link.

## Source page 39

C8 Structured Data Reader
ID Min plan Priority Effort Module
C8 Explorer P1 3 days extract/structured.ts
Reads machine-readable data that sites publish for search engines: JSON-LD, microdata and RDFa such
as Organization, LocalBusiness, PostalAddress, ContactPoint and sameAs.
HOW IT WORKS
1. Parse script type application/ld+json blocks and microdata attributes.
2. Map schema.org fields to the Lead schema.
3. Mark fields as 'structured' with high confidence.
4. Fall back to text extractors for missing fields.
REQUIREMENTS AND LIBRARIES
cheerio, own tolerant JSON-LD and microdata reader
SCREEN BEHAVIOUR
Invisible to the user except for a 'Structured data' badge on fields.
BENEFITS
- Highest accuracy data with almost no effort.
- Handles layout changes gracefully.
- Cheap and fast.
EDGE CASES AND LIMITS
- Invalid JSON-LD is common; use a tolerant parser and never crash on a bad block.
Group D: Data Quality and Intelligence
D1 Deduplication and Entity Resolution
ID Min plan Priority Effort Module
D1 Explorer P0 6 days quality/dedupe.ts
Merges records that describe the same company across sources. Keys include registrable domain,
normalised phone, normalised name plus city, and licence number. Fuzzy name matching handles suffixes
such as LLC, Ltd and Inc.
HOW IT WORKS
1. Normalise names (case, punctuation, suffixes).
2. Exact match on domain or E.164 phone merges immediately.
3. Fuzzy match on name plus city above a threshold queues a merge.
4. Merged lead keeps all source records so the merge can be undone.
REQUIREMENTS AND LIBRARIES
fastest-levenshtein, tldts, Supabase Postgres (pg_trgm)
SCREEN BEHAVIOUR
A 'Merged 3 sources' badge on a lead; an 'Unmerge' option in the detail view.

## Source page 40

BENEFITS
- One clean row per company.
- Fewer duplicate emails sent.
- Source history is preserved.
EDGE CASES AND LIMITS
- Franchise and multi-branch companies share a name; use address as a tie-breaker.
- Never merge on shared generic phone numbers of directories.
D2 Email Verifier
ID Min plan Priority Effort Module
D2 Starter P0 7 days quality/email_verify.ts
Checks syntax, domain existence, MX records, disposable domains, catch-all behaviour and (optionally) a
gentle SMTP handshake without sending mail. Produces a status: Valid, Risky, Invalid or Unknown.
HOW IT WORKS
1. Syntax check and domain normalisation.
2. DNS lookup for MX and fallback A records with caching.
3. Optional SMTP RCPT check using a fixed sender, strict rate limits and stop on greylist.
4. Catch-all test with a random address; mark results as Risky if the server accepts all.
REQUIREMENTS AND LIBRARIES
node:dns/promises, node:net (SMTP handshake), own disposable-domain list
SCREEN BEHAVIOUR
Status icons with text in the table: Valid (blue filled), Risky (grey outline), Invalid (black cross), Unknown
(light grey dot).
BENEFITS
- Cuts bounce rates before outreach.
- Runs on your own workers with no per-check fee.
- Status labels are easy to filter.
EDGE CASES AND LIMITS
- Many mail hosts block SMTP probes, and many cloud providers block outbound port 25; fall back to
MX-only and say so.
- Frequent probing can hurt your server IP reputation; use a dedicated low-rate IP and conservative
defaults.

## Source page 41

D3 Phone Validator
ID Min plan Priority Effort Module
D3 Starter P1 3 days quality/phone_validate.ts
Validates numbers against national numbering plans, flags possible and impossible numbers and marks
toll-free or premium lines.
HOW IT WORKS
1. Run is_possible and is_valid checks.
2. Detect type and carrier region where available offline.
3. Flag premium or special numbers.
4. Set a status and reason string.
REQUIREMENTS AND LIBRARIES
libphonenumber-js
SCREEN BEHAVIOUR
Phone cell shows a small check or warning icon with a tooltip.
BENEFITS
- Fewer wrong numbers in the call list.
- Type detection supports SMS or call campaigns.
EDGE CASES AND LIMITS
- Offline validation cannot prove a line is active; label it 'format valid'.
D4 Lead Scoring
ID Min plan Priority Effort Module
D4 Professional P1 6 days quality/scoring.ts
Gives every lead a 0 to 100 score from transparent rules: has verified email, has phone, website quality,
niche match strength, location match, size hint, rating and recency. Weights are editable.
HOW IT WORKS
1. Compute sub-scores from stored fields.
2. Apply weights from the active scoring profile.
3. Sum and normalise to 0 to 100.
4. Store a short 'why' explanation for each score.
REQUIREMENTS AND LIBRARIES
plain TypeScript, JSON rules
SCREEN BEHAVIOUR
Score ring in blue; hover shows breakdown bars.
BENEFITS
- Sort and call the best leads first.
- Transparent rules build trust.
- Different profiles for different campaigns.

## Source page 42

EDGE CASES AND LIMITS
- Scores must be recomputed when fields change; keep it event driven.
D5 Source Tracking and Confidence
ID Min plan Priority Effort Module
D5 Explorer P0 4 days quality/provenance.ts
Every field remembers where it came from, when it was seen and how confident the extraction was.
Conflicts between sources are resolved by a rank order that the user can change.
HOW IT WORKS
1. Store field value with source id, URL, timestamp and confidence.
2. When two sources disagree, keep both and mark the winner by rank.
3. Show provenance in the detail view.
4. Use age of data to lower confidence over time.
REQUIREMENTS AND LIBRARIES
Supabase Postgres
SCREEN BEHAVIOUR
Hover on any field shows 'Seen on example.com/contact on 14 Oct 2026'.
BENEFITS
- Auditable data, useful for compliance questions.
- Easy to debug wrong values.
- Enables 'refresh stale data' runs.
EDGE CASES AND LIMITS
- Storage grows quickly; compact old history monthly.
Group E: Storage and Export

## Source page 43

E1 Live Excel Export
ID Min plan Priority Effort Module
E1 Explorer P0 5 days export/excel_live.ts
Leads are journaled in the database the moment they are found, and the Excel workbook is rebuilt on the
server while the run is going. The user can press Download at any time and always gets the latest valid
file. Styling follows the template: header colours, column widths, frozen header row, filters and hyperlinks.
HOW IT WORKS
1. Every lead is first written to the PostgreSQL journal in a transaction.
2. Every 25 new leads (or 30 seconds) a worker rebuilds the workbook in memory and uploads it to
object storage, replacing the previous version atomically.
3. The run page shows the file card; Download returns a short-lived signed link to the latest version.
4. At the end the worker adds a summary sheet with counts and run settings.
REQUIREMENTS AND LIBRARIES
exceljs, Supabase Storage (signed URLs), Supabase Postgres journal
SCREEN BEHAVIOUR
A file card on the run page: 'leads_2026-10-19.xlsx - 842 rows' with a blue Download button that always
serves the latest version.
BENEFITS
- This is the 'keep saving to Excel' behaviour you asked for, now available from any device.
- Crash safe by design: the database is the source of truth, files can always be rebuilt.
- Formatted file is ready to hand to a sales team.
EDGE CASES AND LIMITS
- Very large runs (over about 100,000 rows) rebuild in the background; show a 'Preparing file' state.
- Cap one sheet at about 1,000,000 rows and roll to a new sheet or file.

## Source page 44

E2 Multi-format Export
ID Min plan Priority Effort Module
E2 Starter P1 4 days export/formats.ts
Exports the same data to CSV, JSON, VCF contact cards and CRM-friendly CSV layouts, with column
selection and saved export presets.
HOW IT WORKS
1. User selects leads (all, filtered or selected rows).
2. Chooses format and preset.
3. Tool maps columns and writes the file with correct encoding (UTF-8 with BOM for Excel CSV).
4. Export history is logged for compliance.
REQUIREMENTS AND LIBRARIES
papaparse, JSON, vcards-js, exceljs
SCREEN BEHAVIOUR
Export dialog with format tiles and a column checklist.
BENEFITS
- Easy import into any CRM or mailing tool.
- Presets avoid repeated mapping work.
EDGE CASES AND LIMITS
- Respect suppression list (G5) in every export.
E3 Database and Run History
ID Min plan Priority Effort Module
E3 Explorer P0 6 days storage/models.ts
All runs, leads, sources and logs live in PostgreSQL, separated per organisation. History lets users browse
previous runs, compare them and re-export from any device.
HOW IT WORKS
1. Supabase CLI migrations create and update the schema on deploy.
2. Every lead is written in a transaction together with its source rows and the organisation id.
3. Indexes on (org_id, domain), (org_id, phone) and trigram name search keep queries fast.
4. Encrypted nightly backups and a retention job purge old data according to plan and settings.
REQUIREMENTS AND LIBRARIES
Supabase Postgres, Supabase CLI migrations, Row Level Security, pg_trgm
SCREEN BEHAVIOUR
History page lists runs with date, niche, area and counts, and a 'Compare' action.
BENEFITS
- No installation; teams share one workspace.
- Re-export at any time without re-scraping.
- Foundation for dedupe against past runs.

## Source page 45

EDGE CASES AND LIMITS
- Tenant isolation is critical: every query must filter by org_id, backed by PostgreSQL row-level security.
- Very large tables (tens of millions of leads) need partitioning by organisation or month.
E4 Excel Template Designer
ID Min plan Priority Effort Module
E4 Professional P2 5 days export/template_designer.ts
Visual editor for the output workbook: pick columns and order, rename headers, set colours, add
conditional formatting for score and verification status, and create extra sheets such as 'Hot leads'.
HOW IT WORKS
1. User opens the designer and drags fields into columns.
2. Applies a theme (default: black, white, grey and blue) and conditional rules.
3. Saves the layout as a template.
4. Live Excel Writer (E1) uses the template for new files.
REQUIREMENTS AND LIBRARIES
exceljs, JSON
SCREEN BEHAVIOUR
Preview grid on the right updates instantly as options change.
BENEFITS
- Output looks professional without manual formatting.
- Agency users can brand files for clients.
EDGE CASES AND LIMITS
- Templates must handle missing columns gracefully.
Group F: Engine Reliability and Safety

## Source page 46

F1 Job Queue and Scheduler
ID Min plan Priority Effort Module
F1 Explorer P0 8 days engine/queue.ts
A persistent queue of small jobs (one geo cell on one source, or one domain crawl) processed by separate
worker containers. Jobs survive restarts and deploys, can be paused, resumed, prioritised and scheduled.
A fairness layer stops one customer from using all workers.
HOW IT WORKS
1. Starting a run creates jobs in the pg-boss queue, which is stored inside Postgres (no Redis needed).
2. Workers pull jobs by priority with per-source, per-domain and per-organisation concurrency limits.
3. Failed jobs retry with backoff up to a limit, then move to a Failed list.
4. The scheduler creates new runs at set times and resumes unfinished ones after a deploy.
REQUIREMENTS AND LIBRARIES
pg-boss (job queue stored in Postgres), pg-boss schedules, Supabase Postgres
SCREEN BEHAVIOUR
Run page with Pause, Resume and Stop buttons plus a queue position and progress gauge.
BENEFITS
- Large runs become safe and resumable.
- Schedules enable weekly refreshes.
- Granular jobs make blocking easier to handle.
EDGE CASES AND LIMITS
- Idempotency is vital; a repeated job must not create duplicate leads.
- Per-domain limits must be global across all customers (a small gate table in Postgres enforces it) so
two users cannot hammer the same website.
F2 Proxy Pool Manager
ID Min plan Priority Effort Module
F2 Professional P1 7 days engine/proxies.ts
The platform keeps a managed pool of proxies (datacenter and optional residential) and rotates them by
rules: per domain, per N requests or on error. Health checks remove dead proxies. Plans decide which
pool a customer's runs may use; Agency customers can also add their own proxies. Running with no proxy
is possible for low-risk, low-volume work.
HOW IT WORKS
1. Admin imports provider proxies in the Admin console; Agency users can add their own on the Proxies
page.
2. The manager tests each proxy for speed, anonymity and country.
3. The pool assigns a proxy per source session with sticky rules and country matching.
4. Bad proxies are cooled down or retired automatically.
REQUIREMENTS AND LIBRARIES
undici ProxyAgent, Playwright proxy options

## Source page 47

SCREEN BEHAVIOUR
Admin: table of proxies with latency bars and status dots. Agency users: a simple 'Bring your own proxies'
page.
BENEFITS
- Spreads load across IPs and reduces rate-limit hits, which matters a lot when all traffic comes from a
cloud server.
- Country matching gives local results.
- Cost can be controlled per plan.
EDGE CASES AND LIMITS
- Proxies must not be used to evade explicit blocks; the engine stops for a domain that returns a clear
denial.
- Residential proxy traffic is paid per gigabyte; meter it and cap it per plan.
F3 Politeness Engine and robots.txt
ID Min plan Priority Effort Module
F3 Explorer P0 5 days engine/politeness.ts
Applies per-domain request spacing, concurrency of one by default, crawl-delay support, robots.txt allow
and disallow rules, and honest user-agent identification with a contact URL.
HOW IT WORKS
1. Fetch and cache robots.txt per domain for 24 hours.
2. Check every URL before fetching; skip disallowed paths and log them.
3. Enforce minimum delay with random jitter.
4. Apply stricter limits automatically for high-risk sources.
REQUIREMENTS AND LIBRARIES
robots-parser, p-limit, Postgres per-domain gate table
SCREEN BEHAVIOUR
Compliance badge on each source: 'Respects robots - Delay 3s'.
BENEFITS
- Lowers block risk and keeps the tool defensible.
- Predictable load on small business websites.
- Trust signal for users and their clients.
EDGE CASES AND LIMITS
- Where robots rules conflict with a user wish, robots wins; there is no override switch.

## Source page 48

F4 Resilience Layer
ID Min plan Priority Effort Module
F4 Starter P0 7 days engine/resilience.ts
Handles flaky networks and tricky sites: retries with exponential backoff, timeouts, redirect loops, SSL
errors, encoding problems, JavaScript-only pages (auto escalate from HTTP to headless browser) and
memory limits on browser contexts.
HOW IT WORKS
1. Wrap each fetch in a retry policy by error type.
2. If HTML lacks expected content, re-render with Playwright and wait for network idle.
3. Recycle browser contexts after N pages to control memory.
4. Record the reason for every failure in the log.
REQUIREMENTS AND LIBRARIES
p-retry, Playwright, undici
SCREEN BEHAVIOUR
Failure reasons are grouped in the run summary (timeout 12, blocked 3, no contact page 41).
BENEFITS
- Higher completion rate with less user attention.
- Clear failure reasons make fixes faster.
EDGE CASES AND LIMITS
- Escalating to a browser costs time; cap how often it is used per run.
F5 Challenge and Block Policy
ID Min plan Priority Effort Module
F5 Explorer P0 4 days engine/challenge.ts
Detects captchas, login walls and 'unusual traffic' pages and responds by pausing, not by bypassing. In a
web app the user cannot solve a challenge in the server's browser, so the source is paused and cooled
down, the user is notified, and they can choose to skip it or retry later.
HOW IT WORKS
1. Detect a challenge by known markers and HTTP codes (403, 429, 503 with challenge text).
2. Pause the source for that run and send an in-app notification and optional email.
3. After the cool-down the engine retries at a much slower rate.
4. If it repeats, the source is skipped for the run and the failure reason is logged.
REQUIREMENTS AND LIBRARIES
Playwright, Supabase Realtime, in-app notifications
SCREEN BEHAVIOUR
A light grey banner on the run page with a blue button: 'Source paused - verification needed. Retry later /
Skip source'.
BENEFITS
- Avoids IP bans for you and legal risk linked to circumvention.

## Source page 49

- Keeps users informed.
- Slower but sustainable data collection.
EDGE CASES AND LIMITS
- Do not integrate captcha-solving services or evasion tricks; this is a deliberate product boundary.
F6 Logging and Monitoring
ID Min plan Priority Effort Module
F6 Explorer P1 4 days engine/logs.ts
Structured logs for every request, extraction and decision with levels and filters, plus a health panel
(requests per minute, success rate, memory, active browsers).
HOW IT WORKS
1. Log events as JSON lines and as database rows.
2. Show a live filtered stream in the console.
3. Compute rolling statistics for the health panel.
4. Provide 'Export diagnostics' for support.
REQUIREMENTS AND LIBRARIES
pino, Supabase Postgres, own admin log viewer
SCREEN BEHAVIOUR
Terminal-like panel with level colours (INFO in grey, WARN in blue, ERROR in bold black).
BENEFITS
- Faster debugging for you and the user.
- Visible health helps tune speed.
EDGE CASES AND LIMITS
- Never log full page bodies or personal data in plain text beyond the chosen retention period.
Group G: Product Experience and Business

## Source page 50

G1 Dashboard
ID Min plan Priority Effort Module
G1 Explorer P0 6 days web/src/pages/Dashboard.tsx
Home screen with totals, recent runs, leads by niche, email hit rate, quota usage and quick actions such
as 'New search', 'Import list' and 'Open last file'.
HOW IT WORKS
1. The page loads summary counters from the API when opened.
2. Cards and charts render with the black, grey and blue palette.
3. Counters update live while a run is active through the event stream.
4. Tips and plan upgrade prompts appear for locked features.
REQUIREMENTS AND LIBRARIES
React, Vite, TypeScript, Tailwind CSS, Recharts, TanStack Query
SCREEN BEHAVIOUR
Light grey page, soft pill-shaped cards, large black numbers with grey labels and one blue primary button.
BENEFITS
- Fast overview and one-click restart of work.
- Quota visibility prevents surprise limits.
EDGE CASES AND LIMITS
- Keep the dashboard responsive when the database is large by using pre-aggregated counters.
G2 Live Run Console
ID Min plan Priority Effort Module
G2 Explorer P0 5 days web/src/pages/Run.tsx
Real-time view of an active run: progress bar by cells, leads found, emails and phones found, speed, ETA,
current source and recent leads stream.
HOW IT WORKS
1. Workers write progress events and counters to Supabase.
2. Supabase Realtime pushes the changes to the open run page.
3. The page batches updates every 500 ms; the user can pause, resume, stop or change speed.
4. On finish a summary card and the Download button appear.
REQUIREMENTS AND LIBRARIES
Supabase Realtime (or Server-Sent Events from the Node API), React
SCREEN BEHAVIOUR
Large circular progress ring in blue on a light grey track, counters in black, warnings as grey banners.
BENEFITS
- Confidence that the tool is working.
- Immediate control over speed and risk.
EDGE CASES AND LIMITS

## Source page 51

- Throttle UI updates so the page stays smooth at high rates.
- The page must recover after a refresh or a lost connection by reloading the run state from the API.
G3 Lead Table Workspace
ID Min plan Priority Effort Module
G3 Explorer P0 8 days web/src/pages/Leads.tsx
Spreadsheet-like table for browsing millions of rows with sorting, instant search, column chooser, inline
editing, tags, notes, multi-select actions and a detail drawer.
HOW IT WORKS
1. Rows load in pages from the API with cursor pagination and virtual scrolling.
2. Search uses PostgreSQL full-text and trigram indexes.
3. Inline edits are stored as user overrides above scraped values.
4. Bulk actions: tag, export, delete, verify again, add to suppression.
REQUIREMENTS AND LIBRARIES
TanStack Table with virtual scrolling, cursor pagination, Postgres full-text search
SCREEN BEHAVIOUR
Sticky header, zebra rows in very light grey, status chips in blue and grey.
BENEFITS
- Work with data inside the tool; no need to open Excel for every check.
- User edits never get lost on re-scrape.
EDGE CASES AND LIMITS
- Edits and scraped values need clear precedence rules; show an 'edited' marker.
G4 Outreach Segments and Templates
ID Min plan Priority Effort Module
G4 Professional P2 6 days web/src/pages/Outreach.tsx
Builds lists (segments) from filters and prepares mail-merge ready exports with personalised fields. The
tool does not send email itself; it exports to the user's own mail or CRM tool.
HOW IT WORKS
1. User saves a filter as a segment, for example 'MEP estimators with verified email, score over 70'.
2. Writes a template with merge fields such as {company} and {city}.
3. Preview shows five sample rows rendered.
4. Export produces a mail-merge file and keeps a log of who was exported.
REQUIREMENTS AND LIBRARIES
Handlebars, Supabase Postgres segments
SCREEN BEHAVIOUR
Two-pane editor: template on the left, live preview on the right.
BENEFITS

## Source page 52

- Closes the loop from data to outreach.
- No sending keeps legal and reputation risk with the user's chosen platform.
EDGE CASES AND LIMITS
- Warn if a segment contains personal emails in regulated regions.
G5 Compliance Center
ID Min plan Priority Effort Module
G5 Explorer P0 6 days web/src/pages/Compliance.tsx
One place for responsible use: source risk labels, global source switches, suppression and do-not-contact
lists, robots decisions, data retention settings, a legal notice template and a per-lead 'public source' proof
link.
HOW IT WORKS
1. On first sign-in the user reads and accepts a usage policy.
2. Each source shows a risk label; admins can disable a source for all users, and owners can disable it
for their organisation.
3. The suppression list is applied to every export and run.
4. Retention rules purge old data automatically (default 12 months).
REQUIREMENTS AND LIBRARIES
React, Supabase Postgres, admin-level global switches
SCREEN BEHAVIOUR
Shield icon in the sidebar; blue dot when a setting needs attention.
BENEFITS
- Reduces legal exposure and builds trust with serious clients.
- Makes opt-out requests easy to honour.
EDGE CASES AND LIMITS
- The tool provides controls, not legal advice; the user remains responsible for local laws.

## Source page 53

G6 Accounts, Billing and Plans
ID Min plan Priority Effort Module
G6 Explorer P0 12 days api/auth.ts and api/billing.ts
Sign-up, email verification, organisations with seats, plans and quotas, all on Supabase Auth and
Postgres. Because no external payment tool is used, payments are approved by hand in the admin panel:
the customer pays by bank transfer or any local method you accept, you mark the invoice paid, and the
plan turns on instantly. A payment gateway can be added later without changing the design.
HOW IT WORKS
1. User signs up with email or OAuth; Supabase Auth sends the verification mail.
2. User picks a plan and presses 'Request upgrade'; an invoice with payment instructions is created.
3. After the money arrives, an admin marks the invoice paid; plan, seats, quota and expiry update in
Postgres.
4. Every run, export, extension sync and extension scan checks the plan and quota on the server; usage
counters reset each month.
REQUIREMENTS AND LIBRARIES
Supabase Auth (email and OAuth), Row Level Security, Node API, manual payment approval in the admin
panel, Supabase Postgres
SCREEN BEHAVIOUR
Plan badge in the top bar and a Billing page with usage meters, invoices, payment instructions and a
friendly 'Upgrade' sheet that explains what a locked feature does.
BENEFITS
- No fees to a payment processor and no third-party dependency.
- Plan changes apply instantly after approval.
- Server-side limits cannot be bypassed from the browser or the extension.
EDGE CASES AND LIMITS
- Manual approval does not scale past a few hundred customers; plan to add a gateway later.
- Expired plans: 7-day grace period, then downgrade to Explorer; never delete data immediately.

## Source page 54

G7 Settings, Themes and Team
ID Min plan Priority Effort Module
G7 Explorer P1 4 days web/src/pages/Settings.tsx
Account and organisation settings: speed profile, defaults, language, theme (light, dark, system), keyboard
shortcuts, team members and roles, notification preferences and data export.
HOW IT WORKS
1. Settings are saved per user and organisation in the database.
2. Changes apply live where possible.
3. Theme tokens switch the whole app between the light and dark palettes (black, white, grey, blue).
4. Owners invite teammates by email and assign roles (Owner, Member, Viewer); users can export or
delete their data.
REQUIREMENTS AND LIBRARIES
React, CSS variables, Supabase Postgres user_settings
SCREEN BEHAVIOUR
Left-side settings categories with search, in a clean list layout with soft rounded cards.
BENEFITS
- Comfortable for long working sessions on any device.
- Safe defaults for beginners, deep control for advanced users.
- Team roles keep clients' data separated inside an agency.
EDGE CASES AND LIMITS
- Dangerous options (very high concurrency) sit behind an 'Advanced' toggle with a warning.
- Deleting a team member must reassign or keep their saved profiles.
Group X: Chrome Extension (Lite Scraper)

## Source page 55

X1 Extension Shell, Side Panel and Login
ID Min plan Priority Effort Module
X1 Explorer P0 6 days extension/src/sidepanel/
The extension is a Manifest V3 add-on for Chrome, Edge and Brave. Its interface is a side panel built in
React with the same design tokens as the website, so it stays open while the user browses. The user signs
in with the same account as the website.
HOW IT WORKS
1. User installs the extension (Web Store, or loaded unpacked while testing).
2. Clicking the toolbar icon opens the side panel with tabs: Home, Leads, Queue, Export, Settings.
3. The user signs in once; the Supabase session is kept in chrome.storage.local and refreshed
automatically.
4. Without an account the extension still works locally in Explorer mode (scan, capture, export).
REQUIREMENTS AND LIBRARIES
Manifest V3, React, Vite, chrome.sidePanel, Supabase JS client (Auth)
SCREEN BEHAVIOUR
400 px wide panel, soft white background, graphite headlines, a big blue pill button 'Scan this site' on the
Home tab and pill-shaped tabs.
BENEFITS
- Lightweight: no server needed for the basic features.
- Same account and same look as the website, so users feel it is one product.
- Side panel stays open while moving between websites.
EDGE CASES AND LIMITS
- The MV3 service worker sleeps after a short idle time, so all state must live in storage, never in
memory.
- Keep the bundle small (under about 1 MB) for fast install and easier store review.

## Source page 56

X2 One-Click Site Scan
ID Min plan Priority Effort Module
X2 Explorer P0 8 days extension/src/scan/siteScan.ts
The lighter version of the crawler. On any company website the user presses Scan and the extension
reads the home page plus up to five contact-type pages, then returns emails, phones, address and social
links. Everything runs in the user's own browser and IP address; no server is needed.
HOW IT WORKS
1. User opens a company website and presses 'Scan this site'.
2. The extension asks one time for permission to that single website (optional host permission).
3. It fetches the home page, ranks the links (contact, about, team) and fetches the best five with a 1.5 to
3 second delay, always without cookies.
4. An offscreen document parses the HTML with the shared extractors and the merged result appears
with a Save lead button.
REQUIREMENTS AND LIBRARIES
chrome.permissions, fetch with credentials omitted, offscreen document (DOMParser), shared extractors
package, libphonenumber-js
SCREEN BEHAVIOUR
A result card: emails as blue chips, phone numbers with flags, address, small social icons and a blue
'Save lead' pill; a thin progress line under the button while scanning.
BENEFITS
- Instant results for any site the user is looking at, in any niche.
- Zero server cost for you, because the user's browser does the work.
- Traffic is spread across many users' IPs, so blocks are rare.
EDGE CASES AND LIMITS
- Pages that need JavaScript to show contact data are not rendered; the panel says 'No data found - try
the full web app'.
- Never fetches pages behind a login (cookies are not sent).
- Maximum six pages per site; the limit is shared with the daily scan cap of the plan.

## Source page 57

X3 Page Data Capture (Assisted)
ID Min plan Priority Effort Module
X3 Explorer P0 7 days extension/src/capture/
A Capture button reads only the company cards that are visible on the page the user is viewing (name,
website link, phone, address, size band, category). It works on directories, map listing pages, professional
network pages and public social pages. The selector rules live in small JSON packs that can be updated
without a new store release.
HOW IT WORKS
1. User opens a results page and sets filters using the site's own interface.
2. User presses 'Capture page' in the side panel.
3. A content script reads the visible cards using the selector pack for that site.
4. Leads are added to the local list with a source label, and their websites are offered to Site Scan (X2
and X4).
REQUIREMENTS AND LIBRARIES
chrome.scripting, content scripts, per-site selector packs (JSON), MutationObserver for visible cards only
SCREEN BEHAVIOUR
Panel shows 'Capture page (12 found)' with a blue pill, a list of the found companies and a checkbox to
select which to keep.
BENEFITS
- Lets users keep the strong filters of sites like the professional network, with no automation of the site
itself.
- Selector packs can be fixed in hours when a layout changes.
- Much lower account risk than automatic scraping.
EDGE CASES AND LIMITS
- Manual only: no auto-scroll, no auto-next-page, no background loops.
- High-risk sites show a warning on first use; terms of those sites may forbid even assisted capture, so
the user is responsible.
- An admin can switch a selector pack off for everyone remotely.

## Source page 58

X4 Batch Domain Scan Queue
ID Min plan Priority Effort Module
X4 Starter P1 6 days extension/src/queue/
The user pastes a list of domains, or selects captured leads, and the extension scans them one by one
with polite delays. It runs while the browser is open and is the lightweight cousin of the server crawler.
HOW IT WORKS
1. User pastes domains or selects captured leads and presses 'Scan all'.
2. The queue is stored in chrome.storage; an alarm wakes the service worker every minute.
3. One domain at a time (default), 3 to 6 seconds between requests; pause, resume and stop buttons
are always visible.
4. Results are saved to the local list; failures are listed with a reason.
REQUIREMENTS AND LIBRARIES
chrome.alarms, chrome.storage, offscreen document, p-limit
SCREEN BEHAVIOUR
Queue tab with a list, status icons (waiting, scanning, done, failed) and a daily quota meter.
BENEFITS
- Small batches without needing the website or a server.
- Free for you to run, because it uses the user's machine.
- Good bridge between capture on listing pages and the full web app.
EDGE CASES AND LIMITS
- The browser must stay open; for bigger jobs the panel offers 'Send to web app'.
- Daily caps by plan stop heavy use from the extension.
X5 Local Lead List and Dedupe
ID Min plan Priority Effort Module
X5 Explorer P0 4 days extension/src/store/
All captured and scanned leads are stored on the user's machine in IndexedDB, merged by website
domain and phone number so the same company never appears twice.
HOW IT WORKS
1. Every result is normalised (domain, phone in international format, name without suffixes).
2. Exact match on domain or phone merges immediately; fuzzy name plus city flags a possible duplicate.
3. The list supports search, tags, notes and delete.
4. Data stays local until the user chooses to sync (X8).
REQUIREMENTS AND LIBRARIES
IndexedDB via idb, tldts, fastest-levenshtein
SCREEN BEHAVIOUR
Leads tab with search, filter chips, status badges and a detail drawer.
BENEFITS
- Works offline and keeps data private by default.

## Source page 59

- No duplicate rows in exports.
- Same dedupe rules as the website, so syncing is clean.
EDGE CASES AND LIMITS
- Browser storage can be cleared by the user; remind them to export or sync regularly.
X6 Quick Verify
ID Min plan Priority Effort Module
X6 Starter P1 4 days extension/src/verify/
Checks email syntax and phone format locally. Because a browser cannot do DNS lookups, the domain
and MX check is done by your own Node API, which also holds the disposable-domain list.
HOW IT WORKS
1. Syntax and phone format checks run instantly in the browser.
2. Domains are sent in batches of up to 50 to the /verify endpoint of your own API.
3. The API returns Valid, Risky, Invalid or Unknown with a reason.
4. Badges update in the lead list.
REQUIREMENTS AND LIBRARIES
libphonenumber-js, own Node endpoint /verify (MX lookup and disposable-domain list)
SCREEN BEHAVIOUR
Status badges: Valid (blue check), Risky (grey outline), Invalid (graphite cross), Unknown (silver dot).
BENEFITS
- Fewer bounces without any external verification service.
- Keeps your verification logic in one place for web and extension.
EDGE CASES AND LIMITS
- Needs a signed-in account so abuse of the endpoint can be limited by plan.

## Source page 60

X7 Export in the Browser (CSV and Excel)
ID Min plan Priority Effort Module
X7 Explorer P0 3 days extension/src/export/
Exports the local list as CSV or a formatted Excel file straight from the browser, with the blue header style
and the same column names as the website export.
HOW IT WORKS
1. User selects leads (all, filtered or selected) and a format.
2. The extension builds the file in memory in an offscreen document or the side panel.
3. chrome.downloads saves it to the Downloads folder.
4. A short summary toast shows the number of rows exported.
REQUIREMENTS AND LIBRARIES
exceljs (browser build), papaparse, chrome.downloads
SCREEN BEHAVIOUR
Export tab with two format tiles (Excel, CSV) and a column checklist.
BENEFITS
- Value from day one, even without an account.
- Same file layout as the website, so files can be combined.
EDGE CASES AND LIMITS
- Respect the suppression list when it has been synced from the website.
X8 Sync with the Main Website
ID Min plan Priority Effort Module
X8 Starter P1 6 days extension/src/sync/
Pushes leads from the extension into the user's website account and pulls down settings: niche keyword
packs, filter profiles, suppression list and selector packs. This is what connects the lite tool with the full
product.
HOW IT WORKS
1. User presses 'Sync' (or enables auto-sync).
2. Leads are sent in batches of 100 to the API with origin set to 'extension'.
3. The server dedupes against existing leads by organisation and domain and counts the plan quota.
4. Pulled settings are stored locally; failed batches retry later.
REQUIREMENTS AND LIBRARIES
Supabase JS client, REST endpoints on the Node API, chrome.storage
SCREEN BEHAVIOUR
Sync chip in the header: 'Synced just now' or 'Waiting for connection'.
BENEFITS
- One workspace: leads from the browser and from the web app live in the same table.
- Website can finish heavy work (full crawl, verification, scoring) on leads the extension found.
- Teams share profiles and suppression lists.

## Source page 61

EDGE CASES AND LIMITS
- Conflicts: server data wins for verified fields; the user's edits are kept as overrides.
- Large first sync (thousands of leads) runs in the background with progress.
X9 Compliance Guard in the Extension
ID Min plan Priority Effort Module
X9 Explorer P0 4 days extension/src/guard/
Built-in safety rules: it checks robots.txt of a site before scanning, never fetches with cookies, never
auto-paginates, enforces delays and daily caps, shows risk labels for sensitive sites and honours a remote
block list and suppression list.
HOW IT WORKS
1. Before each scan the extension reads the site's robots.txt and skips disallowed paths.
2. The risk label of the current site (from a small JSON list) decides whether to show a warning.
3. A global 'Pause all scanning' switch and the plan's daily cap are always enforced.
4. Admin can add domains to the block list; the extension pulls it on every start.
REQUIREMENTS AND LIBRARIES
robots-parser (browser build), chrome.storage, remote block list from your own API
SCREEN BEHAVIOUR
A small shield icon in the header; tapping it shows the rules in plain language.
BENEFITS
- Keeps the product defensible and the store listing safe.
- Protects small business websites from heavy scanning.
- Same philosophy as the web app: public data, polite pace.
EDGE CASES AND LIMITS
- Browser fetch cannot set a custom User-Agent, so politeness depends on delays and caps, not on
identification.
- Where robots rules conflict with a user wish, robots wins.

## Source page 62

X10 Lite Filters and Quick Score
ID Min plan Priority Effort Module
X10 Starter P2 3 days extension/src/filters/
A small set of filters (has email, has phone, has website, country, tag) and a simple 0 to 100 quick score
from the fields found, so the user sees the best leads first.
HOW IT WORKS
1. User turns on filter chips in the Leads tab.
2. A quick score is computed from verified email, phone, website and niche match.
3. Leads can be sorted by score.
4. Scores are recomputed when verification or edits change fields.
REQUIREMENTS AND LIBRARIES
plain TypeScript, JSON rules
SCREEN BEHAVIOUR
Filter chips as pills and a small score ring (blue for high, grey for low) per lead.
BENEFITS
- Fast prioritising without opening the website.
- Same scoring idea as the web app, but with fewer inputs.
EDGE CASES AND LIMITS
- Quick score is simpler than the full score on the website; show a 'Quick' label.

