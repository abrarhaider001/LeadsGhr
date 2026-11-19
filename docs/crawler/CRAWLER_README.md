# Crawler backend and user flow

This guide describes the **current desktop implementation**. The Crawler tab is an unsaved test of a URL supplied by the user. A Pipeline starts from public business listings, queues each business website, crawls its pages, and stores its results locally. Both use the same guarded HTTP adapter and HTML extraction functions, but their queues, extraction modes, and persistence differ.

## Crawler test versus Pipeline

| Behavior | Crawler tab | Pipeline website stage |
| --- | --- | --- |
| Starting point | URL entered in Crawler | Website URL from a saved business listing |
| Queue | React memory; discarded when the page or app closes | Local SQLite `pipeline_pages`; resumable |
| Fetch method | Direct HTTP or browser rendering preference | The fetch method saved with the run |
| Email source | LeadsGhr extraction or Email Hunter-style matching | The email source saved with the Pipeline run |
| Contact-only option | Homepage plus first contact-like homepage link; otherwise unique same-site links found on crawled pages, up to 1,000 pages | Homepage plus contact links; when off, links found on crawled pages may also enter the queue |
| Concurrent pages | 1–8 temporary workers after homepage discovery | 1–8 workers claiming saved queued pages |
| Results | Per-page email counts and details | Per-page statuses and emails merged into the saved business row, then filtered |
| Storage and export | No SQLite, Supabase, or CSV write | Local SQLite run data and CSV export |

Business-listing search is a separate stage. Google Maps is currently the available automated Pipeline provider. The Crawler tab does not search Google Maps.

## Preferences

Open **Settings > Preferences > Crawler**. Preferences are validated with Zod, saved to `preferences.json` in `C:\LeadsGhr\data`, and defaulted when older files lack a newly added field. A Pipeline saves a copy of the preferences when created; later changes do not rewrite that run.

| Setting | Default | Effect |
| --- | --- | --- |
| Page fetch method: Browser rendering | On | Fetch HTML, then load the approved URL in an isolated Electron page and inspect scroll snapshots. Slower, but can see JavaScript-added content. |
| Page fetch method: Direct HTTP | Off | Inspect only the server's HTML response. No browser page is opened for website extraction. |
| Crawler email source: Our behavior | On | Read page text and `mailto:` addresses, plus separately inspect public form-recipient clues. |
| Crawler email source: Email Hunter-style | Off | Scan the complete HTML string, including scripts and attributes, for email-shaped text. Applies to Crawler and Pipeline website crawling. |
| Show webpage in Crawler | On | Show the test's webview in browser mode. Turning it off hides the view but leaves it mounted for extraction. Has no effect in Direct HTTP mode. |
| Crawl homepage and contact page only | On | Limit the test to those two pages when a contact page exists. In Pipeline, turning it off permits same-site discovery from each crawled page. |
| Concurrent pages | 2 | Maximum number of queued pages inspected at once in Crawler and Pipeline. Same-origin requests reserve at least 2 seconds between starts, or the longer robots crawl delay. |

“Email Hunter-style” is a local matcher. It does not invoke the installed Chrome extension, read its storage, query search engines, or verify deliverability. Both fetch methods can use it in Crawler and Pipeline: browser mode scans fetched HTML and rendered snapshots; Direct HTTP scans fetched HTML only.

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

**Current test limits:** The Crawler test caps discovery at 1,000 distinct URLs. Its table follows a rolling 20-row crawl window: recently crawled or skipped pages appear above fetching and crawling pages, with queued pages below. As processing advances, older completed rows leave the top and later queued rows enter at the bottom. After completion, the last 20 completed pages remain visible, including their statuses and email detail actions. Display limits do not stop workers from processing the rest of the queue. A challenge or unavailable robots policy pauses the test; other later page errors are marked Skipped. There is no persisted checkpoint or export. “Concurrent pages” means concurrent asynchronous page jobs, not CPU `worker_threads`.

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

Pipeline discovery first saves public business rows. When a row has a website URL, [`packages/app/src/search-results-page.tsx`](../../packages/app/src/search-results-page.tsx) asks the main process to queue its homepage. Website workers start alongside the selected Maps searches. They can claim a homepage as soon as it enters the queue; the crawler can add contact and other allowed same-site links before it finishes extracting that page's emails. The two URL sources share the same saved queue. The Pipeline screen displays only the Website URL queue table; the saved business rows remain available to filtering, export, and other run views. Website crawling is in [`apps/desktop/src/pipeline-pages.ts`](../../apps/desktop/src/pipeline-pages.ts); runs and exports are in [`apps/desktop/src/crawl-runs.ts`](../../apps/desktop/src/crawl-runs.ts).

The Pipeline's Website URL queue uses the same rolling 20-row window: recently completed pages above active fetching/crawling pages and queued pages below. As pages finish, older completed rows leave and the next queued rows enter. Both Crawler and Pipeline display a compact table with at most 20 rows and a visible shown/total count, without a second vertical scrollbar inside the table. Once the website crawl completes, the last 20 completed pages remain visible. Counts cover the entire saved queue. Each row shows a page email count; the eye button opens a detail drawer with addresses, status, source, and a marker when a contact-page email was also found on that business's homepage. The queue view does not limit processing, storage, or export.

**Maps searches (New Search and Pipeline):** both run the same search loop in `search-results-page.tsx`, one location at a time. A location whose Maps search fails (for example Google leaves the page empty or opens a view without a list of places, which happens at random: the same search often works a minute later) is **retried once after 5 seconds, then skipped**, and the search continues with the next location. Errors that affect every search stop the run instead, with the reason saved: a Google challenge (captcha or unusual traffic), robots.txt disallowing the search, Chrome missing, Maps listings turned off, or **3 locations failing in a row**. The status line names the stopping search and reason; the run's saved error (shown under it on the Pipeline page) records it, or, for a completed run, which searches were skipped and why. The Maps scanner also reopens the search once when Chrome leaves its new tab on `about:blank`, and an empty-result error names the page Google showed. Before this, any single failed search ended the run (`failed` for New Search, a silent `stopped` for Pipeline), and any single website failure stopped the Pipeline.

1. SQLite `pipeline_pages` stores run ID, business row key, URL, page type, status, emails JSON, error, and timestamps. `(run_id, row_key, url)` prevents exact duplicates. URLs lose fragments and a trailing slash. A run allows up to **1,000 pages per business** and **5,000 pages total**.
2. The queue chooses Contact page before Homepage before other Page, then creation order. States are `queued`, `fetching`, `ready`, `crawling`, `crawled`, and `skipped`. UI events include the updated list and status text.
3. Before a page fetch, the main process loads or reuses its origin's robots policy, checks permission for that URL, and reserves at least **2 seconds** between requests to that origin, or the robots crawl delay if longer. A redirect to another site skips that page. A redirected same-site origin is checked separately. A site that answers HTTP 401, 403, 429, 503 or challenge text, or whose robots.txt cannot be read (any status other than 200 or 404), is skipped entirely: the page and that business's other queued pages become `skipped` with the reason, and the site is not asked again. Connection errors, timeouts, and certificate errors skip only that page. Non-HTML or other non-200 responses are skipped. **One website never stops the Pipeline**: workers keep crawling the other pages, and the reason is shown on the skipped row (eye button and row tooltip).
4. Up to the run's saved worker count claim distinct queued pages while business searches continue. An idle worker waits for URLs from either a new search result or a page currently being crawled. The pool exits only after the saved search cursor reaches the final query, the URL queue is empty, and no page job is active. A worker fetches and inspects its page, then claims another. Browser mode loads a separate hidden, sandboxed Electron window per active worker and collects eight scroll snapshots; if rendering fails without a challenge, it uses the fetched HTML. Direct HTTP uses only fetched HTML.
5. Each snapshot goes through `discoverPage` first. Contact-like links from a homepage enter the queue immediately; with contact-only off, other same-site links found on any crawled page enter immediately too. The current page then uses the run's chosen email source: `extractContacts` or `extractRenderedHtmlEmails`. Public form-recipient clues are also included. Found emails merge with the business row's existing emails, are deduplicated, and are capped at **1,000 per business row**; per-page emails are stored in `pipeline_pages`. Repeated business-result saves merge with already extracted emails, so a search update cannot erase a concurrent crawl's findings.
6. On startup, pages left in `fetching`, `ready`, or `crawling` return to `queued` for resume. Pausing (the user's Pause, or the end of the searches) aborts the active process and requeues unfinished pages; a page failure never does. Only one Pipeline website crawl runs at a time. Saved search position, business rows, page queue, and export history remain local; extracted data is not sent to Supabase.
7. After the website crawl finishes, or when a run stops with partial results, the main process filters every saved Pipeline business row's emails before exporting. The UI refreshes from the filtered saved rows. CSV files therefore contain kept addresses only. Saved business rows are exported to `C:\LeadsGhr\exports` (`Documents/LeadsGhr/exports` on non-Windows systems). Exports made before this change keep their original paths in history. Export records include file name, path, size, entry count, time, and a CSV snapshot for re-export.

### Automatic email filtering before export

The Pipeline uses the same local rules as the Email Filtering page, now shared through [`packages/quality/src/email-filter.ts`](../../packages/quality/src/email-filter.ts). For **each business row**, it normalizes case and surrounding punctuation, rejects malformed or overlong addresses, placeholders, a small known disposable-domain list, no-reply mailboxes, and unrecognized domain endings, then removes duplicates and Gmail aliases. Filtering per business preserves an address that legitimately appears on more than one business's site. This is a syntax and heuristic cleanup, **not** DNS, MX, SMTP, or mailbox verification.

The filtering step runs after page extraction and before every automatic Pipeline CSV export, including partial exports after stop or a crawl error. Pausing and then resuming without stopping does not export in between. A local `pipeline_email_filters` SQLite table keeps each row's original email inputs and rejected values with reasons. On resume, the next filter pass combines those original inputs with any newly crawled addresses, so earlier rejected inputs are not silently lost. The audit remains on this computer; only kept addresses appear in saved business rows and CSV. Deleting a Pipeline also deletes its filter audit.

**Current Pipeline limits:** Filtering does not recover emails omitted by extraction, validate that a mailbox exists, or guarantee deliverability. The UI does not yet expose the saved rejected-address audit.

## Source map

To reset all saved Pipeline and legacy scan history, close the desktop app and run `pnpm clear:crawl-history` from the repository root. [`scripts/clear-local-crawl-history.mjs`](../../scripts/clear-local-crawl-history.mjs) first creates a timestamped SQLite backup beside the live database, then deletes the run, queue, row, filter-audit, and export-history records in one transaction. It preserves preferences, search selections, leads, and CSV files already written to disk. The Crawler test has no saved history to clear.

- [`apps/desktop/src/adapters.ts`](../../apps/desktop/src/adapters.ts): public HTTP requests, IP checks, redirects, decompression, limits, and User-Agent.
- [`apps/desktop/src/crawler-test.ts`](../../apps/desktop/src/crawler-test.ts): test IPC, robots check, page approval, and webview restrictions.
- [`packages/app/src/crawler-page.tsx`](../../packages/app/src/crawler-page.tsx): temporary queue, rendering flow, discovery, per-page results, and status UI.
- [`packages/extract/src/index.ts`](../../packages/extract/src/index.ts): email, phone, link, and form-clue parsing.
- [`apps/desktop/src/pipeline-pages.ts`](../../apps/desktop/src/pipeline-pages.ts): persistent queue, robots-aware pacing, fetch/crawl overlap, and resume behavior.
- [`apps/desktop/src/crawl-runs.ts`](../../apps/desktop/src/crawl-runs.ts): run rows, saved preferences, CSV exports, and re-export snapshots.
- [`packages/quality/src/email-filter.ts`](../../packages/quality/src/email-filter.ts): shared local email normalization and rejection rules used by Pipeline and Email Filtering.
- [`packages/schemas/src/index.ts`](../../packages/schemas/src/index.ts): URL, preference, run, and row validation.
