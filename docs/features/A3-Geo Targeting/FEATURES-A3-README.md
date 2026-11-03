> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# A3: Geo Targeting

> **Current platform/stack override:** This is the product requirement for A3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** State and location selection is present; ZIP, radius and wider geography are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 5 developer days  
**Proposed module:** `core/geo/targeting.ts`

## Purpose

Selects where to search: country, state or province, city, ZIP or postal code, or a map radius. Uses a
GeoNames database bundled on the server, so no external geocoding service is needed.

## How it works

1. User picks a country; state and city lists populate from the bundled place database.
2. User can multi-select cities or draw a radius around a point.
3. Tool converts the area into a list of search cells (city names plus ZIP codes) so each search stays
small.
4. Cells are queued as independent jobs so large countries can be covered in parts.

## Dependencies and requirements

GeoNames data (local), Turf.js, PostGIS

## Interface behavior

Cascading dropdowns on the left, small tile map on the right with the selected area shaded in light blue.

## User value

- Breaking big areas into small cells gets more unique companies per source.
- Own data means no cost and no rate limits for geo features.
- Users can run the same niche across many cities with a single click.

## Edge cases and limits

- Cities with the same name in different states must show state in the label.
- Radius mode is approximate; the cell list is the source of truth.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

