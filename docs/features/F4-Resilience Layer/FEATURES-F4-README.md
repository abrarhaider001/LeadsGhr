> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# F4: Resilience Layer

> **Current platform/stack override:** This is the product requirement for F4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Timeouts, redirect limits and challenge checks exist; full retry/backoff and fallback handling are missing.

**Minimum plan:** Starter  
**Priority:** P0  
**Estimated effort:** 7 developer days  
**Proposed module:** `engine/resilience.ts`

## Purpose

Handles flaky networks and tricky sites: retries with exponential backoff, timeouts, redirect loops, SSL
errors, encoding problems, JavaScript-only pages (auto escalate from HTTP to headless browser) and
memory limits on browser contexts.

## How it works

1. Wrap each fetch in a retry policy by error type.
2. If HTML lacks expected content, re-render with Playwright and wait for network idle.
3. Recycle browser contexts after N pages to control memory.
4. Record the reason for every failure in the log.

## Dependencies and requirements

p-retry, Playwright, undici

## Interface behavior

Failure reasons are grouped in the run summary (timeout 12, blocked 3, no contact page 41).

## User value

- Higher completion rate with less user attention.
- Clear failure reasons make fixes faster.

## Edge cases and limits

- Escalating to a browser costs time; cap how often it is used per run.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

