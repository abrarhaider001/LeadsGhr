> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Front Matter

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Document identity, contents, and the map of all eleven parts and appendices.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 1

LeadAtlas
Website + Chrome Extension
Niche Business Lead Intelligence Platform
Complete Product, Design, Architecture and Pricing Specification
Self-built scraping engine | Public data only | No external data APIs
Version 3.0 | October 2026 | React, Node and Supabase edition

## Source page 2

Contents
Vision, Scope and Feasibility 7
1.1 The idea in one paragraph . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
1.2 Goals . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
1.3 Non-goals (what the tool will not do) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
1.4 Who will use it . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
1.5 Feasibility: what is possible and what is not . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
1.6 Definition of 'public data' used in this document . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
1.7 Source risk map . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
1.8 What changes because it is a web application . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
Product Identity and User Journeys 11
2.1 Tool name . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
2.2 Brand and voice . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
2.3 Main user journeys . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
Journey A: First search (new user) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
Journey B: Repeat campaign . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
Journey C: Enrich own list . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
Journey D: Agency workflow . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
2.4 Product principles . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
2.5 Two products, one account . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
Journey E: Extension user (quick scan) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
2.6 Which features live where . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13
Design System (Soft Minimal Palette) 14
3.1 Colour palette and rules . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14
Usage rules . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14
Supporting shades (derived from the four colours) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
Dark theme tokens . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
How meaning is shown without red, green or yellow . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
3.2 Typography . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
3.3 Spacing, shape and elevation . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
3.4 Core components . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
3.5 Responsive layout . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
3.6 Motion and accessibility . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
3.7 Pages and screens . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18

## Source page 3

3.8 New Search wizard: field-by-field behaviour . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18
3.9 Chrome extension interface . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 19
Extension screens . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 19
Feature Catalogue 20
4.1 How features connect . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22
Detailed Feature Specifications 23
Group A: Niche, Search and Filters . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 23
A1 Niche Library . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 23
A2 Custom Niche Builder and Keyword Expansion . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24
A3 Geo Targeting . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 25
A4 Filter Engine . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 25
A5 Saved Search Profiles and Templates . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 26
A6 Dry Run and Yield Estimator . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 27
Group B: Public Discovery Sources . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 27
B1 Search Engine Discovery . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28
B2 Map Listings Adapter . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28
B3 Public Directory Adapters . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 29
B4 Open Map Data Importer . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 30
B5 Professional Network Company Pages (Browser Extension, Assisted Mode) . . . . . . . . . . . . . . . . . . . 31
B6 Social Public Pages Reader . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 32
B7 Associations, Chambers and Licence Registries . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 32
B8 Bring Your Own List . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 33
Group C: Extraction Engine . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 34
C1 Website Crawler . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 34
C2 Contact Page Detector . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 35
C3 Email Extractor . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 35
C4 Phone Extractor and Normaliser . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 36
C5 Address Parser and Geocoder . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 37
C6 Social Profile Finder . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 37
C7 Company Profile Builder . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 38
C8 Structured Data Reader . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 39
Group D: Data Quality and Intelligence . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 39
D1 Deduplication and Entity Resolution . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 39
D2 Email Verifier . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 40
D3 Phone Validator . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 41
D4 Lead Scoring . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 41
D5 Source Tracking and Confidence . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 42

## Source page 4

Group E: Storage and Export . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 42
E1 Live Excel Export . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 43
E2 Multi-format Export . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 44
E3 Database and Run History . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 44
E4 Excel Template Designer . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 45
Group F: Engine Reliability and Safety . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 45
F1 Job Queue and Scheduler . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 46
F2 Proxy Pool Manager . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 46
F3 Politeness Engine and robots.txt . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 47
F4 Resilience Layer . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 48
F5 Challenge and Block Policy . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 48
F6 Logging and Monitoring . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 49
Group G: Product Experience and Business . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 49
G1 Dashboard . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 50
G2 Live Run Console . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 50
G3 Lead Table Workspace . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 51
G4 Outreach Segments and Templates . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 51
G5 Compliance Center . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 52
G6 Accounts, Billing and Plans . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 53
G7 Settings, Themes and Team . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 54
Group X: Chrome Extension (Lite Scraper) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 54
X1 Extension Shell, Side Panel and Login . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 55
X2 One-Click Site Scan . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 56
X3 Page Data Capture (Assisted) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 57
X4 Batch Domain Scan Queue . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 58
X5 Local Lead List and Dedupe . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 58
X6 Quick Verify . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 59
X7 Export in the Browser (CSV and Excel) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 60
X8 Sync with the Main Website . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 60
X9 Compliance Guard in the Extension . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 61
X10 Lite Filters and Quick Score . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 62
Architecture and Implementation Guide (React, Node, Supabase) 63
6.1 System overview . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 63
Request flow: a full run on the website . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 63
Request flow: a scan in the Chrome extension . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 63
6.2 Data pipeline . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 64
6.3 Technology choices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 64
6.4 Project folder structure (monorepo) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 65

## Source page 5

6.5 Supabase database schema and Row Level Security . . . . . . . . . . . . . . . . . . . . . . . . . . 65
6.6 Source adapter interface (TypeScript) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 66
6.7 Polite and safe website crawler (core pattern) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 66
6.8 Email extraction with simple deobfuscation (shared code) . . . . . . . . . . . . . . . . . . . . . . . 67
6.9 Excel build and publish to Supabase Storage . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 67
6.10 Queue and workers with pg-boss . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 68
6.11 Node API outline . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 68
6.12 Chrome extension architecture . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 69
Parts of the extension . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 69
manifest.json (core settings) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 69
Site scan flow (simplified) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 70
What runs where . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 70
6.13 Security and abuse prevention . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 70
6.14 Deployment, scaling and monthly cost . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 71
Stages . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 71
Supabase plans (checked against public pricing pages, mid 2026) . . . . . . . . . . . . . . . . . . . . . . . . . . 71
Niche Library and Filter Reference 73
7.1 Starter niche packs (estimation industry) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 73
7.2 Filter field reference . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 74
7.3 Geo cell strategy . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 74
7.4 Speed profiles . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 74
Data Dictionary and Excel Layout 75
8.1 Lead fields . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 75
8.2 Workbook sheets . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 76
8.3 Conditional formatting rules . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 76
Pricing and Plans 77
9.1 Plan overview . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 77
9.2 Feature access by plan . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 77
9.3 Limits and fair-use rules . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 79
9.4 How billing and access work . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 79
9.5 Upgrade moments (in-app) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 80
9.6 Simple revenue examples . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 80
9.7 Break-even against running costs . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 80
Roadmap, Quality and Operations 81

## Source page 6

10.1 Delivery roadmap (one developer, about 21 weeks) . . . . . . . . . . . . . . . . . . . . . . . . . . 81
10.2 Testing strategy . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 81
Core test cases . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 82
10.3 Risk register . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 82
10.4 Success measures (KPIs) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 83
10.5 Maintenance routine after launch . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 84
Responsible Use, Privacy and Legal Notes 85
11.1 Principles built into the product . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 85
11.2 Outreach laws overview . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 85
11.3 In-app legal texts to prepare . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 85
11.4 What to do when a site owner objects . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 85
11.5 Chrome extension: store rules and privacy . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 86
Appendices 87
Appendix A: Glossary . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 87
Appendix B: Build checklist (first 30 days of the website) . . . . . . . . . . . . . . . . . . . . . . . . . . 87
First 15 days of the extension (start after the website core works) . . . . . . . . . . . . . . . . . . . . . . . . . . 88
Appendix C: Keyboard shortcuts . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 88
Appendix D: Suggested first release scope (MVP) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 88
Extension MVP (build after the website core) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 89
Appendix E: Decisions you need to make next . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 89

