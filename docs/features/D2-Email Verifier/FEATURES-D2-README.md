> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D2: Email Verifier

> **Current platform/stack override:** This is the product requirement for D2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partial (desktop).

**Current coverage:** Email Validation runs a local multi-step pipeline: syntax, domain DNS, MX (including null MX), disposable detection, role-based detection, catch-all probing, and SMTP RCPT TO. Work is parallelized across DNS lookups and primary MX hosts. Results include per-check flags and a confidence score. Valid/Invalid cache locally for 7 days. Ownership OTP, Redis/PostgreSQL bulk SaaS workers, and paid provider APIs are out of scope for the desktop app.

**Minimum plan:** Starter  
**Priority:** P0  
**Estimated effort:** 7 developer days  
**Active modules:** `packages/quality/src/email-verify/`, `packages/quality/src/disposable-domains.ts`, `apps/desktop/src/email-verify.ts`, `apps/desktop/src/email-verify/`, `packages/app/src/email-validation-page.tsx`

## Purpose

Checks whether an address appears technically deliverable without sending mail. Returns Valid, Risky, Invalid, or Unknown, plus individual check results and a heuristic confidence score.

## How it works (current desktop)

1. Import or paste addresses on Email Validation.
2. Preflight outbound port 25; stop immediately if blocked.
3. Normalize syntax; resolve domain and MX in parallel across domains.
4. Flag disposable and role-based addresses from local lists.
5. Group remaining work by primary MX host; one SMTP connection per host with proactive STARTTLS when advertised, pacing, and a connect breaker.
6. Probe catch-all once per domain; if a random mailbox is accepted, remaining addresses on that domain are marked Risky without extra RCPT noise. Classify status from verification signals first, then clamp a heuristic deliverability score into that status band. Unroutable MAIL FROM identities fail fast with a Preferences hint.
7. Stream results to the UI. Click a row for the check breakdown. Retry Unknown re-runs greylist/timeout/unreachable/needs_tls rows.

## Status and score

Status is a business decision from signals; the score never reclassifies it.

| Condition | Status |
| --- | --- |
| Syntax, domain, or MX failed | Invalid |
| SMTP rejected | Invalid |
| Disposable domain | Risky |
| Catch-all domain | Risky |
| Mailbox full | Risky |
| SMTP accepted with no disposable/catch-all flags | Valid |
| SMTP temporary, blocked, unverifiable, or skipped | Unknown |

Role-based addresses keep their SMTP-driven status and only apply a score penalty; they are not auto-Risky or Invalid. Accepted RCPT TO is not proof of inbox ownership or final delivery—especially on catch-all domains.

Score weights: base 45; SMTP accepted +40, temporary +10, unverifiable/skipped +8, blocked +5, rejected capped at 15; disposable −40, catch-all −40, role-based −15. After status is set, the score is clamped: Valid 85–100, Risky 25–60, Unknown 10–55, Invalid 0–20. Those ranges overlap on purpose and are clamps, not classifiers.

## Dependencies and requirements

node:dns/promises, node:net, node:tls in Electron main; Zod IPC contracts in `@leadsghr/schemas`; pure pipeline helpers in `@leadsghr/quality`

## Interface behavior

Two-panel layout with parallel mail servers control, status filters, score column, modal check detail for a selected row, copy/CSV, and Retry Unknown.

## User value

- Multi-signal verification instead of a single SMTP answer.
- Policy blocks and hidden providers stay Unknown instead of deleting good leads.
- Catch-all and disposable addresses surface as Risky; role-based is flagged in checks without forcing status.

## Edge cases and limits

- Port 25 is often blocked on home/office networks; preflight reports that once.
- Accepted RCPT TO is not proof of inbox ownership or final delivery.
- Outlook, Yahoo, and some gateways stay Unknown / provider_unverifiable.
- Confidence is a local heuristic, not a statistical guarantee.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)
