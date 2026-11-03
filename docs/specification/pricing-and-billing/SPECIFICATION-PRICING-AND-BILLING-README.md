> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Pricing And Billing

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Explorer, Starter, Professional, and Agency plans; quotas, access, invoices, upgrades, and sample economics.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 77

PART 9
Pricing and Plans
Four plans from free to agency. Prices are starting suggestions; test them with early users.
9.1 Plan overview
Explorer Starter Professional Agency
Monthly price $0 $19 $49 $129
Yearly (per month) $0 $15 $39 $103
Leads per month 100 2,000 15,000 75,000
Seats 1 1 3 10
Saved profiles 3 15 50 Unlimited
Parallel runs 1 1 2 5
Speed profiles Gentle Gentle, Balanced All All
Support Community Email Priority email Priority plus onboarding
call
Proxy access Server IP only Server IP only Managed proxy pool Managed pool plus own
proxies
Extension site scans per 20 100 500 2,000
day
Extension batch queue No 50 200 1,000
(domains)
Extension sync with No Yes Yes Yes
website
Best for Trying the tool Freelancers Small sales teams Agencies and resellers
- Chrome extension: included in every plan. Explorer gets local scan, capture and export; Starter and
above add the batch queue, quick verify, sync and quick score.
- Explorer (free): proves the value. Output has a small 'Made with LeadAtlas' line on the summary
sheet.
- Starter: removes the daily friction: emails verified, address parser, multi-format export.
- Professional (recommended plan, highlight it with a blue badge): proxies, scoring, directories,
registries, template designer.
- Agency: multi-seat, white label, profile sharing, API-less automation hooks, early access to new
adapters.
- Offer a yearly discount (about 20 percent) and a 14-day free trial of Professional. Avoid lifetime deals:
servers and proxies cost money every month.
9.2 Feature access by plan

## Source page 78

A tick means the feature is included from that plan upward. The matrix is generated from the feature
catalogue, so it always matches Part 5.
ID Feature Explorer Starter Professional Agency
A1 Niche Library Yes Yes Yes Yes
A2 Custom Niche Builder and Keyword Expansion - Yes Yes Yes
A3 Geo Targeting Yes Yes Yes Yes
A4 Filter Engine Yes Yes Yes Yes
A5 Saved Search Profiles and Templates Yes Yes Yes Yes
A6 Dry Run and Yield Estimator - Yes Yes Yes
B1 Search Engine Discovery Yes Yes Yes Yes
B2 Map Listings Adapter - Yes Yes Yes
B3 Public Directory Adapters - Yes Yes Yes
B4 Open Map Data Importer - - Yes Yes
B5 Professional Network Company Pages (Browser - - Yes Yes
Extension, Assisted Mode)
B6 Social Public Pages Reader - - Yes Yes
B7 Associations, Chambers and Licence Registries - - Yes Yes
B8 Bring Your Own List Yes Yes Yes Yes
C1 Website Crawler Yes Yes Yes Yes
C2 Contact Page Detector Yes Yes Yes Yes
C3 Email Extractor Yes Yes Yes Yes
C4 Phone Extractor and Normaliser Yes Yes Yes Yes
C5 Address Parser and Geocoder - Yes Yes Yes
C6 Social Profile Finder Yes Yes Yes Yes
C7 Company Profile Builder - Yes Yes Yes
C8 Structured Data Reader Yes Yes Yes Yes
D1 Deduplication and Entity Resolution Yes Yes Yes Yes
D2 Email Verifier - Yes Yes Yes
D3 Phone Validator - Yes Yes Yes
D4 Lead Scoring - - Yes Yes
D5 Source Tracking and Confidence Yes Yes Yes Yes
E1 Live Excel Export Yes Yes Yes Yes
E2 Multi-format Export - Yes Yes Yes
E3 Database and Run History Yes Yes Yes Yes
E4 Excel Template Designer - - Yes Yes
F1 Job Queue and Scheduler Yes Yes Yes Yes
F2 Proxy Pool Manager - - Yes Yes

## Source page 79

ID Feature Explorer Starter Professional Agency
F3 Politeness Engine and robots.txt Yes Yes Yes Yes
F4 Resilience Layer - Yes Yes Yes
F5 Challenge and Block Policy Yes Yes Yes Yes
F6 Logging and Monitoring Yes Yes Yes Yes
G1 Dashboard Yes Yes Yes Yes
G2 Live Run Console Yes Yes Yes Yes
G3 Lead Table Workspace Yes Yes Yes Yes
G4 Outreach Segments and Templates - - Yes Yes
G5 Compliance Center Yes Yes Yes Yes
G6 Accounts, Billing and Plans Yes Yes Yes Yes
G7 Settings, Themes and Team Yes Yes Yes Yes
X1 Extension Shell, Side Panel and Login Yes Yes Yes Yes
X2 One-Click Site Scan Yes Yes Yes Yes
X3 Page Data Capture (Assisted) Yes Yes Yes Yes
X4 Batch Domain Scan Queue - Yes Yes Yes
X5 Local Lead List and Dedupe Yes Yes Yes Yes
X6 Quick Verify - Yes Yes Yes
X7 Export in the Browser (CSV and Excel) Yes Yes Yes Yes
X8 Sync with the Main Website - Yes Yes Yes
X9 Compliance Guard in the Extension Yes Yes Yes Yes
X10 Lite Filters and Quick Score - Yes Yes Yes
9.3 Limits and fair-use rules
Rule Explorer Starter Professional Agency
Emails verified with SMTP probe No MX only Yes Yes
Maximum domains per run 200 2,000 10,000 50,000
Export rows per file 500 20,000 200,000 1,000,000
History kept 30 days 6 months 24 months Unlimited
Residential proxy traffic included No No 2 GB 10 GB
Scheduled runs No No Yes Yes
White label Excel template No No No Yes
9.4 How billing and access work
No payment processor is integrated, so access is controlled by invoices that you approve in the admin
panel.

## Source page 80

1. The visitor signs up, verifies the email address and starts on Explorer automatically.
2. To upgrade, the user presses 'Request upgrade'; the app creates a pending invoice with your
payment instructions (bank transfer, local wallet or any method you accept).
3. After the payment arrives, an admin marks the invoice paid; the plan, seats, quota and expiry date
update in Postgres and apply to the website and the extension at once.
4. Every run, export, sync and extension scan is checked against the plan on the server; usage counters
reset each month.
5. Before expiry the user gets reminders; after expiry there is a 7-day grace period, then the account
drops to Explorer limits. Data is kept for 30 days and never deleted instantly.
6. Later, when volume grows, a payment gateway can be added: it only needs to mark the same
invoices as paid automatically.
9.5 Upgrade moments (in-app)
- When quota reaches 80 percent: grey banner with remaining leads and 'Upgrade'.
- When a locked feature is clicked: sheet showing what it does and which plan unlocks it.
- After a great run (over 50 verified emails): snackbar suggesting scheduling (Professional).
- Never block saving already collected leads.
9.6 Simple revenue examples
Scenario Customers Mix Monthly revenue (approx.)
Early launch 50 paid 30 Starter, 18 Professional, 2 Agency $570 + $882 + $258 = $1,710
After 6 months 200 paid 100 Starter, 80 Professional, 20 Agency $1,900 + $3,920 + $2,580 =
$8,400
After 12 months 500 paid 220 Starter, 220 Professional, 60 Agency $4,180 + $10,780 + $7,740 =
$22,700
These are illustrations, not forecasts. Server, proxy and payment costs are not deducted; actual numbers depend on marketing,
support and churn.
9.7 Break-even against running costs
Section 6.14 estimates launch costs of about $35 to $90 per month (Supabase Pro, a server, a domain
and email). That is covered by roughly 2 Professional customers ($49 each) or 5 Starter customers ($19
each). Costs grow with proxies and servers as customers and usage grow, so keep prices above about 3
times your cost per customer.

