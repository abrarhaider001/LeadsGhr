> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X5: Local Lead List and Dedupe

> **Current platform/stack override:** This is the product requirement for X5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 4 developer days  
**Proposed module:** `extension/src/store/`

## Purpose

All captured and scanned leads are stored on the user's machine in IndexedDB, merged by website
domain and phone number so the same company never appears twice.

## How it works

1. Every result is normalised (domain, phone in international format, name without suffixes).
2. Exact match on domain or phone merges immediately; fuzzy name plus city flags a possible duplicate.
3. The list supports search, tags, notes and delete.
4. Data stays local until the user chooses to sync (X8).

## Dependencies and requirements

IndexedDB via idb, tldts, fastest-levenshtein

## Interface behavior

Leads tab with search, filter chips, status badges and a detail drawer.

## User value

- Works offline and keeps data private by default.
- No duplicate rows in exports.
- Same dedupe rules as the website, so syncing is clean.

## Edge cases and limits

- Browser storage can be cleared by the user; remind them to export or sync regularly.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

