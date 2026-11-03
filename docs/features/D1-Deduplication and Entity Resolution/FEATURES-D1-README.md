> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D1: Deduplication and Entity Resolution

> **Current platform/stack override:** This is the product requirement for D1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** A simple deduplication key utility exists; fuzzy company resolution and review are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `quality/dedupe.ts`

## Purpose

Merges records that describe the same company across sources. Keys include registrable domain,
normalised phone, normalised name plus city, and licence number. Fuzzy name matching handles suffixes
such as LLC, Ltd and Inc.

## How it works

1. Normalise names (case, punctuation, suffixes).
2. Exact match on domain or E.164 phone merges immediately.
3. Fuzzy match on name plus city above a threshold queues a merge.
4. Merged lead keeps all source records so the merge can be undone.

## Dependencies and requirements

fastest-levenshtein, tldts, Supabase Postgres (pg_trgm)

## Interface behavior

A 'Merged 3 sources' badge on a lead; an 'Unmerge' option in the detail view.

## User value

- One clean row per company.
- Fewer duplicate emails sent.
- Source history is preserved.

## Edge cases and limits

- Franchise and multi-branch companies share a name; use address as a tie-breaker.
- Never merge on shared generic phone numbers of directories.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

