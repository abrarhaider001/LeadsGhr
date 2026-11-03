> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# F2: Proxy Pool Manager

> **Current platform/stack override:** This is the product requirement for F2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Platform limit:** F2 remains a specified feature, but proxy pool operation is unavailable on all three apps under the current rule allowing only hosting, a domain and an email sender as external services. Requests use the host IP on web and the user's IP on desktop/extension; blocks cause a pause.

**Status:** Not implemented (desktop).

**Current coverage:** No proxy pool manager.

**Minimum plan:** Professional  
**Priority:** P1  
**Estimated effort:** 7 developer days  
**Proposed module:** `engine/proxies.ts`

## Purpose

The platform keeps a managed pool of proxies (datacenter and optional residential) and rotates them by
rules: per domain, per N requests or on error. Health checks remove dead proxies. Plans decide which
pool a customer's runs may use; Agency customers can also add their own proxies. Running with no proxy
is possible for low-risk, low-volume work.

## How it works

1. Admin imports provider proxies in the Admin console; Agency users can add their own on the Proxies
page.
2. The manager tests each proxy for speed, anonymity and country.
3. The pool assigns a proxy per source session with sticky rules and country matching.
4. Bad proxies are cooled down or retired automatically.

## Dependencies and requirements

undici ProxyAgent, Playwright proxy options

## Interface behavior

Admin: table of proxies with latency bars and status dots. Agency users: a simple 'Bring your own proxies'
page.

## User value

- Spreads load across IPs and reduces rate-limit hits, which matters a lot when all traffic comes from a
cloud server.
- Country matching gives local results.
- Cost can be controlled per plan.

## Edge cases and limits

- Proxies must not be used to evade explicit blocks; the engine stops for a domain that returns a clear
denial.
- Residential proxy traffic is paid per gigabyte; meter it and cap it per plan.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

