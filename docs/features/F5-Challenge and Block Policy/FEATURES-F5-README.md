> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# F5: Challenge and Block Policy

> **Current platform/stack override:** This is the product requirement for F5. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Challenges cause a pause; comprehensive per-source block policy is missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 4 developer days  
**Proposed module:** `engine/challenge.ts`

## Purpose

Detects captchas, login walls and 'unusual traffic' pages and responds by pausing, not by bypassing. In a
web app the user cannot solve a challenge in the server's browser, so the source is paused and cooled
down, the user is notified, and they can choose to skip it or retry later.

## How it works

1. Detect a challenge by known markers and HTTP codes (403, 429, 503 with challenge text).
2. Pause the source for that run and send an in-app notification and optional email.
3. After the cool-down the engine retries at a much slower rate.
4. If it repeats, the source is skipped for the run and the failure reason is logged.

## Dependencies and requirements

Playwright, Supabase Realtime, in-app notifications

## Interface behavior

A light grey banner on the run page with a blue button: 'Source paused - verification needed. Retry later /
Skip source'.

## User value

- Avoids IP bans for you and legal risk linked to circumvention.
- Keeps users informed.
- Slower but sustainable data collection.

## Edge cases and limits

- Do not integrate captcha-solving services or evasion tricks; this is a deliberate product boundary.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

