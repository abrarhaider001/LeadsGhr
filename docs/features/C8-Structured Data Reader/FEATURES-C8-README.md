> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C8: Structured Data Reader

> **Current platform/stack override:** This is the product requirement for C8. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No JSON-LD, microdata or RDFa reader.

**Minimum plan:** Explorer  
**Priority:** P1  
**Estimated effort:** 3 developer days  
**Proposed module:** `extract/structured.ts`

## Purpose

Reads machine-readable data that sites publish for search engines: JSON-LD, microdata and RDFa such
as Organization, LocalBusiness, PostalAddress, ContactPoint and sameAs.

## How it works

1. Parse script type application/ld+json blocks and microdata attributes.
2. Map schema.org fields to the Lead schema.
3. Mark fields as 'structured' with high confidence.
4. Fall back to text extractors for missing fields.

## Dependencies and requirements

cheerio, own tolerant JSON-LD and microdata reader

## Interface behavior

Invisible to the user except for a 'Structured data' badge on fields.

## User value

- Highest accuracy data with almost no effort.
- Handles layout changes gracefully.
- Cheap and fast.

## Edge cases and limits

- Invalid JSON-LD is common; use a tolerant parser and never crash on a bad block.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

