> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X3: Page Data Capture (Assisted)

> **Current platform/stack override:** This is the product requirement for X3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 7 developer days  
**Proposed module:** `extension/src/capture/`

## Purpose

A Capture button reads only the company cards that are visible on the page the user is viewing (name,
website link, phone, address, size band, category). It works on directories, map listing pages, professional
network pages and public social pages. The selector rules live in small JSON packs that can be updated
without a new store release.

## How it works

1. User opens a results page and sets filters using the site's own interface.
2. User presses 'Capture page' in the side panel.
3. A content script reads the visible cards using the selector pack for that site.
4. Leads are added to the local list with a source label, and their websites are offered to Site Scan (X2
and X4).

## Dependencies and requirements

chrome.scripting, content scripts, per-site selector packs (JSON), MutationObserver for visible cards only

## Interface behavior

Panel shows 'Capture page (12 found)' with a blue pill, a list of the found companies and a checkbox to
select which to keep.

## User value

- Lets users keep the strong filters of sites like the professional network, with no automation of the site
itself.
- Selector packs can be fixed in hours when a layout changes.
- Much lower account risk than automatic scraping.

## Edge cases and limits

- Manual only: no auto-scroll, no auto-next-page, no background loops.
- High-risk sites show a warning on first use; terms of those sites may forbid even assisted capture, so
the user is responsible.
- An admin can switch a selector pack off for everyone remotely.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

