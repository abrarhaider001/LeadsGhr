> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B7: Associations, Chambers and Licence Registries

> **Current platform/stack override:** This is the product requirement for B7. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No association, chamber or registry adapters.

**Minimum plan:** Professional  
**Priority:** P1  
**Estimated effort:** 8 developer days  
**Proposed module:** `sources/registries/*.ts`

## Purpose

Adapters for public member lists of trade associations, chambers of commerce and government contractor
or business registries. These lists are published for the public and often include phone, address and
sometimes email.

## How it works

1. User picks a country or trade and the app lists matching registries.
2. Adapter walks the public search form or the member list pages.
3. PDF member lists are parsed with pdfplumber into rows.
4. Rows are normalised into Lead records and matched against existing leads.

## Dependencies and requirements

undici, Playwright, pdf-parse or pdfjs-dist

## Interface behavior

Registry cards show the issuing body, number of records and last refreshed date.

## User value

- High-trust data: these companies are real and active.
- Good for niche and region combinations missing from maps.
- Licence number is a great dedupe key.

## Edge cases and limits

- Many registries use captchas on search forms; follow F5 and prefer bulk downloads when offered.
- Some registries restrict commercial reuse; store the terms note in the adapter manifest.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

