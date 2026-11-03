> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G2: Live Run Console

> **Current platform/stack override:** This is the product requirement for G2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Crawler activity and Maps result streaming exist; full run progress, speed and ETA console are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 5 developer days  
**Proposed module:** `web/src/pages/Run.tsx`

## Purpose

Real-time view of an active run: progress bar by cells, leads found, emails and phones found, speed, ETA,
current source and recent leads stream.

## How it works

1. Workers write progress events and counters to Supabase.
2. Supabase Realtime pushes the changes to the open run page.
3. The page batches updates every 500 ms; the user can pause, resume, stop or change speed.
4. On finish a summary card and the Download button appear.

## Dependencies and requirements

Supabase Realtime (or Server-Sent Events from the Node API), React

## Interface behavior

Large circular progress ring in blue on a light grey track, counters in black, warnings as grey banners.

## User value

- Confidence that the tool is working.
- Immediate control over speed and risk.

## Edge cases and limits

- Throttle UI updates so the page stays smooth at high rates.
- The page must recover after a refresh or a lost connection by reloading the run state from the API.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

