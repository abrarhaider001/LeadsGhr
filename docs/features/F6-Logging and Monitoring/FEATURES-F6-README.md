> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# F6: Logging and Monitoring

> **Current platform/stack override:** This is the product requirement for F6. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No structured request log or health-monitoring panel.

**Minimum plan:** Explorer  
**Priority:** P1  
**Estimated effort:** 4 developer days  
**Proposed module:** `engine/logs.ts`

## Purpose

Structured logs for every request, extraction and decision with levels and filters, plus a health panel
(requests per minute, success rate, memory, active browsers).

## How it works

1. Log events as JSON lines and as database rows.
2. Show a live filtered stream in the console.
3. Compute rolling statistics for the health panel.
4. Provide 'Export diagnostics' for support.

## Dependencies and requirements

pino, Supabase Postgres, own admin log viewer

## Interface behavior

Terminal-like panel with level colours (INFO in grey, WARN in blue, ERROR in bold black).

## User value

- Faster debugging for you and the user.
- Visible health helps tune speed.

## Edge cases and limits

- Never log full page bodies or personal data in plain text beyond the chosen retention period.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

