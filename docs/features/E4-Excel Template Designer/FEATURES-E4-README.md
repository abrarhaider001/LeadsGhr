> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# E4: Excel Template Designer

> **Current platform/stack override:** This is the product requirement for E4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No Excel template designer.

**Minimum plan:** Professional  
**Priority:** P2  
**Estimated effort:** 5 developer days  
**Proposed module:** `export/template_designer.ts`

## Purpose

Visual editor for the output workbook: pick columns and order, rename headers, set colours, add
conditional formatting for score and verification status, and create extra sheets such as 'Hot leads'.

## How it works

1. User opens the designer and drags fields into columns.
2. Applies a theme (default: black, white, grey and blue) and conditional rules.
3. Saves the layout as a template.
4. Live Excel Writer (E1) uses the template for new files.

## Dependencies and requirements

exceljs, JSON

## Interface behavior

Preview grid on the right updates instantly as options change.

## User value

- Output looks professional without manual formatting.
- Agency users can brand files for clients.

## Edge cases and limits

- Templates must handle missing columns gracefully.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

