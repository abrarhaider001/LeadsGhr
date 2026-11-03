> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C5: Address Parser and Geocoder

> **Current platform/stack override:** This is the product requirement for C5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No address parser or offline geocoder.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 7 developer days  
**Proposed module:** `extract/address.ts`

## Purpose

Finds postal addresses on pages and in structured data, splits them into street, city, state, postcode and
country, and attaches latitude and longitude from the offline place database when possible.

## How it works

1. Locate address blocks using schema.org markup, tags and keyword proximity.
2. Parse with an offline address parser into components.
3. Match city and postcode against the local GeoNames table.
4. Store a normalised one-line address and coordinates.

## Dependencies and requirements

parse-address or node-postal (offline), GeoNames, Supabase Postgres

## Interface behavior

Lead detail shows a mini map pin and an 'Edit address' link.

## User value

- Enables location filters and mapping.
- Normalised addresses make dedupe more accurate.
- Mailing-list use cases get clean fields.

## Edge cases and limits

- Parsers are less accurate outside the US, UK and EU; flag low confidence.
- Company with many branches must store addresses as a list, not a single field.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

