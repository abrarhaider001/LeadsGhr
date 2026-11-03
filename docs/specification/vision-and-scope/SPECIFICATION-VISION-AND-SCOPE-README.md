> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Vision And Scope

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Product goals, intended users, feasibility, public-data definition, source risks, and hosted-product tradeoffs.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 7

PART 1
Vision, Scope and Feasibility
What LeadAtlas is, what it will do, what it will deliberately not do, and which parts of the idea
are easy, hard or not realistic. Read this part first; every later decision depends on it.
1.1 The idea in one paragraph
LeadAtlas is two connected products. The website (web application) is the main scraper: users sign in
from any browser, choose a niche and a place, and your servers do the work. The Chrome extension
(LeadAtlas Lite) is a lighter version with selected features that runs inside the user's own browser: scan the
company website you are looking at, capture company cards from listing pages, keep a local list and
export to Excel or CSV. Both use the same account and the same data.
Together they find businesses, read their public websites and public listings, extract company names,
public email addresses, phone numbers, addresses and social links, clean and verify them, and keep an
Excel file up to date. The first niche pack is built for the estimation industry (construction cost estimating,
quantity takeoff, MEP, roofing, electrical, HVAC and similar services) but the same engine works for any
niche.
Everything is built on your own code with React, Node.js and Supabase: your own crawler, parsers,
queue and plan logic. No paid data APIs and no external tools are used. The only outside needs are
ordinary infrastructure (a server, a domain, an email sender) and the public web pages themselves.
1.2 Goals
- All-rounder: one tool for any niche: choose a niche, choose a place, press Start.
- Two products, one account: the website for big jobs, the Chrome extension for quick work while
browsing.
- One language everywhere: TypeScript in React, Node, workers and the extension, so the extractors
are written once.
- Public data only: the tool reads what any visitor can see without logging in, and never breaks into
private areas.
- Complete contact set: company name, website, emails, phones, address, social links, services, size
hints.
- Live Excel output: leads are saved continuously and the Excel file can be downloaded at any
moment.
- Quality first: dedupe, validate and score so the user gets usable leads, not a raw dump.
- Sell-able SaaS: accounts, plans, quotas and invoices built in, with no external payment tool required.
- Clean minimal design: soft, premium interface using only black, white, grey and blue.
1.3 Non-goals (what the tool will not do)
- Log in to any website on a user's behalf, use fake accounts or collect data that is behind a login.
- Bypass captchas, paywalls, rate limits or explicit blocks.

## Source page 8

- Collect private personal data (home addresses, personal mobile numbers of private individuals, ID
numbers).
- Send outreach emails itself. It exports lists; sending belongs to the user's own mail platform.
- Ship a desktop installer. The products are the website and the Chrome extension.
- Promise 100% coverage. Public data is incomplete by nature.
1.4 Who will use it
User type What they want How they use LeadAtlas
Estimation company Find clients (contractors, builders) who need Niche: general contractors, subcontractors;
owner estimating areas: target states
Freelancer / agency Build lead lists for clients in many niches Many profiles, branded Excel templates, Agency
plan
Sales team Daily fresh prospects with verified emails Schedules, scoring, segments, CRM export
Researcher / analyst Market maps of businesses by region Open data packs, directories, Excel analysis
Resellers Sell leads or the tool White label, multi-seat, profile sharing
1.5 Feasibility: what is possible and what is not
The table below answers your question directly. 'Easy' means reliable with normal engineering. 'Possible,
with care' means it works but needs slow speed, maintenance or has legal limits. 'Not realistic' means do
not promise it to customers.
Capability Verdict Explanation
Crawl company websites for Easy Public pages, stable HTML, the best source of emails and
contact pages phones. Cloud server IPs need polite pacing.
Extract emails (including simple Easy Regex plus deobfuscation rules; 60 to 80 percent of business
obfuscation) sites show a usable email.
Normalise and validate phone Easy Offline numbering-plan library; accuracy high for format, not for
numbers 'line is active'.
Save to formatted Excel while Easy Database journal plus a server-side workbook rebuild; users
running download the latest file any time.
Find companies via search result Possible, with care Works with a real browser and slow pacing; engines restrict
pages automation in their terms and show challenges.
Read public map listings Possible, with care Technically feasible; map providers prohibit automated collection.
High-risk label and slow mode.
Public directories and registries Possible, with care Each directory needs its own adapter and maintenance; check
each site's terms.
Professional network pages Possible, with care Strong anti-automation and terms. Only assisted, human-paced
capture is suggested; contact data is rare there.
Public social page info Possible, with care Login walls and blocks are common; only link-driven, low-volume
reads.
Verify email without sending Possible, with care MX and syntax are reliable; SMTP probing is blocked by many
hosts.
Open map data (offline) Easy Download extracts; no scraping; credit required.

## Source page 9

Capability Verdict Explanation
Get an email for every company Not realistic Many firms only publish a contact form. Expect partial coverage.
Data from behind login or private Not realistic Outside scope and not allowed.
groups
Defeat captchas at scale Not realistic Fragile, costly and against site rules. Product pauses instead.
Always fresh and always correct Not realistic Expect 10 to 30 percent stale or bounced entries; verification
data reduces it.
Important note about terms of service
Many large platforms (search engines, map providers, professional networks and social networks) state in
their terms that automated collection is not allowed, even when pages look public. This is a contract and policy
matter, separate from whether something is technically possible. The design therefore (1) puts website
crawling, open data and user-supplied lists at the centre, (2) labels higher-risk sources clearly, switches them
off by default for new users and lets the owner disable them globally, and (3) never uses logins or evasion
tools. This is general guidance, not legal advice; please check the rules of your target countries.
1.6 Definition of 'public data' used in this document
1. The page is reachable by any visitor without logging in or solving a private challenge.
2. The robots.txt file of the site does not disallow the path.
3. The information is published as business contact information (company phone, generic or role email,
business address).
4. The tool stores where and when it saw each item (source URL and date).
5. Personal data of private individuals is minimised: personal emails are flagged and hidden from exports
by default in regulated regions.
1.7 Source risk map
Source Technically Terms risk Default for new users Role in the product
public?
Company websites Yes Low On Main data source
Open map data files Yes (open licence) Low On (after download) Seed list of businesses
User imported lists n/a None On Enrichment only
Trade associations and Yes Low to medium On High trust seed lists
registries
Public directories Yes Medium Per adapter Gap filling
Search result pages Yes Medium to high On, slow Find company websites
Map listing pages Yes High Off Phone and address boost
Social public pages Partly High Off Fill missing contact
Professional network pages Partly High Off, assisted only Company discovery
1.8 What changes because it is a web application

## Source page 10

A hosted product behaves differently from a desktop program. These points affect cost, risk and design, so
they are decided here, early.
Topic Desktop tool Web application (this plan)
Who runs the scraping User's own computer and IP Your servers and your IP addresses
IP reputation Home IP, low volume Cloud IPs are blocked more easily; needs polite pacing and a
managed proxy pool
Legal and terms Mostly the user You are the operator; high-risk sources should be off or left
exposure out of the hosted build
Cost model One-time or licence Servers, storage, proxies and email cost money every month;
plans must cover them
Updates Installer and update packs Deploy once, every user gets fixes at once
Data location On the user's disk In your database, separated per organisation; you must
secure and back it up
Security Licence cracking Accounts, tenant isolation, abuse prevention, SSRF
protection
Collaboration Hard Built in: teams, roles, shared profiles
Chrome extension - Runs in the user's own browser and IP; lighter and lower risk
for you as operator
Recommendation for the hosted version
Ship website crawling, open data, registries, imports and low-risk directories first. Keep map listings, social
pages and professional network capture off by default, or only available through the user's own browser
extension, because a hosted service that scrapes those sites at scale carries the highest terms-of-service and
blocking risk.

