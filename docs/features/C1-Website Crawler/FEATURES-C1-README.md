> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C1: Website Crawler

> **Current platform/stack override:** This is the product requirement for C1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** The unsaved Crawler test queues a homepage, contact page, and optionally same-site pages, then groups emails by source page. Pipeline now persists website pages in SQLite, deduplicates URLs per business, crawls a homepage and contact page by default, and recursively queues same-site links when the contact-only preference is off. Its HTTP fetch stage prepares the next page while a sandboxed Electron page renders and scrolls through the current one. Page statuses, discovered emails, and progress survive a restart; a stopped pipeline can resume from its saved query and URL queue. The pipeline CSV includes collected emails. The broad scoring and later C2-C8 extraction features below remain planned.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 10 developer days  
**Proposed module:** `crawler/site_crawler.ts`

## Purpose

The core engine. For every company domain it fetches the home page and a short, prioritised list of public
pages likely to contain contact data (contact, about, team, locations, footer, privacy and imprint pages) and
extracts data from them. It uses fast HTTP first and a headless browser only when a page needs
JavaScript.

## How it works

1. Fetch robots.txt, cache it and honour disallow rules and crawl delay.
2. Fetch the home page; parse internal links and score them by contact keywords in URL and anchor
text.
3. Visit the top N pages (default 6) with a depth limit of 2.
4. Pass each page's HTML to the extractors (C2 to C8) and merge results into one lead.

## Dependencies and requirements

undici, cheerio, Playwright fallback, robots-parser

## Interface behavior

Run console shows 'Crawling example.com - 4 pages - 2 emails found' with a small spinner.

## User value

- Highest yield per request among all sources, and the pages are meant to be public.
- Prioritised link scoring keeps crawls short and polite.
- HTTP-first design is 10 to 20 times cheaper than a browser for every page.

## Edge cases and limits

- Never submit forms, never log in, never go behind paywalls; this keeps the tool inside publicly visible
data.
- Set a hard timeout and page size cap, and block private and internal IP ranges before every fetch
(SSRF protection).

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

