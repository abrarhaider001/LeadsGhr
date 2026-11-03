> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# A5: Saved Search Profiles and Templates

> **Current platform/stack override:** This is the product requirement for A5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No runnable saved search profiles or templates.

**Minimum plan:** Explorer  
**Priority:** P1  
**Estimated effort:** 3 developer days  
**Proposed module:** `core/profiles/store.ts`

## Purpose

Stores a complete setup (niche pack, geography, filters, sources, export template) as a named profile that
can be run again or scheduled. Profiles can be duplicated and exported as a file to share with a team.

## How it works

1. After configuring a search the user taps 'Save as profile' and names it.
2. The profile is stored as versioned JSON in the organisation's database.
3. From the Dashboard the user can run, edit, duplicate, archive or schedule it.
4. Agency plans can export or import profiles as .atlas files.

## Dependencies and requirements

Supabase Postgres (JSONB), Zod

## Interface behavior

Profiles show as cards with niche icon, area, last run date and lead count.

## User value

- Repeat campaigns take two clicks.
- Teams share proven setups.
- Versioning shows which setup produced which leads.

## Edge cases and limits

- Profile format needs a schema version for forward compatibility.
- Deleting a profile must not delete leads already collected.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

