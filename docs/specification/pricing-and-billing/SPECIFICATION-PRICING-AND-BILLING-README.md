> **Historical specification:** These prices, plan entitlements, billing steps, and revenue figures are proposals from the original LeadAtlas PDF, not active LeadsGhr pricing or implemented billing. LeadsGhr currently runs as an Electron desktop app. Extraction data stays in local SQLite/files; Supabase is reserved for account data. The website, hosted workers, proxies, and extension mentioned below are historical or future concepts. See [feature status](../../features/FEATURE_STATUS_README.md) for what is built.

# Pricing and Billing

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026), pages 77–80. The tables below reorganize its content for readability. Prices are starting suggestions to test with early users; no payment processor or paid-plan enforcement is currently implemented.

## Proposed plan overview (source page 77)

| Item | Explorer | Starter | Professional | Agency |
| --- | --- | --- | --- | --- |
| Monthly price | $0 | $19 | $49 | $129 |
| Yearly price (per month) | $0 | $15 | $39 | $103 |
| Leads per month | 100 | 2,000 | 15,000 | 75,000 |
| Seats | 1 | 1 | 3 | 10 |
| Saved profiles | 3 | 15 | 50 | Unlimited |
| Parallel runs | 1 | 1 | 2 | 5 |
| Speed profiles | Gentle | Gentle, Balanced | All | All |
| Support | Community | Email | Priority email | Priority plus onboarding call |
| Proxy access | Server IP only | Server IP only | Managed proxy pool | Managed pool plus own proxies |
| Extension site scans per day | 20 | 100 | 500 | 2,000 |
| Extension batch queue (domains) | No | 50 | 200 | 1,000 |
| Extension sync with website | No | Yes | Yes | Yes |
| Best for | Trying the tool | Freelancers | Small sales teams | Agencies and resellers |

### Proposed positioning

| Plan or policy | Specification proposal |
| --- | --- |
| Chrome extension | Included in every plan. Explorer has local scan, capture, and export; Starter and above add batch queue, quick verify, sync, and quick score. |
| Explorer | Free entry plan; the source proposes a “Made with LeadAtlas” line on the summary sheet. |
| Starter | Email verification, address parsing, and multi-format export. |
| Professional | Recommended plan in the source; proxies, scoring, directories, registries, and template designer. |
| Agency | Multiple seats, white label, profile sharing, API-less automation hooks, and early access to new adapters. |
| Annual billing | About 20% discount. |
| Trial | 14-day Professional trial. |
| Lifetime deals | Avoid them because the original hosted-server and proxy costs recur monthly. |

## Proposed feature access by plan (source pages 78–79)

“Yes” means included; “—” means unavailable in that plan in the original specification. This matrix records intended entitlements, not current implementation status.

| ID | Feature | Explorer | Starter | Professional | Agency |
| --- | --- | --- | --- | --- | --- |
| A1 | Niche Library | Yes | Yes | Yes | Yes |
| A2 | Custom Niche Builder and Keyword Expansion | — | Yes | Yes | Yes |
| A3 | Geo Targeting | Yes | Yes | Yes | Yes |
| A4 | Filter Engine | Yes | Yes | Yes | Yes |
| A5 | Saved Search Profiles and Templates | Yes | Yes | Yes | Yes |
| A6 | Dry Run and Yield Estimator | — | Yes | Yes | Yes |
| B1 | Search Engine Discovery | Yes | Yes | Yes | Yes |
| B2 | Map Listings Adapter | — | Yes | Yes | Yes |
| B3 | Public Directory Adapters | — | Yes | Yes | Yes |
| B4 | Open Map Data Importer | — | — | Yes | Yes |
| B5 | Professional Network Company Pages (Browser Extension, Assisted Mode) | — | — | Yes | Yes |
| B6 | Social Public Pages Reader | — | — | Yes | Yes |
| B7 | Associations, Chambers and Licence Registries | — | — | Yes | Yes |
| B8 | Bring Your Own List | Yes | Yes | Yes | Yes |
| C1 | Website Crawler | Yes | Yes | Yes | Yes |
| C2 | Contact Page Detector | Yes | Yes | Yes | Yes |
| C3 | Email Extractor | Yes | Yes | Yes | Yes |
| C4 | Phone Extractor and Normaliser | Yes | Yes | Yes | Yes |
| C5 | Address Parser and Geocoder | — | Yes | Yes | Yes |
| C6 | Social Profile Finder | Yes | Yes | Yes | Yes |
| C7 | Company Profile Builder | — | Yes | Yes | Yes |
| C8 | Structured Data Reader | Yes | Yes | Yes | Yes |
| D1 | Deduplication and Entity Resolution | Yes | Yes | Yes | Yes |
| D2 | Email Verifier | — | Yes | Yes | Yes |
| D3 | Phone Validator | — | Yes | Yes | Yes |
| D4 | Lead Scoring | — | — | Yes | Yes |
| D5 | Source Tracking and Confidence | Yes | Yes | Yes | Yes |
| E1 | Live Excel Export | Yes | Yes | Yes | Yes |
| E2 | Multi-format Export | — | Yes | Yes | Yes |
| E3 | Database and Run History | Yes | Yes | Yes | Yes |
| E4 | Excel Template Designer | — | — | Yes | Yes |
| F1 | Job Queue and Scheduler | Yes | Yes | Yes | Yes |
| F2 | Proxy Pool Manager | — | — | Yes | Yes |
| F3 | Politeness Engine and robots.txt | Yes | Yes | Yes | Yes |
| F4 | Resilience Layer | — | Yes | Yes | Yes |
| F5 | Challenge and Block Policy | Yes | Yes | Yes | Yes |
| F6 | Logging and Monitoring | Yes | Yes | Yes | Yes |
| G1 | Dashboard | Yes | Yes | Yes | Yes |
| G2 | Live Run Console | Yes | Yes | Yes | Yes |
| G3 | Lead Table Workspace | Yes | Yes | Yes | Yes |
| G4 | Outreach Segments and Templates | — | — | Yes | Yes |
| G5 | Compliance Center | Yes | Yes | Yes | Yes |
| G6 | Accounts, Billing and Plans | Yes | Yes | Yes | Yes |
| G7 | Settings, Themes and Team | Yes | Yes | Yes | Yes |
| X1 | Extension Shell, Side Panel and Login | Yes | Yes | Yes | Yes |
| X2 | One-Click Site Scan | Yes | Yes | Yes | Yes |
| X3 | Page Data Capture (Assisted) | Yes | Yes | Yes | Yes |
| X4 | Batch Domain Scan Queue | — | Yes | Yes | Yes |
| X5 | Local Lead List and Dedupe | Yes | Yes | Yes | Yes |
| X6 | Quick Verify | — | Yes | Yes | Yes |
| X7 | Export in the Browser (CSV and Excel) | Yes | Yes | Yes | Yes |
| X8 | Sync with the Main Website | — | Yes | Yes | Yes |
| X9 | Compliance Guard in the Extension | Yes | Yes | Yes | Yes |
| X10 | Lite Filters and Quick Score | — | Yes | Yes | Yes |

## Proposed limits and fair use (source page 79)

| Rule | Explorer | Starter | Professional | Agency |
| --- | --- | --- | --- | --- |
| Emails verified with SMTP probe | No | MX only | Yes | Yes |
| Maximum domains per run | 200 | 2,000 | 10,000 | 50,000 |
| Export rows per file | 500 | 20,000 | 200,000 | 1,000,000 |
| History kept | 30 days | 6 months | 24 months | Unlimited |
| Residential proxy traffic included | No | No | 2 GB | 10 GB |
| Scheduled runs | No | No | Yes | Yes |
| White label Excel template | No | No | No | Yes |

## Proposed billing and access flow (source pages 79–80)

The source proposes admin-approved invoices because it does not specify an integrated payment processor. This workflow is **not currently implemented**.

| Step | Proposed behavior |
| --- | --- |
| 1. Sign up | Verify email and start on Explorer. |
| 2. Request upgrade | Create a pending invoice with payment instructions, such as bank transfer or a local wallet. |
| 3. Confirm payment | An admin marks the invoice paid; plan, seats, quota, and expiry update in Postgres and apply to the proposed website and extension. |
| 4. Enforce access | Check runs, exports, sync, and extension scans against the plan on the server; reset usage counters monthly. |
| 5. Expiry | Send reminders, allow a 7-day grace period, then return to Explorer limits. Keep data for 30 days rather than deleting it immediately. |
| 6. Future gateway | A payment gateway could later mark the same invoices paid automatically. |

### Proposed upgrade prompts

| Moment | Proposed UI |
| --- | --- |
| Quota reaches 80% | Grey banner showing remaining leads and an Upgrade action. |
| Locked feature clicked | Sheet explaining the feature and the plan that unlocks it. |
| Run exceeds 50 verified emails | Snackbar suggesting scheduled runs on Professional. |
| Previously collected leads | Never block saving them. |

## Illustrative revenue examples (source page 80)

| Scenario | Paid customers | Plan mix | Approximate monthly revenue |
| --- | --- | --- | --- |
| Early launch | 50 | 30 Starter, 18 Professional, 2 Agency | $570 + $882 + $258 = $1,710 |
| After 6 months | 200 | 100 Starter, 80 Professional, 20 Agency | $1,900 + $3,920 + $2,580 = $8,400 |
| After 12 months | 500 | 220 Starter, 220 Professional, 60 Agency | $4,180 + $10,780 + $7,740 = $22,700 |

These are illustrations, not forecasts. They exclude server, proxy, and payment costs; actual results depend on marketing, support, and churn.

## Historical break-even example (source page 80)

The source estimated launch costs of **$35–$90 per month** for Supabase Pro, a server, a domain, and email. On those assumptions, about **2 Professional customers at $49 each** or **5 Starter customers at $19 each** cover that range. It suggested keeping prices above roughly three times cost per customer as infrastructure usage grows. These hosted-service assumptions do not describe the current desktop-only cost model.

