> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X1: Extension Shell, Side Panel and Login

> **Current platform/stack override:** This is the product requirement for X1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `extension/src/sidepanel/`

## Purpose

The extension is a Manifest V3 add-on for Chrome, Edge and Brave. Its interface is a side panel built in
React with the same design tokens as the website, so it stays open while the user browses. The user signs
in with the same account as the website.

## How it works

1. User installs the extension (Web Store, or loaded unpacked while testing).
2. Clicking the toolbar icon opens the side panel with tabs: Home, Leads, Queue, Export, Settings.
3. The user signs in once; the Supabase session is kept in chrome.storage.local and refreshed
automatically.
4. Without an account the extension still works locally in Explorer mode (scan, capture, export).

## Dependencies and requirements

Manifest V3, React, Vite, chrome.sidePanel, Supabase JS client (Auth)

## Interface behavior

400 px wide panel, soft white background, graphite headlines, a big blue pill button 'Scan this site' on the
Home tab and pill-shaped tabs.

## User value

- Lightweight: no server needed for the basic features.
- Same account and same look as the website, so users feel it is one product.
- Side panel stays open while moving between websites.

## Edge cases and limits

- The MV3 service worker sleeps after a short idle time, so all state must live in storage, never in
memory.
- Keep the bundle small (under about 1 MB) for fast install and easier store review.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

