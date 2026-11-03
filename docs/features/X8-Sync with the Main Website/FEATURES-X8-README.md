> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X8: Sync with the Main Website

> **Current platform/stack override:** This is the product requirement for X8. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 6 developer days  
**Proposed module:** `extension/src/sync/`

## Purpose

Pushes leads from the extension into the user's website account and pulls down settings: niche keyword
packs, filter profiles, suppression list and selector packs. This is what connects the lite tool with the full
product.

## How it works

1. User presses 'Sync' (or enables auto-sync).
2. Leads are sent in batches of 100 to the API with origin set to 'extension'.
3. The server dedupes against existing leads by organisation and domain and counts the plan quota.
4. Pulled settings are stored locally; failed batches retry later.

## Dependencies and requirements

Supabase JS client, REST endpoints on the Node API, chrome.storage

## Interface behavior

Sync chip in the header: 'Synced just now' or 'Waiting for connection'.

## User value

- One workspace: leads from the browser and from the web app live in the same table.
- Website can finish heavy work (full crawl, verification, scoring) on leads the extension found.
- Teams share profiles and suppression lists.

## Edge cases and limits

- Conflicts: server data wins for verified fields; the user's edits are kept as overrides.
- Large first sync (thousands of leads) runs in the background with progress.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

