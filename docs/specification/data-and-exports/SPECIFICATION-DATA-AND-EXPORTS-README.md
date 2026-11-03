> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Data And Exports

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Lead field dictionary, workbook sheets, and status/score formatting.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 75

PART 8
Data Dictionary and Excel Layout
Exactly which columns exist, what they mean and how the Excel workbook is organised.
8.1 Lead fields
Field Type Description Example Main source
company_name text Trading name Apex MEP Estimating Website, listing
website url Canonical home page https://apexmep.com Discovery
domain text Registrable domain, unique key apexmep.com Derived
niche text Niche pack used MEP estimating Profile
description text Short extractive summary Provides MEP takeoff Profile builder
and bids
services list Detected services HVAC, plumbing, Profile builder
electrical
email_primary email Best email by rank info@apexmep.com Crawler
email_all list All emails with kind bids@, info@ Crawler
email_status enum Valid, Risky, Invalid, Unknown Valid Verifier
phone_primary E.164 Best phone +17135550182 Crawler, listing
phone_all list All phones +1713..., +1281... Crawler
phone_type enum Mobile, fixed, toll-free, unknown Fixed Validator
address text One line address 100 Main St, Houston, Structured data
TX 77002
street, city, state, text Address parts Houston / TX / US Parser
postcode, country
latitude, longitude float Coordinates 29.76, -95.37 Geocoder
linkedin_url url Company profile link linkedin.com/company/... Social finder
facebook_url url Public page link facebook.com/... Social finder
instagram_url, x_url, url Other social links - Social finder
youtube_url
rating, review_count numbe From listings when available 4.6 / 83 Map or directory
r
team_size_hint text Size indicator 11-50 Profile builder
years_in_business int From 'since' patterns 12 Profile builder
score int 0 to 100 86 Scoring
sources list Where data came from Website; Directory X Provenance
first_seen, last_seen date Dates 2026-10-19 Engine
tags, notes text User fields hot, call Monday User

## Source page 76

Field Type Description Example Main source
origin enum web or extension extension System
8.2 Workbook sheets
Sheet Contents Formatting
Leads All kept leads, one row per company Blue header, frozen row, filters, hyperlinks,
conditional colours on score and email status
Hot leads Score 70 and above with a valid email Blue header, sorted by score
Emails One row per email with kind and status Useful for mail tools
Phones One row per phone with type Call lists
Filtered out Leads removed by filters and reason Grey header
Run summary Settings, counts, duration, source stats, Blue summary cards at the top
attribution notes
8.3 Conditional formatting rules
- Score 80 to 100: blue tint fill (#E5F1FF) with blue bold number. Score 50 to 79: light grey fill
(#F5F5F7). Below 50: white with grey text.
- Email status Valid: blue bold text; Risky: grey text; Invalid: black strike-through.
- Duplicate websites highlighted with a blue left border (should not occur after dedupe).
- Open data rows carry a footer sheet note with required attribution text.

