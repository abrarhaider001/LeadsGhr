> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X7: Export in the Browser (CSV and Excel)

> **Current platform/stack override:** This is the product requirement for X7. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 3 developer days  
**Proposed module:** `extension/src/export/`

## Purpose

Exports the local list as CSV or a formatted Excel file straight from the browser, with the blue header style
and the same column names as the website export.

## How it works

1. User selects leads (all, filtered or selected) and a format.
2. The extension builds the file in memory in an offscreen document or the side panel.
3. chrome.downloads saves it to the Downloads folder.
4. A short summary toast shows the number of rows exported.

## Dependencies and requirements

exceljs (browser build), papaparse, chrome.downloads

## Interface behavior

Export tab with two format tiles (Excel, CSV) and a column checklist.

## User value

- Value from day one, even without an account.
- Same file layout as the website, so files can be combined.

## Edge cases and limits

- Respect the suppression list when it has been synced from the website.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

