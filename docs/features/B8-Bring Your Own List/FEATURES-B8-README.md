> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B8: Bring Your Own List

> **Current platform/stack override:** This is the product requirement for B8. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No bring-your-own-list import and enrichment flow.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 3 developer days  
**Proposed module:** `sources/import_list.ts`

## Purpose

Imports a CSV or Excel file of company names or domains the user already has and runs enrichment only
(crawl, extract, verify, score). Column mapping is guided by a simple wizard.

## How it works

1. User drops a file on the Import screen.
2. Tool detects encoding and header row and proposes column mapping.
3. Domains are cleaned (remove www, paths, tracking) and queued for the crawler.
4. Rows with only a company name are sent to discovery (B1) first.

## Dependencies and requirements

papaparse, exceljs, jschardet

## Interface behavior

Drag-and-drop area with a live preview of the first 10 rows.

## User value

- Gives value even if all discovery sources are switched off.
- Allows enriching old lead sheets.
- Safe and fully compliant source.

## Edge cases and limits

- Very large files (over 500k rows) should be streamed and chunked.
- Duplicates inside the imported file must be reported, not hidden.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

