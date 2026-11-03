> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X2: One-Click Site Scan

> **Current platform/stack override:** This is the product requirement for X2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 8 developer days  
**Proposed module:** `extension/src/scan/siteScan.ts`

## Purpose

The lighter version of the crawler. On any company website the user presses Scan and the extension
reads the home page plus up to five contact-type pages, then returns emails, phones, address and social
links. Everything runs in the user's own browser and IP address; no server is needed.

## How it works

1. User opens a company website and presses 'Scan this site'.
2. The extension asks one time for permission to that single website (optional host permission).
3. It fetches the home page, ranks the links (contact, about, team) and fetches the best five with a 1.5 to
3 second delay, always without cookies.
4. An offscreen document parses the HTML with the shared extractors and the merged result appears
with a Save lead button.

## Dependencies and requirements

chrome.permissions, fetch with credentials omitted, offscreen document (DOMParser), shared extractors
package, libphonenumber-js

## Interface behavior

A result card: emails as blue chips, phone numbers with flags, address, small social icons and a blue
'Save lead' pill; a thin progress line under the button while scanning.

## User value

- Instant results for any site the user is looking at, in any niche.
- Zero server cost for you, because the user's browser does the work.
- Traffic is spread across many users' IPs, so blocks are rare.

## Edge cases and limits

- Pages that need JavaScript to show contact data are not rendered; the panel says 'No data found - try
the full web app'.
- Never fetches pages behind a login (cookies are not sent).
- Maximum six pages per site; the limit is shared with the daily scan cap of the plan.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

