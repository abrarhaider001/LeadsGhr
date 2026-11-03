> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B1: Search Engine Discovery

> **Current platform/stack override:** This is the product requirement for B1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No general web-search discovery pipeline.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 8 developer days  
**Proposed module:** `sources/search_pages.ts`

## Purpose

Finds company websites by running niche plus city queries on public search result pages using the tool's
own browser automation (no paid API). Results are filtered to business domains, social pages and
directories are separated, and each domain is queued for crawling.

## How it works

1. Engine builds queries from keyword pack x geo cells.
2. A real Chromium instance, driven by Playwright, opens the results page with human-like pacing.
3. Result URLs are parsed, normalised to registrable domains and de-duplicated.
4. Known junk domains (job boards, marketplaces, news) are dropped through a block list.

## Dependencies and requirements

Playwright, cheerio, tldts

## Interface behavior

Source card with an on/off switch, request budget slider and live counter of domains found.

## User value

- Gives broad coverage with no per-search cost.
- Finds companies that are not listed on any directory.
- Domain-first design means the website crawler, the most reliable source, does the heavy work.

## Edge cases and limits

- Search engines throttle automated traffic and their terms restrict it; keep volumes low, pace slowly and
expect occasional challenge pages (see F5).
- Result layouts change; keep selectors in a config file so they can be updated without a new release.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

