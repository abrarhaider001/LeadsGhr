> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B2: Map Listings Adapter

> **Current platform/stack override:** This is the product requirement for B2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Visible Google business cards stream into temporary results; full fields and durable ingestion are missing.

**Minimum plan:** Starter  
**Priority:** P0  
**Estimated effort:** 9 developer days  
**Proposed module:** `sources/map_listings.ts`

## Purpose

Reads the public business listing panels shown on map search pages: name, category, address, phone,
website, rating and review count. Output feeds the same pipeline as every other source.

## How it works

1. Engine opens the map search for 'niche in city' and scrolls the results list slowly.
2. For each card it reads the fields visible on screen; the website link is passed to the crawler.
3. Pagination is handled by controlled scrolling with a hard cap per cell.
4. Cells with very many results are split into smaller geographic cells automatically.

## Dependencies and requirements

Playwright, cheerio, JSON path extractors

## Interface behavior

Source card shows 'Cells done 12 of 40' and a pause button.

## User value

- Best source for local phone numbers and verified addresses.
- Ratings and review counts enable quality filters.
- Website field links straight to the high-yield crawler.

## Edge cases and limits

- Map providers prohibit automated collection in their terms. The adapter is therefore marked 'Higher
risk' in the app, runs slowly, never logs in and can be switched off globally in the Compliance Center
(G5).
- Listings change often; always store the date each field was seen.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

