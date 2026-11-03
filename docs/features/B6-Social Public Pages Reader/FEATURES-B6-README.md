> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B6: Social Public Pages Reader

> **Current platform/stack override:** This is the product requirement for B6. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** Social links are discovered, but public social page details are not read.

**Minimum plan:** Professional  
**Priority:** P2  
**Estimated effort:** 5 developer days  
**Proposed module:** `sources/social_pages.ts`

## Purpose

Reads the public 'About' information of business pages that are reachable without login: phone, email,
address, website and hours when the page owner has published them. Pages are found from links on
company websites or from search discovery, never by crawling the social network itself.

## How it works

1. Crawler finds social page links on a company website (see C6).
2. Reader opens each public page once, without login, at human pace.
3. Visible contact fields are extracted and merged into the lead with source label 'Social page'.
4. If a login wall appears the page is skipped and logged.

## Dependencies and requirements

Playwright, cheerio

## Interface behavior

Lead detail view shows small source badges: Website, Map, Social.

## User value

- Fills missing phone or email for small firms that run mostly from social pages.
- Link-driven discovery keeps request counts low.
- Clear 'skip on wall' rule avoids account risk.

## Edge cases and limits

- Social platforms block heavy automation and restrict scraping in their terms; keep to a handful of page
views per minute and never use a personal account.
- Page layouts change very often; expect maintenance.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

