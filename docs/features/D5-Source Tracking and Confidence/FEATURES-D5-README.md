> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D5: Source Tracking and Confidence

> **Current platform/stack override:** This is the product requirement for D5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No field-level source and confidence record.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 4 developer days  
**Proposed module:** `quality/provenance.ts`

## Purpose

Every field remembers where it came from, when it was seen and how confident the extraction was.
Conflicts between sources are resolved by a rank order that the user can change.

## How it works

1. Store field value with source id, URL, timestamp and confidence.
2. When two sources disagree, keep both and mark the winner by rank.
3. Show provenance in the detail view.
4. Use age of data to lower confidence over time.

## Dependencies and requirements

Supabase Postgres

## Interface behavior

Hover on any field shows 'Seen on example.com/contact on 14 Oct 2026'.

## User value

- Auditable data, useful for compliance questions.
- Easy to debug wrong values.
- Enables 'refresh stale data' runs.

## Edge cases and limits

- Storage grows quickly; compact old history monthly.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

