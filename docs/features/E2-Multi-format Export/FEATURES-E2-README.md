> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# E2: Multi-format Export

> **Current platform/stack override:** This is the product requirement for E2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Crawl results automatically export to CSV when a run stops or completes. Dashboard and Exports can re-export the saved rows. Additional formats and presets remain missing.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 4 developer days  
**Proposed module:** `export/formats.ts`

## Purpose

Exports the same data to CSV, JSON, VCF contact cards and CRM-friendly CSV layouts, with column
selection and saved export presets.

## How it works

1. User selects leads (all, filtered or selected rows).
2. Chooses format and preset.
3. Tool maps columns and writes the file with correct encoding (UTF-8 with BOM for Excel CSV).
4. Export history is logged for compliance.

## Dependencies and requirements

papaparse, JSON, vcards-js, exceljs

## Interface behavior

Export dialog with format tiles and a column checklist.

## User value

- Easy import into any CRM or mailing tool.
- Presets avoid repeated mapping work.

## Edge cases and limits

- Respect suppression list (G5) in every export.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

