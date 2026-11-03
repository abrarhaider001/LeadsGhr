> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# E3: Database and Run History

> **Current platform/stack override:** This is the product requirement for E3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** SQLite stores crawl criteria, selected state range, query checkpoints, result rows, and every CSV export. Stopped runs resume from their saved query. Full provenance and run comparison remain missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `storage/models.ts`

## Purpose

All runs, leads, sources and logs live in PostgreSQL, separated per organisation. History lets users browse
previous runs, compare them and re-export from any device.

## How it works

1. Supabase CLI migrations create and update the schema on deploy.
2. Every lead is written in a transaction together with its source rows and the organisation id.
3. Indexes on (org_id, domain), (org_id, phone) and trigram name search keep queries fast.
4. Encrypted nightly backups and a retention job purge old data according to plan and settings.

## Dependencies and requirements

Supabase Postgres, Supabase CLI migrations, Row Level Security, pg_trgm

## Interface behavior

History page lists runs with date, niche, area and counts, and a 'Compare' action.

## User value

- No installation; teams share one workspace.
- Re-export at any time without re-scraping.
- Foundation for dedupe against past runs.

## Edge cases and limits

- Tenant isolation is critical: every query must filter by org_id, backed by PostgreSQL row-level security.
- Very large tables (tens of millions of leads) need partitioning by organisation or month.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

