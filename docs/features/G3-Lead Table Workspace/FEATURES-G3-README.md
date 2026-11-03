> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G3: Lead Table Workspace

> **Current platform/stack override:** This is the product requirement for G3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Local lead table with search and status filter exists; editing, tagging and advanced grid tools are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 8 developer days  
**Proposed module:** `web/src/pages/Leads.tsx`

## Purpose

Spreadsheet-like table for browsing millions of rows with sorting, instant search, column chooser, inline
editing, tags, notes, multi-select actions and a detail drawer.

## How it works

1. Rows load in pages from the API with cursor pagination and virtual scrolling.
2. Search uses PostgreSQL full-text and trigram indexes.
3. Inline edits are stored as user overrides above scraped values.
4. Bulk actions: tag, export, delete, verify again, add to suppression.

## Dependencies and requirements

TanStack Table with virtual scrolling, cursor pagination, Postgres full-text search

## Interface behavior

Sticky header, zebra rows in very light grey, status chips in blue and grey.

## User value

- Work with data inside the tool; no need to open Excel for every check.
- User edits never get lost on re-scrape.

## Edge cases and limits

- Edits and scraped values need clear precedence rules; show an 'edited' marker.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

