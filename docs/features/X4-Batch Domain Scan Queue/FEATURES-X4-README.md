> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X4: Batch Domain Scan Queue

> **Current platform/stack override:** This is the product requirement for X4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 6 developer days  
**Proposed module:** `extension/src/queue/`

## Purpose

The user pastes a list of domains, or selects captured leads, and the extension scans them one by one
with polite delays. It runs while the browser is open and is the lightweight cousin of the server crawler.

## How it works

1. User pastes domains or selects captured leads and presses 'Scan all'.
2. The queue is stored in chrome.storage; an alarm wakes the service worker every minute.
3. One domain at a time (default), 3 to 6 seconds between requests; pause, resume and stop buttons
are always visible.
4. Results are saved to the local list; failures are listed with a reason.

## Dependencies and requirements

chrome.alarms, chrome.storage, offscreen document, p-limit

## Interface behavior

Queue tab with a list, status icons (waiting, scanning, done, failed) and a daily quota meter.

## User value

- Small batches without needing the website or a server.
- Free for you to run, because it uses the user's machine.
- Good bridge between capture on listing pages and the full web app.

## Edge cases and limits

- The browser must stay open; for bigger jobs the panel offers 'Send to web app'.
- Daily caps by plan stop heavy use from the extension.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

