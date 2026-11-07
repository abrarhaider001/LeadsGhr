> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D2: Email Verifier

> **Current platform/stack override:** This is the product requirement for D2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partial (desktop).

**Current coverage:** Email Validation runs a local SMTP RCPT TO probe (Method 4) after MX/A lookup. Syntax failures and missing MX are marked Invalid. Accepted RCPT replies are Valid; greylist/temporary replies are Unknown; some limit replies are Risky. Disposable screening, dedicated catch-all testing, and MX-only product modes are not claimed yet.

**Minimum plan:** Starter  
**Priority:** P0  
**Estimated effort:** 7 developer days  
**Active modules:** `packages/quality/src/email-verify.ts` (reply classification), `apps/desktop/src/email-verify.ts` (DNS + SMTP + IPC), `packages/app/src/email-validation-page.tsx`

## Purpose

Checks whether a receiving mail server appears to accept a recipient address, without sending mail. Produces a status: Valid, Risky, Invalid or Unknown. Full historical D2 also asked for disposable and catch-all workflows; those remain future work.

## How it works (current desktop)

1. Import or paste addresses on Email Validation (same local file helpers as Email Filtering).
2. Electron main resolves MX records (A / OS lookup fallback) for the domain. If the local stub resolver refuses Node DNS queries, it retries against public resolvers (8.8.8.8 / 1.1.1.1).
3. Connects to the receiving host on port 25, issues EHLO/HELO, `MAIL FROM` with a fixed non-sending identity, then `RCPT TO` for the address, then `QUIT` (no DATA).
4. Classifies the SMTP reply into Valid / Risky / Invalid / Unknown and streams results to the UI.
5. Caps a run at 50 addresses with a polite delay between checks. Stop cancels the active job.

## Dependencies and requirements

node:dns/promises, node:net (SMTP handshake) in Electron main; Zod IPC contracts in `@leadsghr/schemas`; pure classification helpers in `@leadsghr/quality`

## Interface behavior

Email Validation reuses the Email Filtering two-panel layout. Result statuses: Valid (blue), Risky (grey outline), Invalid (dark), Unknown (light grey). Copy and CSV export cover the visible filter.

## User value

- Cuts obvious bounce risk before outreach when SMTP probing is allowed on the network.
- Runs on the user's computer with no per-check fee.
- Status labels are easy to filter.

## Edge cases and limits

- Many mail hosts block SMTP probes, and many networks block outbound port 25; those checks stay Unknown and say so.
- Accepted RCPT TO is not a delivery guarantee and does not prove the mailbox is monitored.
- Catch-all domains can make Invalid rare; catch-all detection is not implemented yet.
- Frequent probing can hurt IP reputation; defaults stay low-rate and small-batch.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)
