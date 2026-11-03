> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Roadmap And Quality

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Delivery phases, tests, risks, success measures, and ongoing maintenance.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 81

PART 10
Roadmap, Quality and Operations
How to build it in stages, how to test it, what can go wrong and how to keep the tool alive
after launch.
10.1 Delivery roadmap (one developer, about 21 weeks)
Phase Weeks Deliverables Exit check
0 Foundations 1 - 2 Monorepo, Supabase project with migrations and RLS, Sign up, log in, theme switch,
auth, Fastify skeleton, React shell with the soft theme tenant isolation test passes
tokens
1 Core pipeline 3 - 6 Shared extractors, crawler, pg-boss workers, import list, Import 100 domains in the
(MVP) run API, Realtime progress, Excel export browser, download Excel with
60+ percent emails
2 Discovery 7 - 9 Niche library, geo targeting, search discovery, open data Run niche plus city from
import, first directory adapters scratch
3 Quality and filters 10 - 11 Email verify, phone validate, filter engine, provenance, Bounce rate under 10 percent
scoring on sample
4 Product and 12 - 14 Wizard, dashboard, lead table, compliance center, plans Invoice approval changes plan
business and manual invoices, team roles, admin console and limits correctly
5 Chrome extension 15 - 18 Side panel and login, site scan, capture with selector Scan, capture, export and
packs, local list, export, guard rules, sync, queue, quick sync work end to end;
verify and score; store submission extension submitted
6 Hardening 19 - 20 Security review, SSRF and tenant isolation tests, load No critical findings, restore
tests, backups and restore drill, health page tested
7 Beta and launch 21 20 beta users, adapter and selector pack fixes, docs, Crash-free runs over 95
landing and pricing pages percent
10.2 Testing strategy
- Fixture pages: save 200 real public pages as HTML fixtures; extractors are tested offline against
them.
- Golden files: expected JSON outputs for each fixture, diffed on every change.
- Adapter self-tests: nightly run against saved listing pages; adapter marked 'broken' if selectors fail.
- End-to-end tests: Playwright tests drive the web app: sign up, start a run, watch progress, download
Excel.
- Security tests: SSRF attempts, cross-tenant access attempts, upload abuse, rate-limit checks.
- Load tests: 5,000 domains and 50 simultaneous users against a local mock web server with slow
responses, redirects and errors.
- Soak tests: 12-hour runs watching worker memory, browser contexts and database connections.
- Extension tests: Playwright with the unpacked extension loaded: scan fixture sites, permission
prompts, service worker restart, queue resume, offline sync retry.
- Browser matrix: latest Chrome, Edge, Safari and Firefox on desktop; Safari and Chrome on phones.

## Source page 82

Core test cases
ID Area Test Expected result
T01 Email Page with 'info [at] site [dot] com' Extracts info@site.com
T02 Email Image file name 'logo@2x.png' Rejected
T03 Phone '(713) 555-0182' with region US +17135550182 valid
T04 Phone Date '2026-10-19' in text Not treated as phone
T05 Crawler robots.txt disallows /contact/ Path skipped and logged
T06 Crawler Redirect loop Stops after 5 redirects, failure logged
T07 Crawler JS-only contact page Escalates to browser, extracts data
T08 Dedupe 'Apex MEP LLC' vs 'Apex MEP, L.L.C.' Merged into one lead
T09 Dedupe Two branches, same name, different city Kept separate
T10 Verify Domain without MX Invalid
T11 Verify Catch-all domain Risky
T12 Excel Kill a worker mid-run Last uploaded workbook opens; run resumes
T13 Excel Press Download while the file is rebuilding Gets the last complete file, never a partial one
T14 Queue Redeploy workers during a run Run resumes without duplicates
T15 Challenge Captcha page appears Source paused, banner shown, no bypass
attempt
T16 Filters Missing rating with 'Rating > 4' Follows 'unknown' policy chosen by user
T17 Billing Request claims a higher plan than the database Ignored; server uses stored plan
T18 Compliance Email in suppression list Excluded from every export
T19 Geo Same city name in two states State shown, correct cell used
T20 UI 100,000 rows in table Scrolls smoothly, search under 300 ms
T21 Security Import a URL pointing to 127.0.0.1 or Blocked and logged
169.254.169.254
T22 Security User A requests a lead id of user B Not found; no data returned
T23 Billing Plan expiry date passes 7-day grace, then downgrade; data kept
T24 Extension Scan a site that disallows /contact/ in robots.txt Path skipped, reason shown
T25 Extension Scan with the service worker killed mid-scan Resumes from stored state, no duplicates
T26 Extension Sync the same 500 leads twice Server dedupes; quota counted once
T27 Extension Daily cap reached Scan disabled with clear message; local
export still works
T28 Extension Fetch sends no cookies Verified by test server: no cookie header
10.3 Risk register
Risk Likelihood Impact Mitigation
Search or map layouts change High Medium Selectors in config files, nightly self-tests, weekly adapter
packs

## Source page 83

Risk Likelihood Impact Mitigation
IP blocked by sources Medium Medium Slow defaults, per-source cooldown, optional user proxies,
honest user agent
Terms of service complaints Medium High Risk labels, high-risk sources off by default, clear policy, fast
removal on request
Privacy law issues (GDPR, Medium High Generic emails preferred, suppression list, retention limits,
CAN-SPAM, CASL and others) notice templates, user responsibility clause
Low email hit rate Medium Medium Contact-page ranking, structured data, more pages per site,
set expectation (about 60 to 75 percent)
Bounces harm user's mail Medium Medium Verification, risky flag, advice to warm up domains
reputation
Browser memory leaks Medium Medium Context recycling, memory watchdog
Account sharing and quota Medium Medium Server-side limits, session limits per seat, anomaly alerts
abuse
Cloud server IPs get blocked High High Polite pacing, managed proxy pool, per-domain limits, avoid
high-risk sources in the hosted build
Customers misuse the platform Medium High Terms of use, quotas, suppression list, abuse reports, account
(spam, harassment) suspension
Hosting provider complaint or Medium High Honest crawler identity, respond quickly, keep backups and a
suspension second provider ready
Maintenance load too high High Medium Adapter manifests, small files, automated tests, limit adapters
at launch
Support requests overwhelm Medium Medium Good diagnostics export, docs, community forum
Customers expect guaranteed Medium Medium Yield estimator, honest marketing
results
Chrome Web Store rejects or Medium High Minimal permissions, optional host permissions, clear privacy
removes the extension policy, single purpose, no remote code; keep website fully
usable without it
Selector packs break after layout High Medium Packs are JSON data updated within hours; nightly self-test;
changes remote off switch
Service worker sleeps and loses High Low All state in storage; small resumable steps
state
Users blame the extension for Medium Medium Polite delays, daily caps, warnings on high-risk sites,
blocks on other sites assisted-only capture
Data quality complaints Medium Medium Provenance, verification, easy refresh
10.4 Success measures (KPIs)
Measure Target at launch Target after 6 months
Websites with at least one public email 60 percent 70 percent
Phone found per lead 75 percent 85 percent
Email bounce rate after verification Under 10 percent Under 6 percent
Completed runs without crash 95 percent 99 percent
Median time to first Excel Under 5 minutes Under 3 minutes

## Source page 84

Measure Target at launch Target after 6 months
Free to paid conversion 3 percent 5 percent
Monthly churn Under 8 percent Under 5 percent
Extension scans that find at least one email 45 percent 55 percent
Extension users who sync to the website 20 percent 35 percent
10.5 Maintenance routine after launch
1. Daily: adapter self-test report; fix any red adapter within 48 hours.
2. Weekly: publish adapter pack, review new niche requests, update block lists.
3. Monthly: refresh geo database and open data links, review support themes, update documentation.
4. Quarterly: legal and terms review of all sources; remove or relabel sources if rules changed.

