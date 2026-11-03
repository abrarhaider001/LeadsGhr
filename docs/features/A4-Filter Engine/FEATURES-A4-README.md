> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# A4: Filter Engine

> **Current platform/stack override:** This is the product requirement for A4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No pre/post crawl filter rule engine.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `core/filters/engine.ts`

## Purpose

A rule builder that applies filters before and after scraping. Pre-filters decide which sources and areas to
visit; post-filters decide which leads to keep. Filters include company size hint, has email, has phone, has
website, website language, rating, review count, years in business, services keywords, country and
exclusion lists.

## How it works

1. User opens the Filters panel and adds rules with 'Add filter' (field, operator, value).
2. Pre-filter rules are compiled into source queries; post-filter rules are compiled into a fast in-memory
predicate.
3. While the run is live, each new lead is tested; failed leads go to a 'Filtered out' bin, not deleted.
4. User can change a filter after the run and re-apply it to stored data instantly.

## Dependencies and requirements

Zod, Supabase Postgres, own JSON rule engine

## Interface behavior

Chips such as 'Has email', 'Rating over 4', 'Exclude: franchise'. An 'Any / All' toggle switches AND and OR
logic.

## User value

- Cleaner output means fewer wasted outreach emails.
- Re-applying filters to stored data avoids re-scraping, saving time and risk of blocks.
- The filtered-out bin lets the user recover leads if a rule was too strict.

## Edge cases and limits

- Missing values (for example no rating) need a clear rule: unknown never silently fails a filter unless the
user chooses so.
- Filters that depend on a field the source does not provide must be greyed out for that source.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

