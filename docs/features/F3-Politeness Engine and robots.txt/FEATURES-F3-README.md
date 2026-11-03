> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# F3: Politeness Engine and robots.txt

> **Current platform/stack override:** This is the product requirement for F3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Robots checks and polite delays exist; centralized concurrency and crawl-delay handling are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 5 developer days  
**Proposed module:** `engine/politeness.ts`

## Purpose

Applies per-domain request spacing, concurrency of one by default, crawl-delay support, robots.txt allow
and disallow rules, and honest user-agent identification with a contact URL.

## How it works

1. Fetch and cache robots.txt per domain for 24 hours.
2. Check every URL before fetching; skip disallowed paths and log them.
3. Enforce minimum delay with random jitter.
4. Apply stricter limits automatically for high-risk sources.

## Dependencies and requirements

robots-parser, p-limit, Postgres per-domain gate table

## Interface behavior

Compliance badge on each source: 'Respects robots - Delay 3s'.

## User value

- Lowers block risk and keeps the tool defensible.
- Predictable load on small business websites.
- Trust signal for users and their clients.

## Edge cases and limits

- Where robots rules conflict with a user wish, robots wins; there is no override switch.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

