> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X10: Lite Filters and Quick Score

> **Current platform/stack override:** This is the product requirement for X10. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Starter  
**Priority:** P2  
**Estimated effort:** 3 developer days  
**Proposed module:** `extension/src/filters/`

## Purpose

A small set of filters (has email, has phone, has website, country, tag) and a simple 0 to 100 quick score
from the fields found, so the user sees the best leads first.

## How it works

1. User turns on filter chips in the Leads tab.
2. A quick score is computed from verified email, phone, website and niche match.
3. Leads can be sorted by score.
4. Scores are recomputed when verification or edits change fields.

## Dependencies and requirements

plain TypeScript, JSON rules

## Interface behavior

Filter chips as pills and a small score ring (blue for high, grey for low) per lead.

## User value

- Fast prioritising without opening the website.
- Same scoring idea as the web app, but with fewer inputs.

## Edge cases and limits

- Quick score is simpler than the full score on the website; show a 'Quick' label.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

