> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# B5: Professional Network Company Pages (Browser Extension, Assisted Mode)

> **Current platform/stack override:** This is the product requirement for B5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Access limit:** Capture only public pages available without a source-site login. The current no-logins rule supersedes any example below involving a signed-in professional-network page or session.

**Status:** Not implemented (desktop).

**Current coverage:** Assisted professional-network capture belongs to a separate future extension.

**Minimum plan:** Professional  
**Priority:** P2  
**Estimated effort:** 6 developer days  
**Proposed module:** `extension/capture.ts`

## Purpose

A small browser extension works beside the user: the user searches and applies filters in the network's
own site as they normally do, opens a results page and clicks Capture. The extension reads only the
company fields visible on that page (name, website link, location, size band) and sends them to the user's
LeadsGhr account. It never logs in for the user, never types credentials and never pages through results
by itself.

## How it works

1. User installs the extension and signs in to LeadsGhr once.
2. User sets filters in the network's own interface and opens a results page.
3. User clicks 'Capture this page'; visible company cards are sent to the account as leads.
4. Captured websites are queued to the server-side crawler for email and phone extraction.

## Dependencies and requirements

Chrome and Edge extension (Manifest V3), content script, authenticated REST endpoint

## Interface behavior

A small popup with a blue 'Capture page' button and a counter of captured companies this session.

## User value

- Lets the user keep the strong professional-network filters while the tool does the tedious copying.
- Human-paced use keeps account risk much lower than automation.
- Website crawl (not the network page) supplies the actual contact data.

## Edge cases and limits

- Networks forbid automated scraping in their terms; even assisted capture may breach them. This
feature is off by default, shows a warning at first use and is the user's own responsibility.
- Network pages rarely contain emails or phones, so the value is company discovery, not contact data.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

