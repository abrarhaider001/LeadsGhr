> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# X6: Quick Verify

> **Current platform/stack override:** This is the product requirement for X6. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Deferred (separate future Chrome extension).

**Current coverage:** This extension feature is outside the current desktop application.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 4 developer days  
**Proposed module:** `extension/src/verify/`

## Purpose

Checks email syntax and phone format locally. Because a browser cannot do DNS lookups, the domain
and MX check is done by your own Node API, which also holds the disposable-domain list.

## How it works

1. Syntax and phone format checks run instantly in the browser.
2. Domains are sent in batches of up to 50 to the /verify endpoint of your own API.
3. The API returns Valid, Risky, Invalid or Unknown with a reason.
4. Badges update in the lead list.

## Dependencies and requirements

libphonenumber-js, own Node endpoint /verify (MX lookup and disposable-domain list)

## Interface behavior

Status badges: Valid (blue check), Risky (grey outline), Invalid (graphite cross), Unknown (silver dot).

## User value

- Fewer bounces without any external verification service.
- Keeps your verification logic in one place for web and extension.

## Edge cases and limits

- Needs a signed-in account so abuse of the endpoint can be limited by plan.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

