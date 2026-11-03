> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X9: Compliance Guard in the Extension

> **Current platform/stack override:** This is the product requirement for X9. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 4 developer days  
**Proposed module:** `extension/src/guard/`

## Purpose

Built-in safety rules: it checks robots.txt of a site before scanning, never fetches with cookies, never
auto-paginates, enforces delays and daily caps, shows risk labels for sensitive sites and honours a remote
block list and suppression list.

## How it works

1. Before each scan the extension reads the site's robots.txt and skips disallowed paths.
2. The risk label of the current site (from a small JSON list) decides whether to show a warning.
3. A global 'Pause all scanning' switch and the plan's daily cap are always enforced.
4. Admin can add domains to the block list; the extension pulls it on every start.

## Dependencies and requirements

robots-parser (browser build), chrome.storage, remote block list from your own API

## Interface behavior

A small shield icon in the header; tapping it shows the rules in plain language.

## User value

- Keeps the product defensible and the store listing safe.
- Protects small business websites from heavy scanning.
- Same philosophy as the web app: public data, polite pace.

## Edge cases and limits

- Browser fetch cannot set a custom User-Agent, so politeness depends on delays and caps, not on
identification.
- Where robots rules conflict with a user wish, robots wins.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

