> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C2: Contact Page Detector

> **Current platform/stack override:** This is the product requirement for C2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Same-site links and common contact paths are found; ranking, sitemaps and multilingual detection are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 3 developer days  
**Proposed module:** `crawler/page_ranker.ts`

## Purpose

Ranks internal links by how likely they are to hold contact data using multilingual keyword lists (contact,
about, team, reach us, impressum, kontakt, contacto and so on) plus URL and menu position signals.

## How it works

1. Collect anchors from navigation, footer and body.
2. Score each by keyword match, URL depth and location on page.
3. Add sitemap.xml pages when present.
4. Return a ranked list with scores for the crawler.

## Dependencies and requirements

cheerio, Fuse.js

## Interface behavior

Not user visible; scores appear in the debug view for power users.

## User value

- Finds the one page that matters in a few requests.
- Multilingual list widens global coverage.
- Scores are tunable per niche.

## Edge cases and limits

- Sites that put contact data only in a pop-up or image need the Browser fallback (see F4).

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

