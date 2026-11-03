> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Architecture

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Web/API/worker/extension architecture, data pipeline, schema and RLS, safe crawler patterns, queues, endpoints, security, deployment, and costs.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 63

PART 6
Architecture and Implementation
Guide (React, Node, Supabase)
How to build both products yourself: the website, the Chrome extension, the Node workers
and the Supabase backend. Includes system layers, folder structure, database, key code,
security, deployment and costs.
6.1 System overview
React web app (Vite, TypeScript, Tailwind) and the Chrome extension (Manifest V3, side panel in
Browser
React)
Edge Caddy or Nginx on your server: HTTPS, static files for the React build, rate limiting
Node.js with Fastify: runs, leads, exports, extension sync, verify endpoint, admin, plan and
Node API
quota checks
Supabase Postgres (data, Row Level Security), Auth (login), Storage (Excel files), Realtime (live progress)
Queue pg-boss: job queue stored inside the same Postgres, so no Redis and no extra service
Node processes: crawler workers (undici and cheerio), browser workers (Playwright), quality
Workers
workers, export workers
pino logs, a health page in the admin panel, PM2 process manager, nightly database backups to
Operations
your own storage
Request flow: a full run on the website
1. The user presses Start in the React app; the app calls POST /runs on the Node API with the
Supabase login token.
2. The API checks plan and quota, writes the run to Postgres and enqueues jobs in pg-boss.
3. Workers pick jobs, discover companies, crawl websites, extract and verify data and write leads to
Postgres using the service key.
4. Workers update the run row; Supabase Realtime pushes the changes to the open run page.
5. An export worker rebuilds the Excel file in Supabase Storage every 25 leads; the browser downloads
it through a short-lived signed link.
Request flow: a scan in the Chrome extension
1. The user presses 'Scan this site' in the side panel; the extension asks permission for that one website.
2. The extension fetches the contact-type pages itself (no cookies) and parses them in an offscreen
document.
3. Results are stored locally in IndexedDB; the user can export immediately.
4. If the user presses Sync, the extension sends the leads to the Node API, which dedupes and saves
them to the same leads table as the website.

## Source page 64

6.2 Data pipeline
Step Component Input Output
1 Profile compiler Niche, geo, filters, sources List of jobs (cell x source)
2 Discovery adapters Job Raw leads (name, domain, listing fields)
3 Domain normaliser Raw lead Registrable domain, skip list check
4 Website crawler Domain HTML pages (cached)
5 Extractors HTML Emails, phones, addresses, socials,
services
6 Merger and dedupe Fragments One Lead with provenance
7 Quality stage Lead Verification statuses and score
8 Post filters Lead Keep or filtered-out bin
9 Journal and Excel writer Lead DB row and workbook rebuild
10 UI events Lead Counters and stream update
6.3 Technology choices
Need Choice Why
Website front end React 18, Vite, TypeScript, Tailwind CSS, React Fast builds, simple hosting as static files
Router
Tables and charts TanStack Table (virtual scrolling), Recharts Smooth with 100k+ rows
Server state TanStack Query, Supabase JS client Caching and realtime in few lines
Back end Node.js 20+, TypeScript, Fastify, Zod validation One language across web, API, workers
and extension
Database, login, files, Supabase (Postgres, Auth, Storage, Realtime) Everything in one backend; Row Level
realtime Security for tenants
Job queue and schedules pg-boss Queue lives in Postgres; retries, delays and
cron schedules built in
Crawler undici (HTTP), cheerio (HTML), robots-parser Fast, small, no browser needed for most
sites
JavaScript pages Playwright (Chromium) Only when a page needs rendering
Extractors libphonenumber-js, validator, tldts, All run offline
fastest-levenshtein, natural
DNS and MX node:dns/promises Built into Node, no library needed
Excel and CSV exceljs, papaparse Styled workbooks on server and in the
extension
Extension Manifest V3, React side panel, idb (IndexedDB), Lite scraper in the browser
chrome.* APIs
Process manager and PM2, Caddy (or Nginx) Simple, reliable, free
proxy
Tests Vitest, Playwright Test Unit tests on fixture pages and end-to-end
tests

## Source page 65

Need Choice Why
Hosting One VPS for API and workers; Supabase cloud See costs in section 6.14
or self-hosted Supabase
About 'no external tools'
The scraping and data logic is entirely yours and written in your own code. Supabase is your backend (you
can also self-host it so it runs on your own server). You still need a computer to run the workers (a VPS or
your own PC), a domain name, and an email sender for sign-up verification; these are infrastructure, not data
services. No data API, no verification service and no payment processor is used.
6.4 Project folder structure (monorepo)
leadatlas/
apps/
web/ # React + Vite website
src/pages/ # Landing, Login, Dashboard, NewSearch, Run, Leads, Exports,
# Profiles, Outreach, Compliance, Settings, Billing, Extension, Admin
src/components/ src/styles/tokens.css # colour, radius and font tokens (light and dark)
api/ # Node + Fastify
src/routes/ # auth runs leads exports imports verify extension billing admin
src/services/ src/plugins/ src/schemas/ (Zod)
worker/ # pg-boss consumers
src/jobs/ # discover.ts crawl.ts verify.ts export.ts schedule.ts
extension/ # Chrome extension (Manifest V3)
manifest.json src/sidepanel/ src/background/ src/offscreen/
src/scan/ src/capture/ src/queue/ src/store/ src/sync/ src/guard/ src/export/
packages/
core/ # niche, geo, filters, scoring, dedupe (pure TypeScript)
extract/ # emails, phones, address, social, structured, profile
crawler/ # siteCrawler, pageRanker, safeHttp
sources/ # adapter interface, searchPages, osmImport, importList, directories/, registries/
quality/ # emailVerify, phoneValidate, provenance
export/ # excelBuilder, formats
ui-tokens/ # shared design tokens for web and extension
supabase/
migrations/ # SQL files (schema, RLS policies, functions)
seed.sql
infra/ # Caddyfile, pm2.config.js, backup.sh
tests/ # fixtures (saved HTML pages) and test suites
The packages extract, core and quality are shared: the same TypeScript code runs in the Node workers
and inside the extension's offscreen document. This is the main advantage of using one language
everywhere.
6.5 Supabase database schema and Row Level Security
Every business table carries an org_id. Row Level Security lets the browser and the extension talk to
Postgres directly with the user's login while the database itself refuses other organisations' rows. Workers
use the service key, which bypasses RLS, so worker code must always set org_id explicitly.
create table org (
id uuid primary key default gen_random_uuid(), name text not null,
plan text not null default 'explorer', seats int default 1,
leads_quota int default 100, leads_used int default 0,
ext_scans_per_day int default 20, period_start date default current_date,
plan_expires_at timestamptz, created_at timestamptz default now());
create table member (
org_id uuid references org(id) on delete cascade,
user_id uuid references auth.users(id) on delete cascade,
role text default 'member', primary key (org_id, user_id));
create function is_member(o uuid) returns boolean language sql security definer stable as $$
select exists (select 1 from member where org_id = o and user_id = auth.uid()) $$;

## Source page 66

create table profile (id uuid primary key default gen_random_uuid(), org_id uuid not null references org(id),
name text, config jsonb, schedule text, version int default 1);
create table run (id uuid primary key default gen_random_uuid(), org_id uuid not null references org(id),
profile_id uuid, status text, settings jsonb, started_at timestamptz, finished_at timestamptz,
leads_found int default 0, export_path text);
create table lead (
id bigint generated always as identity primary key, org_id uuid not null references org(id),
run_id uuid, origin text default 'web', -- 'web' or 'extension'
name text, domain text, website text, niche text, country text, state text, city text, address text,
location geography(point, 4326), score int, summary text, filtered_out boolean default false,
tags text[], notes text, created_at timestamptz default now(), updated_at timestamptz default now(),
unique (org_id, domain));
create table email (id bigint generated always as identity primary key, org_id uuid not null,
lead_id bigint references lead(id) on delete cascade, address citext, kind text, status text,
source_url text, seen_at timestamptz, unique (lead_id, address));
create table phone (id bigint generated always as identity primary key, org_id uuid not null,
lead_id bigint references lead(id) on delete cascade, e164 text, national text, line_type text,
valid boolean, source_url text, seen_at timestamptz, unique (lead_id, e164));
create table source_record (id bigint generated always as identity primary key, org_id uuid not null,
lead_id bigint, source text, url text, raw jsonb, seen_at timestamptz, confidence real);
create table suppression (id bigint generated always as identity primary key, org_id uuid,
kind text, value text, unique (org_id, kind, value));
create table invoice (id uuid primary key default gen_random_uuid(), org_id uuid not null,
plan text, amount numeric, currency text, method text, reference text,
status text default 'pending', period_end date, created_at timestamptz default now());
create table usage_event (id bigint generated always as identity primary key, org_id uuid not null,
user_id uuid, kind text, qty int default 1, day date default current_date);
create table domain_gate (domain text primary key, next_allowed_at timestamptz not null default now());
create index lead_name_trgm on lead using gin (name gin_trgm_ops);
alter table lead enable row level security;
create policy lead_rw on lead for all using (is_member(org_id)) with check (is_member(org_id));
-- repeat "enable row level security" and an is_member policy for email, phone, run, profile,
-- source_record, suppression, invoice (read only) and usage_event (read only)
6.6 Source adapter interface (TypeScript)
Every discovery source implements one small interface. A new directory is one new file.
export interface RawLead {
name: string; domain?: string; phone?: string; address?: string;
category?: string; sourceUrl: string; extra?: Record<string, unknown>;
}
export interface SourceAdapter {
id: string; // "directory_x"
risk: 'low' | 'medium' | 'high';
countries: string[];
search(keywords: string[], cell: GeoCell): AsyncIterable<RawLead>;
healthCheck(): Promise<boolean>; // used by the nightly self-test
}
6.7 Polite and safe website crawler (core pattern)
A server that fetches addresses found on the web must never be tricked into calling internal services
(SSRF). The code resolves every host, refuses private addresses and re-checks each redirect. In
production also pin the resolved IP for the actual connection, and use the domain_gate table so all workers
together respect one request at a time per domain.
import { request } from 'undici';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import dns from 'node:dns/promises';
import net from 'node:net';
const UA = 'LeadAtlasBot/1.0 (+https://yourdomain.example/bot)';
const KEYS = ['contact', 'about', 'team', 'reach', 'location', 'impressum', 'kontakt', 'contacto'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const score = (l: string) => KEYS.filter(k => l.toLowerCase().includes(k)).length;
const blocked = new net.BlockList();
for (const [a, p] of [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['127.0.0.0', 8],

## Source page 67

['169.254.0.0', 16], ['0.0.0.0', 8]] as const) blocked.addSubnet(a, p, 'ipv4');
blocked.addAddress('::1', 'ipv6'); blocked.addSubnet('fc00::', 7, 'ipv6'); blocked.addSubnet('fe80::', 10, 'ipv6');
async function assertPublicHost(host: string) {
for (const a of await dns.lookup(host, { all: true }))
if (blocked.check(a.address, a.family === 6 ? 'ipv6' : 'ipv4')) throw new Error(`blocked address for ${host}`);
}
async function fetchText(url: string, maxRedirects = 5): Promise<{ status: number; text: string } | null> {
for (let i = 0; i <= maxRedirects; i++) {
await assertPublicHost(new URL(url).hostname);
const res = await request(url, { method: 'GET', headers: { 'user-agent': UA },
headersTimeout: 15000, bodyTimeout: 15000 }); // no auto redirects
const loc = res.headers.location;
if ([301, 302, 303, 307, 308].includes(res.statusCode) && loc) {
url = new URL(String(loc), url).toString(); await res.body.dump(); continue;
}
const ok = String(res.headers['content-type'] ?? '').includes('text/html') || url.endsWith('robots.txt');
const len = Number(res.headers['content-length'] ?? 0);
if (!ok || len > 2_000_000) { await res.body.dump(); return { status: res.statusCode, text: '' }; }
return { status: res.statusCode, text: await res.body.text() };
}
return null;
}
export async function crawlDomain(domain: string, maxPages = 6, delay: [number, number] = [2000, 4000]) {
const base = `https://${domain}`;
const rob = await fetchText(`${base}/robots.txt`);
const robots = robotsParser(`${base}/robots.txt`, rob?.status === 200 ? rob.text : '');
const pages = new Map<string, string>(); const seen = new Set<string>(); const queue = [`${base}/`];
while (queue.length && pages.size < maxPages) {
const url = queue.shift()!;
if (seen.has(url) || robots.isAllowed(url, UA) === false) continue;
seen.add(url);
const r = await fetchText(url);
await sleep(delay[0] + Math.random() * (delay[1] - delay[0]));
if (!r || r.status !== 200 || !r.text) continue;
pages.set(url, r.text);
if (url === `${base}/`) {
const $ = cheerio.load(r.text);
const links = $('a[href]').map((_, a) => new URL($(a).attr('href')!, url).toString()).get()
.filter(l => new URL(l).hostname.endsWith(domain))
.sort((x, y) => score(y) - score(x));
queue.push(...links.slice(0, maxPages));
}
}
return pages;
}
6.8 Email extraction with simple deobfuscation (shared code)
import * as cheerio from 'cheerio';
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const OBF = new RegExp(['([A-Za-z0-9._%+-]+)', '\\s*[\\[({]\\s*at\\s*[\\])}]\\s*', '([A-Za-z0-9.-]+)',
'\\s*[\\[({]\\s*dot\\s*[\\])}]\\s*', '([A-Za-z]{2,})'].join(''), 'gi');
const BAD = /\.(png|jpe?g|gif|svg|webp)$/i;
const GENERIC = new Set(['info', 'sales', 'contact', 'hello', 'office', 'admin', 'support', 'bids', 'estimating']);
export function extractEmails(html: string) {
const $ = cheerio.load(html); // decodes HTML entities in text for us
const fromLinks = $('a[href^="mailto:"]').map((_, a) =>
decodeURIComponent($(a).attr('href')!.slice(7).split('?')[0])).get();
const text = $.root().text().replace(/\u200b/g, '');
const found = new Set<string>([...fromLinks, ...(text.match(EMAIL) ?? [])].map(e => e.trim().toLowerCase()));
for (const m of text.matchAll(OBF)) found.add(`${m[1]}@${m[2]}.${m[3]}`.toLowerCase());
return [...found].filter(e => !BAD.test(e) && !e.includes('example'))
.map(e => ({ email: e, kind: GENERIC.has(e.split('@')[0]) ? 'generic' : 'named' }));
}
6.9 Excel build and publish to Supabase Storage
import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';
type Col = { key: string; title: string; width?: number };

## Source page 68

export async function publishWorkbook(sb: SupabaseClient, orgId: string, runId: string,
rows: Record<string, unknown>[], columns: Col[]) {
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Leads');
ws.columns = columns.map(c => ({ header: c.title, key: c.key, width: c.width ?? 22 }));
const head = ws.getRow(1);
head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AFF' } };
rows.forEach(r => ws.addRow(r));
ws.views = [{ state: 'frozen', ySplit: 1 }];
ws.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
const buffer = await wb.xlsx.writeBuffer();
const path = `${orgId}/${runId}/leads.xlsx`;
await sb.storage.from('exports').upload(path, buffer as ArrayBuffer, { upsert: true,
contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const { data } = await sb.storage.from('exports').createSignedUrl(path, 900); // 15 minute link
return data?.signedUrl;
}
// An upload replaces the old file in one step, so users never download a half written file.
// Call every 25 new leads (or 30 s) from the export worker, reading rows from Postgres.
6.10 Queue and workers with pg-boss
import PgBoss from 'pg-boss';
const boss = new PgBoss(process.env.DATABASE_URL!); // uses its own schema inside your Postgres
await boss.start();
// API side: start a run
await boss.send('crawl-domain', { orgId, runId, domain: 'apexmep.com' },
{ retryLimit: 3, retryBackoff: true, expireInMinutes: 10 });
// Worker side (check the pg-boss docs for the exact option names of your version)
await boss.work('crawl-domain', { teamSize: 5, teamConcurrency: 1 }, async (job) => {
const { orgId, runId, domain } = job.data;
await waitForDomainGate(domain); // one request at a time per domain, all tenants
const pages = await crawlDomain(domain);
const lead = mergeExtraction(pages); // emails, phones, address, socials
await saveLead(orgId, runId, domain, lead); // inserts with org_id, bumps counters
});
await boss.schedule('weekly-refresh', '0 3 * * 1', { profile: 'xyz' }); // cron style schedule
- Fair use of workers: a per-organisation cap on parallel runs, and job priority so small runs are not
starved by big ones.
- One request at a time per domain across all customers: a small domain_gate table (domain,
next_allowed_at) is updated atomically before each fetch.
- Browser jobs (Playwright) run in a separate small worker with 2 contexts that are recycled every N
pages.
- Workers are separate Node processes started with PM2; they restart automatically after a crash or
deploy and unfinished jobs return to the queue.
- Speed profiles: Gentle, Balanced and Fast map to concurrency, delay and retry settings; the plan
decides which are allowed.
6.11 Node API outline
Method and path Purpose Notes
POST /runs/estimate Dry run and yield estimate Small sample, counts toward
fair use
POST /runs, POST Start and control a run Checks plan, quota and
/runs/:id/pause|resume|stop source switches

## Source page 69

Method and path Purpose Notes
GET /runs/:id Run state and counters Reload after refresh; Realtime
does the live part
POST /imports Upload CSV or Excel of domains Size and type limits, streamed
POST /exports Create files and signed download links Respects suppression list
POST /verify MX, disposable and domain check for a batch Used by the website and the
(max 50) extension
POST /extension/sync Receive leads from the extension in batches Dedupe by org and domain;
of 100 counts quota
GET /extension/config Selector packs, block list, suppression list, Cached by the extension
daily caps
POST /invoices, POST Request upgrade and approve payment Admin role only, audit logged
/admin/invoices/:id/paid
GET /me, GET /usage Plan, quota and usage meters Used by the plan badge
/admin/* Users, plans, data packs, proxies, adapter Admin role only
health, source switches
Reading and editing leads normally goes straight from the browser to Supabase with the user's login
(protected by Row Level Security). The Node API is used for anything that needs secrets, heavy work,
plan checks or other servers.
6.12 Chrome extension architecture
Parts of the extension
Part Role Notes
Side panel (React) Main interface: Home, Leads, Queue, Export, Opens from the toolbar icon; stays
Settings open while browsing
Service worker (background) Alarms, queue, sync, messages, permission Sleeps when idle; keep all state in
requests storage
Offscreen document Parses HTML with DOMParser and runs the Service workers have no DOM
shared extractors
Content scripts (on demand) Read visible cards for Capture Injected only when the user presses
Capture
IndexedDB (idb) Local lead list and queue Survives browser restarts
chrome.storage Session, settings, selector packs, caps local area for large, sync area not
used
manifest.json (core settings)
{
"manifest_version": 3,
"name": "LeadAtlas Lite",
"version": "1.0.0",
"description": "Scan public company websites for contact data.",
"action": { "default_title": "LeadAtlas Lite" },
"side_panel": { "default_path": "sidepanel.html" },
"background": { "service_worker": "background.js", "type": "module" },
"permissions": ["activeTab", "scripting", "sidePanel", "storage", "offscreen", "alarms", "downloads"],
"host_permissions": ["https://api.yourdomain.example/*", "https://YOUR-PROJECT.supabase.co/*"],
"optional_host_permissions": ["https://*/*", "http://*/*"]

## Source page 70

}
Why optional host permissions: the extension asks for access to a company website only when the user
presses Scan on it. That keeps the install warning small and makes store review easier.
Site scan flow (simplified)
// 1. The user presses "Scan this site" in the side panel
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const origin = new URL(tab.url!).origin;
const granted = await chrome.permissions.request({ origins: [`${origin}/*`] }); // asked once per site
if (!granted || !(await guard.allowed(origin))) return; // robots, caps, block list
// 2. Fetch the home page and the best contact-type pages, never with cookies
const home = await (await fetch(origin + '/', { credentials: 'omit' })).text();
const urls = await offscreen.rankContactLinks(origin, home).then(l => l.slice(0, 5));
const pages = [home];
for (const u of urls) {
pages.push(await (await fetch(u, { credentials: 'omit' })).text());
await sleep(1500 + Math.random() * 1500); // polite delay
}
// 3. Parse in the offscreen document with the shared extractors, then store locally
const result = await offscreen.extractAll(pages); // emails, phones, address, socials
await store.saveLead({ domain: new URL(origin).hostname, ...result, origin: 'extension' });
What runs where
Task Chrome extension (lite) Website and workers (full)
Scan one site Yes, up to 6 pages, no JavaScript Yes, with browser fallback for JavaScript
rendering pages
Large niche and city runs No Yes, with queue, geo cells and schedules
Directory and registry discovery Only by capturing pages the user opened Automatic adapters
Email verification Syntax locally, MX through your API Full checks on workers
Lead scoring Quick score Full score with editable weights
Proxies and speed profiles No (user's own IP and polite delays) Yes
Teams, billing, templates No (uses the website account) Yes
Export CSV and Excel in the browser Excel with templates, CSV, JSON, VCF
6.13 Security and abuse prevention
Threat Control
SSRF through URLs Resolve and block private and internal addresses on every hop (see 6.7); run workers
without access to your private network
Cross-tenant data leaks org_id on every row plus Row Level Security; automated tests that try cross-tenant
access; service key only on the server
Service key leaks Keep it in server environment files only, never in the React app or the extension; rotate
if exposed
Account takeover Supabase Auth with email verification, rate limits, optional two-factor authentication
Spam use of the platform Terms of use, plan quotas, suppression list, abuse reports, ability to suspend an
account
Malicious scraped content (XSS) Escape everything on output; never render scraped HTML; strict Content Security
Policy in the web app and the extension

## Source page 71

Threat Control
Malicious extension requests Token authentication, per-user rate limits and daily caps on /extension and /verify
Malicious uploads Size and type limits, parse CSV and Excel in a worker, no macros
Data loss Nightly backups with pg_dump to storage you control, monthly restore test
Privacy requests Per-user data export and delete, retention jobs, audit log of admin actions
Vulnerable dependencies npm audit and lockfiles, update monthly
6.14 Deployment, scaling and monthly cost
Stages
Stage Setup When
0 Testing Everything on your own PC: Supabase free project (or local Supabase), Building and early tests
Node API and worker, React dev server
1 Launch One VPS (4 to 8 GB RAM) with Caddy, API, workers (PM2) and the React Up to about 50 customers
build; Supabase Pro project
2 Growth Second VPS for browser workers, separate backups, bigger Supabase 50 to 300 customers
compute if needed
3 Scale Several worker servers, dedicated IPs and a proxy pool, staging environment Over 300 customers
Supabase plans (checked against public pricing pages, mid 2026)
Plan Price Main limits Use for
Free $0 500 MB database, 50,000 monthly active users, 5 GB Development and
egress, small file storage; project pauses after one week early testing only
of inactivity
Pro $25 per month plus 8 GB database, 100,000 monthly active users, no First live version
usage pausing, daily backups kept 7 days; extra database size
about $0.125 per GB
Self-hosted Free software You run Postgres, Auth, Storage and Realtime yourself Maximum
on your server independence, more
work for you
Cost item Testing Launch (approx. per month) Growth (approx. per
month)
Supabase $0 $25 to $50 $50 to $150
VPS for API and workers $0 (own PC) $10 to $30 $40 to $120
Domain name - About $1 (yearly $10 to $15) Same
Email sending for sign-up Supabase built-in Own SMTP mailbox, about $0 to $10 to $30
verification (strict limits) $10
Proxies (optional) $0 $0 to $50 $100 to $500
Extension store registration - One-time Chrome Web Store -
developer fee (about $5)
Payment processing - None (manual approval) Add a gateway later if
needed

## Source page 72

Cost item Testing Launch (approx. per month) Growth (approx. per
month)
Estimated total $0 About $35 to $90 About $200 to $800
All figures are rough planning estimates, not quotes. Supabase prices were taken from published pricing pages; VPS, proxy and
email costs vary by provider, so confirm current prices before deciding.

