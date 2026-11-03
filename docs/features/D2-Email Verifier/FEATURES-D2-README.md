> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D2: Email Verifier

> **Current platform/stack override:** This is the product requirement for D2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No domain/MX, disposable, catch-all or SMTP verification workflow.

**Minimum plan:** Starter  
**Priority:** P0  
**Estimated effort:** 7 developer days  
**Proposed module:** `quality/email_verify.ts`

## Purpose

Checks syntax, domain existence, MX records, disposable domains, catch-all behaviour and (optionally) a
gentle SMTP handshake without sending mail. Produces a status: Valid, Risky, Invalid or Unknown.

## How it works

1. Syntax check and domain normalisation.
2. DNS lookup for MX and fallback A records with caching.
3. Optional SMTP RCPT check using a fixed sender, strict rate limits and stop on greylist.
4. Catch-all test with a random address; mark results as Risky if the server accepts all.

## Dependencies and requirements

node:dns/promises, node:net (SMTP handshake), own disposable-domain list

## Interface behavior

Status icons with text in the table: Valid (blue filled), Risky (grey outline), Invalid (black cross), Unknown
(light grey dot).

## User value

- Cuts bounce rates before outreach.
- Runs on your own workers with no per-check fee.
- Status labels are easy to filter.

## Edge cases and limits

- Many mail hosts block SMTP probes, and many cloud providers block outbound port 25; fall back to
MX-only and say so.
- Frequent probing can hurt your server IP reputation; use a dedicated low-rate IP and conservative
defaults.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

