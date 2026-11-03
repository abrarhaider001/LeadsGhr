> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G1: Dashboard

> **Current platform/stack override:** This is the product requirement for G1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Dashboard shows saved runs in the Latest pipelines table with CSV re-export buttons. Metric totals and the saved-results trend chart use local crawl runs and export history.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `web/src/pages/Dashboard.tsx`

## Purpose

Home screen with totals, recent runs, leads by niche, email hit rate, quota usage and quick actions such
as 'New search', 'Import list' and 'Open last file'.

## How it works

1. The page loads summary counters from the API when opened.
2. Cards and charts render with the black, grey and blue palette.
3. Counters update live while a run is active through the event stream.
4. Tips and plan upgrade prompts appear for locked features.

## Dependencies and requirements

React, Vite, TypeScript, Tailwind CSS, Recharts, TanStack Query

## Interface behavior

Light grey page, soft pill-shaped cards, large black numbers with grey labels and one blue primary button.

## User value

- Fast overview and one-click restart of work.
- Quota visibility prevents surprise limits.

## Edge cases and limits

- Keep the dashboard responsive when the database is large by using pre-aggregated counters.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

