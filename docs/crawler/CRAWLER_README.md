# Crawler backend and user flow

This guide describes the **current desktop implementation**. The Crawler tab is an unsaved test of a URL supplied by the user. A Pipeline starts from public business listings, queues each business website, crawls its pages, and stores its results locally. Both use the same guarded HTTP adapter and HTML extraction functions, but their queues, extraction modes, and persistence differ.

## Crawler test versus Pipeline

| Behavior | Crawler tab | Pipeline website stage |
| --- | --- | --- |
| Starting point | URL entered in Crawler | Website URL from a saved business listing |
| Queue | React memory; discarded when the page or app closes | Local SQLite `pipeline_pages`; resumable |
| Fetch method | Direct HTTP or browser rendering preference | The fetch method saved with the run |
| Email source | LeadsGhr extraction or Email Hunter-style matching | LeadsGhr extraction; the Email Hunter-style preference is **not applied** here yet |
| Contact-only option | Homepage plus first contact-like homepage link; otherwise unique same-site links found on crawled pages, up to 1,000 pages | Homepage plus contact links; when off, links found on crawled pages may also enter the queue |
| Concurrent pages | 1–8 temporary workers after homepage discovery | 1–8 workers claiming saved queued pages |
| Results | Per-page email counts and details | Per-page statuses and emails merged into the saved business row, then filtered |
| Storage and export | No SQLite, Supabase, or CSV write | Local SQLite run data and CSV export |

Business-listing search is a separate stage. Google Maps is currently the available automated Pipeline provider. The Crawler tab does not search Google Maps.

## Preferences

Open **Settings > Preferences > Crawler**. Preferences are validated with Zod, saved to the desktop user-data `preferences.json`, and defaulted when older files lack a newly added field. A Pipeline saves a copy of the preferences when created; later changes do not rewrite that run.

| Setting | Default | Effect |
| --- | --- | --- |
| Page fetch method: Browser rendering | On | Fetch HTML, then load the approved URL in an isolated Electron page and inspect scroll snapshots. Slower, but can see JavaScript-added content. |
| Page fetch method: Direct HTTP | Off | Inspect only the server's HTML response. No browser page is opened for website extraction. |
| Crawler email source: Our behavior | On | Read page text and `mailto:` addresses, plus separately inspect public form-recipient clues. |
| Crawler email source: Email Hunter-style | Off | Scan the complete HTML string, including scripts and attributes, for email-shaped text. Applies to the **Crawler tab only**. |
| Show webpage in Crawler | On | Show the test's webview in browser mode. Turning it off hides the view but leaves it mounted for extraction. Has no effect in Direct HTTP mode. |
| Crawl homepage and contact page only | On | Limit the test to those two pages when a contact page exists. In Pipeline, turning it off permits same-site discovery from each crawled page. |
| Concurrent pages | 2 | Maximum number of queued pages inspected at once in Crawler and Pipeline. Same-origin requests reserve at least 2 seconds between starts, or the longer robots crawl delay. |

“Email Hunter-style” is a local matcher. It does not invoke the installed Chrome extension, read its storage, query search engines, or verify deliverability. Both fetch methods can use it in the Crawler tab: browser mode scans fetched HTML and rendered snapshots; Direct HTTP scans fetched HTML only.

## Shared HTTP request path

The Electron main process owns network access. React calls a narrow preload IPC bridge. The HTTP implementation is [`apps/desktop/src/adapters.ts`](../../apps/desktop/src/adapters.ts).

1. Parse the URL and accept only `http:` or `https:` without embedded credentials.
2. Resolve the hostname. Reject private, loopback, link-local, and other blocked address ranges; pin the connection to the resolved public address. Repeat this check after redirects, allowing at most five redirects.
3. Send the request with Electron's desktop browser User-Agent. Some sites return different public HTML to crawler-specific User-Agents. Robots checks and challenge handling still apply.
4. Stream the body with a byte limit and timeout. Decode gzip, deflate, or Brotli when used, with a limit on decompressed output too. Crawler and Pipeline HTML pages allow **24,000,000 bytes**; `robots.txt` allows **250,000 bytes**. The adapter's default for other callers remains **2,000,000 bytes**.
5. Return the final URL, HTTP status, content type, and decoded UTF-8 body. Non-HTML pages are not processed as website pages.

The limits prevent unexpectedly large responses from exhausting memory. Raising a limit does not add content absent from the server response.

## Crawler tab: backend flow

The test orchestration is in [`packages/app/src/crawler-page.tsx`](../../packages/app/src/crawler-page.tsx); guarded IPC is in [`apps/desktop/src/crawler-test.ts`](../../apps/desktop/src/crawler-test.ts).

```text
User URL → validate IPC input → check robots.txt → fetch and decode HTML
         → reject non-HTML/challenge → extract emails and links
         → contact page first → other homepage links if enabled → finish
```

1. Starting a test clears its previous in-memory queue, results, links, and email sets. The URL passes the shared schema. The IPC handler accepts calls only from the app window.
2. The handler fetches `/robots.txt` for the target origin. HTTP 200 is parsed; 404 is treated as an empty policy. Other statuses pause the test. A rule disallowing the page for `LeadsGhr/0.1 (public-data crawler)` stops the fetch. A cross-origin final URL receives its own robots check.
3. The page must return HTTP 200 and `text/html`. A challenge phrase near the start of the response stops the test. The handler returns the approved final URL and decoded HTML.
4. **Direct HTTP:** inspect that HTML immediately. **Browser rendering:** also open the approved URL in a sandboxed Electron webview, scroll in eight steps, and inspect DOM HTML after each step. A challenge in rendered content stops the test.
5. `discoverPage` finds same-origin `<a href>` links, strips fragments, and excludes common asset file types. A path resembling contact, contact-us, get-in-touch, reach-us, enquiry, or inquiry is prioritized as the contact page. After homepage discovery, the contact page enters the queue first. If contact-only is off, other homepage links enter in discovery order, and links found on crawled pages can enter later. Canonical URL keys prevent duplicate queue entries, with a 1,000-page test limit.
6. Up to the configured number of asynchronous workers claim distinct queued URLs. Each worker fetches and inspects one page, then claims the next. Idle workers wait while another active worker may discover more URLs. Browser mode uses a separate isolated hidden page per worker; the visible preview remains the homepage. The main process checks robots and reserves at least 2 seconds between starts for the same origin, including the second request made for browser rendering.
7. Sets deduplicate addresses per page and across the test. The URL table shows page URL, type, status, email-count chip, and details action. The detail panel lists addresses found on that page. A contact-page address already found on the homepage gets an “Also found on homepage” chip. The current activity sits at the left above the table; a smaller, regular-weight summary at the far right shows page count, unique emails, Processing time, Results found, Processed, and In queue, separated by dots. Processing time starts when Crawl is clicked and uses hours:minutes:seconds (`h:mm:ss`). The table fills the available height, and results disappear when renderer state is discarded.

The browser preview is restricted to the approved URL. It has Node integration off, context isolation and sandbox on, new windows and unrelated navigation blocked, permissions denied, private network requests blocked, and Cookie/Authorization headers removed. Direct HTTP does not create a webview.

**Current test limits:** The Crawler test caps discovery at 1,000 distinct URLs. During a crawl, its table is a rolling window of the first 20 unfinished URLs: when a page is Crawled or Skipped, it leaves the table and the next queued URL enters. When the crawl completes, the table keeps the last 20 discovered page rows visible, including their statuses and email detail actions. Display limits do not stop workers from processing the rest of the queue. A challenge or unavailable robots policy pauses the test; other later page errors are marked Skipped. There is no persisted checkpoint or export. “Concurrent pages” means concurrent asynchronous page jobs, not CPU `worker_threads`.

## HTML extraction

Shared HTML-string functions are in [`packages/extract/src/index.ts`](../../packages/extract/src/index.ts). They use Cheerio and require no Node-only filesystem or network modules.

| Function | Behavior |
| --- | --- |
| `extractContacts(html)` | Removes script, style, and noscript elements; scans remaining text and `mailto:` links; normalizes case and deduplicates. It also parses `tel:` links into valid phone numbers and collects some social URLs, although the Crawler table uses its emails. |
| `extractRenderedHtmlEmails(html)` | Matches email-shaped text across the **whole supplied HTML**, including scripts and attributes. It lowercases, deduplicates, and excludes a few asset-like endings and system sender patterns. The name does not require browser rendering: Direct HTTP supplies raw response HTML. |
| `discoverPage(html, url)` | Finds same-origin links and public form-recipient clues: `mailto:` form actions, selected `data-*` attributes, recipient-like input names, and recipient-like assignments in inline scripts when a form exists. |

A public form address is a clue, not proof of the server's final recipient. Forms are never submitted, and a private server-side destination cannot be recovered from public HTML. Email-shaped matches are **unverified** and may include examples, stale data, or addresses unrelated to the company.

### Adams Homes HTTP example

The Adams Homes homepage returns gzip-compressed HTML. An integration check ran the real Electron HTTP adapter and `extractRenderedHtmlEmails` together against `https://www.adamshomes.com/`: HTTP 200, roughly **16.6 MB** decoded HTML, and **214 unique email-shaped matches**, including `sales@adamshomes.com`, at that time. The extension shown by the user reported 212. Filtering and site changes can alter the count; an exact future count is not guaranteed.

## Pipeline: persistent website crawl

The Pipeline overview shows five ordered cards: Find businesses, Build the URL queue, Crawl public pages, Filter emails, and Export results. The filtering card reflects the automatic cleanup between crawling and CSV creation.

Pipeline discovery first saves public business rows. When a row has a website URL, [`packages/app/src/search-results-page.tsx`](../../packages/app/src/search-results-page.tsx) asks the main process to queue its homepage. Website crawling is in [`apps/desktop/src/pipeline-pages.ts`](../../apps/desktop/src/pipeline-pages.ts); runs and exports are in [`apps/desktop/src/crawl-runs.ts`](../../apps/desktop/src/crawl-runs.ts).

The Pipeline's Website URL queue table paginates its saved rows at 25, 50, or 100 per page (50 by default). Its total and crawled counts still cover the entire queue; changing pages only changes the rows displayed, not processing, storage, or export.

1. SQLite `pipeline_pages` stores run ID, business row key, URL, page type, status, emails JSON, error, and timestamps. `(run_id, row_key, url)` prevents exact duplicates. URLs lose fragments and a trailing slash. A run allows up to **1,000 pages per business** and **5,000 pages total**.
2. The queue chooses Contact page before Homepage before other Page, then creation order. States are `queued`, `fetching`, `ready`, `crawling`, `crawled`, and `skipped`. UI events include the updated list and status text.
3. Before a page fetch, the main process loads or reuses its origin's robots policy, checks permission for that URL, and reserves at least **2 seconds** between requests to that origin, or the robots crawl delay if longer. Cross-site redirects pause the crawl. A redirected origin is checked separately. HTTP 401, 403, 429, 503 and challenge text pause; non-HTML or other non-200 responses are skipped.
4. Up to the run's saved worker count claim distinct queued pages. A worker fetches and inspects its page, then claims another; idle workers wait while active ones may discover more URLs. Browser mode loads a separate hidden, sandboxed Electron window per active worker and collects eight scroll snapshots; if rendering fails without a challenge, it uses the fetched HTML. Direct HTTP uses only fetched HTML.
5. Each snapshot goes through `discoverPage` and `extractContacts`. Found emails merge with the business row's existing emails, are deduplicated, and are capped at **1,000 per business row**; per-page emails are stored in `pipeline_pages`. Contact-like links from the homepage are queued. With contact-only off, same-origin links found on crawled pages can enter the queue.
6. On startup, pages left in `fetching`, `ready`, or `crawling` return to `queued` for resume. Pausing aborts the active process and requeues unfinished pages. Only one Pipeline website crawl runs at a time. Saved search position, business rows, page queue, and export history remain local; extracted data is not sent to Supabase.
7. After the website crawl finishes, or when a run stops with partial results, the main process filters every saved Pipeline business row's emails before exporting. The UI refreshes from the filtered saved rows. CSV files therefore contain kept addresses only. Saved business rows are exported under the user's `Documents/LeadsGhr/exports` folder. Export records include file name, path, size, entry count, time, and a CSV snapshot for re-export.

### Automatic email filtering before export

The Pipeline uses the same local rules as the Email Filtering page, now shared through [`packages/quality/src/email-filter.ts`](../../packages/quality/src/email-filter.ts). For **each business row**, it normalizes case and surrounding punctuation, rejects malformed or overlong addresses, placeholders, a small known disposable-domain list, no-reply mailboxes, and unrecognized domain endings, then removes duplicates and Gmail aliases. Filtering per business preserves an address that legitimately appears on more than one business's site. This is a syntax and heuristic cleanup, **not** DNS, MX, SMTP, or mailbox verification.

The filtering step runs after page extraction and before every automatic Pipeline CSV export, including partial exports after stop or a crawl error. Pausing and then resuming without stopping does not export in between. A local `pipeline_email_filters` SQLite table keeps each row's original email inputs and rejected values with reasons. On resume, the next filter pass combines those original inputs with any newly crawled addresses, so earlier rejected inputs are not silently lost. The audit remains on this computer; only kept addresses appear in saved business rows and CSV. Deleting a Pipeline also deletes its filter audit.

**Current Pipeline limits:** `crawlerEmailSource` is not read by Pipeline website crawling; it always uses `extractContacts` plus public form-recipient clues. Filtering does not recover emails omitted by extraction, validate that a mailbox exists, or guarantee deliverability. The UI does not yet expose the saved rejected-address audit.

## Source map

- [`apps/desktop/src/adapters.ts`](../../apps/desktop/src/adapters.ts): public HTTP requests, IP checks, redirects, decompression, limits, and User-Agent.
- [`apps/desktop/src/crawler-test.ts`](../../apps/desktop/src/crawler-test.ts): test IPC, robots check, page approval, and webview restrictions.
- [`packages/app/src/crawler-page.tsx`](../../packages/app/src/crawler-page.tsx): temporary queue, rendering flow, discovery, per-page results, and status UI.
- [`packages/extract/src/index.ts`](../../packages/extract/src/index.ts): email, phone, link, and form-clue parsing.
- [`apps/desktop/src/pipeline-pages.ts`](../../apps/desktop/src/pipeline-pages.ts): persistent queue, robots-aware pacing, fetch/crawl overlap, and resume behavior.
- [`apps/desktop/src/crawl-runs.ts`](../../apps/desktop/src/crawl-runs.ts): run rows, saved preferences, CSV exports, and re-export snapshots.
- [`packages/quality/src/email-filter.ts`](../../packages/quality/src/email-filter.ts): shared local email normalization and rejection rules used by Pipeline and Email Filtering.
- [`packages/schemas/src/index.ts`](../../packages/schemas/src/index.ts): URL, preference, run, and row validation.
