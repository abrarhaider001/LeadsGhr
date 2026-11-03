> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Feature Catalogue

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

All 54 feature IDs with group, minimum plan, priority, effort, and their pipeline relationship.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 20

PART 4
Feature Catalogue
The complete list of features, grouped by area, with the minimum plan, priority and estimated
build effort. Priority P0 is needed for the first release, P1 for the second, P2 for later.
ID Feature Group Min plan Prio Days
A1 Niche Library Niche, Search and Filters Explorer P0 4
A2 Custom Niche Builder and Keyword Niche, Search and Filters Starter P0 5
Expansion
A3 Geo Targeting Niche, Search and Filters Explorer P0 5
A4 Filter Engine Niche, Search and Filters Explorer P0 6
A5 Saved Search Profiles and Templates Niche, Search and Filters Explorer P1 3
A6 Dry Run and Yield Estimator Niche, Search and Filters Starter P1 4
B1 Search Engine Discovery Public Discovery Sources Explorer P0 8
B2 Map Listings Adapter Public Discovery Sources Starter P0 9
B3 Public Directory Adapters Public Discovery Sources Starter P1 10
B4 Open Map Data Importer Public Discovery Sources Professional P1 7
B5 Professional Network Company Pages Public Discovery Sources Professional P2 6
(Browser Extension, Assisted Mode)
B6 Social Public Pages Reader Public Discovery Sources Professional P2 5
B7 Associations, Chambers and Licence Public Discovery Sources Professional P1 8
Registries
B8 Bring Your Own List Public Discovery Sources Explorer P0 3
C1 Website Crawler Extraction Engine Explorer P0 10
C2 Contact Page Detector Extraction Engine Explorer P0 3
C3 Email Extractor Extraction Engine Explorer P0 6
C4 Phone Extractor and Normaliser Extraction Engine Explorer P0 5
C5 Address Parser and Geocoder Extraction Engine Starter P1 7
C6 Social Profile Finder Extraction Engine Explorer P1 3
C7 Company Profile Builder Extraction Engine Starter P1 8
C8 Structured Data Reader Extraction Engine Explorer P1 3
D1 Deduplication and Entity Resolution Data Quality and Intelligence Explorer P0 6
D2 Email Verifier Data Quality and Intelligence Starter P0 7
D3 Phone Validator Data Quality and Intelligence Starter P1 3
D4 Lead Scoring Data Quality and Intelligence Professional P1 6
D5 Source Tracking and Confidence Data Quality and Intelligence Explorer P0 4

## Source page 21

ID Feature Group Min plan Prio Days
E1 Live Excel Export Storage and Export Explorer P0 5
E2 Multi-format Export Storage and Export Starter P1 4
E3 Database and Run History Storage and Export Explorer P0 6
E4 Excel Template Designer Storage and Export Professional P2 5
F1 Job Queue and Scheduler Engine Reliability and Safety Explorer P0 8
F2 Proxy Pool Manager Engine Reliability and Safety Professional P1 7
F3 Politeness Engine and robots.txt Engine Reliability and Safety Explorer P0 5
F4 Resilience Layer Engine Reliability and Safety Starter P0 7
F5 Challenge and Block Policy Engine Reliability and Safety Explorer P0 4
F6 Logging and Monitoring Engine Reliability and Safety Explorer P1 4
G1 Dashboard Product Experience and Explorer P0 6
Business
G2 Live Run Console Product Experience and Explorer P0 5
Business
G3 Lead Table Workspace Product Experience and Explorer P0 8
Business
G4 Outreach Segments and Templates Product Experience and Professional P2 6
Business
G5 Compliance Center Product Experience and Explorer P0 6
Business
G6 Accounts, Billing and Plans Product Experience and Explorer P0 12
Business
G7 Settings, Themes and Team Product Experience and Explorer P1 4
Business
X1 Extension Shell, Side Panel and Login Chrome Extension (Lite Explorer P0 6
Scraper)
X2 One-Click Site Scan Chrome Extension (Lite Explorer P0 8
Scraper)
X3 Page Data Capture (Assisted) Chrome Extension (Lite Explorer P0 7
Scraper)
X4 Batch Domain Scan Queue Chrome Extension (Lite Starter P1 6
Scraper)
X5 Local Lead List and Dedupe Chrome Extension (Lite Explorer P0 4
Scraper)
X6 Quick Verify Chrome Extension (Lite Starter P1 4
Scraper)
X7 Export in the Browser (CSV and Excel) Chrome Extension (Lite Explorer P0 3
Scraper)
X8 Sync with the Main Website Chrome Extension (Lite Starter P1 6
Scraper)
X9 Compliance Guard in the Extension Chrome Extension (Lite Explorer P0 4
Scraper)

## Source page 22

ID Feature Group Min plan Prio Days
X10 Lite Filters and Quick Score Chrome Extension (Lite Starter P2 3
Scraper)
Effort summary
54 features, about 307 developer days in total for one experienced developer (roughly 15 working months). P0
features alone are about 185 days.
Plan an extra 3 to 4 weeks on top of these days for infrastructure, deployment, security review and launch
work.
Group Features Days
A Niche, Search and Filters 6 27
B Public Discovery Sources 8 56
C Extraction Engine 8 45
D Data Quality and Intelligence 5 26
E Storage and Export 4 20
F Engine Reliability and Safety 6 35
G Product Experience and Business 7 47
X Chrome Extension (Lite Scraper) 10 51
4.1 How features connect
Stage What happens Features involved
1 Define User chooses niche, place and rules A1 to A6
2 Discover Engine finds companies and websites B1 to B8
3 Extract Crawler reads public pages for contact data C1 to C8
4 Clean Dedupe, verify, score, track sources D1 to D5
5 Save Database journal and live Excel E1 to E4
6 Run safely Queue, politeness, proxies, challenge policy F1 to F6
7 Work Dashboard, run page, table, outreach, compliance, billing G1 to G7
8 Browse Lite scraper inside the browser, sync to the website X1 to X10

