> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B4: Open Map Data Importer

> **Current platform/stack override:** This is the product requirement for B4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No offline OpenStreetMap importer.

**Minimum plan:** Professional  
**Priority:** P1  
**Estimated effort:** 7 developer days  
**Proposed module:** `sources/osm_import.ts`

## Purpose

Imports openly licensed map data (OpenStreetMap regional extracts, downloaded once as files) into the
platform's own PostgreSQL tables on the server. No live API is used. Users simply see an 'Open data'
source card and query it like any other source.

## How it works

1. An admin downloads a regional extract in the Admin console (or uploads a file) and presses Import.
2. The importer indexes business points with tags such as office, craft and name into PostGIS tables.
3. User searches read the tables with tag and name matching using the keyword pack and geo cells.
4. Results are tagged 'Open data' and exports carry the required attribution line.

## Dependencies and requirements

osm2pgsql, PostgreSQL with PostGIS, pg_trgm

## Interface behavior

Admin console 'Data packs' lists regions with size, last import date and an Import button. Normal users
only see the source switch.

## User value

- Zero-risk source with no blocking and no rate limits.
- Works offline and is extremely fast once indexed.
- Good for finding company names and websites to crawl.

## Edge cases and limits

- Coverage of estimating companies is patchy; treat as a seed source.
- Country extracts are large (gigabytes); plan disk space and import off-peak.
- Licence requires credit; the export module adds the attribution line automatically.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

