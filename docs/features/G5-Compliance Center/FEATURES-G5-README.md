> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G5: Compliance Center

> **Current platform/stack override:** This is the product requirement for G5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No compliance center or suppression controls.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `web/src/pages/Compliance.tsx`

## Purpose

One place for responsible use: source risk labels, global source switches, suppression and do-not-contact
lists, robots decisions, data retention settings, a legal notice template and a per-lead 'public source' proof
link.

## How it works

1. On first sign-in the user reads and accepts a usage policy.
2. Each source shows a risk label; admins can disable a source for all users, and owners can disable it
for their organisation.
3. The suppression list is applied to every export and run.
4. Retention rules purge old data automatically (default 12 months).

## Dependencies and requirements

React, Supabase Postgres, admin-level global switches

## Interface behavior

Shield icon in the sidebar; blue dot when a setting needs attention.

## User value

- Reduces legal exposure and builds trust with serious clients.
- Makes opt-out requests easy to honour.

## Edge cases and limits

- The tool provides controls, not legal advice; the user remains responsible for local laws.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

