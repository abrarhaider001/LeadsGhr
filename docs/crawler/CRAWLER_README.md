# Crawler test page

The Crawler sidebar tab tests extraction from a user-entered public HTTP(S) homepage and a temporary page queue. It does not save leads, run history, or extraction data to SQLite or Supabase.

## Email source preference

In **Profile & preferences ? Preferences ? Crawler email source**, choose one of two mutually exclusive modes:

- **Our behavior** (default): existing LeadsGhr extraction from visible text, `mailto:` links, and public form-recipient clues. The URL queue, robots checks, and page preview work as before.
- **Email Hunter-style**: match email-shaped strings in each page's complete rendered HTML, including attributes and inline scripts. This can find dynamically loaded addresses that a raw HTTP response or visible-text extraction misses. It can also count placeholders, sample data, and malformed matches; the results are unverified.

The Email Hunter-style mode reproduces the installed extension's *page HTML matching*, not access to the extension's private storage or its Bing/DuckDuckGo search augmentation. Bing disallows crawling its search endpoint in robots.txt and DuckDuckGo may return a challenge. Therefore this mode does not promise the extension's exact count. Both modes use the existing temporary URL queue, respect each page's robots policy, never submit forms, and save no crawler-test results.

## Flow

1. Enter a public homepage URL and start a crawl. Electron checks robots.txt, fetches public HTML with size and time limits, blocks private/local targets, strips credentials, and checks redirects.
2. The activity row changes from "Fetching webpage..." to "Webpage fetched". The crawler opens the approved page in a sandboxed Electron webview and scrolls it in steps.
3. It extracts same-site URLs from homepage content. A contact-like path is matched with a regular expression to prioritize that URL in the queue.
4. It queues the contact page first. With **Crawl homepage and contact page only** on, it stops after that page. With it off, every other unique same-site homepage URL enters the queue in discovered order. Duplicate URLs are not queued again.
5. Each queued page is fetched and crawled one at a time. The URL table shows order, URL, type, status, and actual emails found on that page. Blocked or failed pages are marked Skipped.
6. The table heading shows the unique email total across crawled pages. Publicly exposed form recipients may be included; possible script recipients are unconfirmed. Forms are never submitted.

Live activity shows one changing status line with a grey dot while working and a primary blue dot for successful results. Fetching text updates to fetched when successful. The preview shows the current page when enabled in Profile > Preferences. Hiding it leaves the isolated webview mounted offscreen for crawling.

The contact-only preference is on by default and stored locally. Crawls remain temporary. Each page must pass its own robots check; challenges pause the crawl and logins are never used.

Implementation: `packages/app/src/crawler-page.tsx`, shared extraction in `packages/extract`, and guarded Electron IPC in `apps/desktop/src/crawler-test.ts`.
