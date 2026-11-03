> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# E1: Live Excel Export

> **Current platform/stack override:** This is the product requirement for E1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No live Excel workbook output.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 5 developer days  
**Proposed module:** `export/excel_live.ts`

## Purpose

Leads are journaled in the database the moment they are found, and the Excel workbook is rebuilt on the
server while the run is going. The user can press Download at any time and always gets the latest valid
file. Styling follows the template: header colours, column widths, frozen header row, filters and hyperlinks.

## How it works

1. Every lead is first written to the PostgreSQL journal in a transaction.
2. Every 25 new leads (or 30 seconds) a worker rebuilds the workbook in memory and uploads it to
object storage, replacing the previous version atomically.
3. The run page shows the file card; Download returns a short-lived signed link to the latest version.
4. At the end the worker adds a summary sheet with counts and run settings.

## Dependencies and requirements

exceljs, Supabase Storage (signed URLs), Supabase Postgres journal

## Interface behavior

A file card on the run page: 'leads_2026-10-19.xlsx - 842 rows' with a blue Download button that always
serves the latest version.

## User value

- This is the 'keep saving to Excel' behaviour you asked for, now available from any device.
- Crash safe by design: the database is the source of truth, files can always be rebuilt.
- Formatted file is ready to hand to a sales team.

## Edge cases and limits

- Very large runs (over about 100,000 rows) rebuild in the background; show a 'Preparing file' state.
- Cap one sheet at about 1,000,000 rows and roll to a new sheet or file.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

