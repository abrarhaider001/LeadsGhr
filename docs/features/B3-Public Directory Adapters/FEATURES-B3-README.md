> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B3: Public Directory Adapters

> **Current platform/stack override:** This is the product requirement for B3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No public directory source adapters.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 10 developer days  
**Proposed module:** `sources/directories/*.ts`

## Purpose

A plug-in set of adapters for public business directories and industry listing sites. Each adapter is a small
file that knows the listing URL pattern, pagination and field selectors of one directory.

## How it works

1. Adapter declares supported countries, niches and fields in a manifest.
2. Engine picks adapters that match the active profile.
3. Listing pages are fetched politely and parsed into the standard Lead schema.
4. Detail pages are visited only when a required field is missing.

## Dependencies and requirements

undici, cheerio, Playwright fallback

## Interface behavior

Adapters appear as a grid of cards with country flags and a health dot (blue dot working, grey dot slow,
black ring broken).

## User value

- New directories are added without touching the core.
- Health checks tell the user which adapters need repair.
- Different directories fill gaps that other sources leave.

## Edge cases and limits

- Before shipping an adapter check the directory's robots rules and terms; some forbid bulk collection
and must be excluded.
- Adapters need a nightly self-test against a saved sample page to detect layout changes.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

