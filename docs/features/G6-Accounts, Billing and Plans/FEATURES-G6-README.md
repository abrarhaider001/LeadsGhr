> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G6: Accounts, Billing and Plans

> **Owner decision (2026-11-20): license keys instead of accounts.** LeadsGhr will not have sign-up, email verification, plans, or billing. The owner generates license keys in Supabase; each key can be activated once for the desktop app, once for LeadsGhr Mailer, once for LeadsGhr Tracker, and once for each future extension, and expires on a set date. The license-key screen is the entry point of every product (after the splash screen on desktop), the activated key is stored encrypted locally, and each start re-validates it. The rule is in [AGENTS.md](../../../AGENTS.md) ("License keys"), and the user guide is in the root README ("License keys"). Implemented on 2026-11-20 (`packages/license`, `supabase/functions/license`, migration `0005_license_keys.sql`); the sign-up and billing text below is the original specification and is superseded.

> **App mode (2026-11-24):** `LEADSGHR_MODE` in the repository's `.env` is `production` (default, license keys required) or `local` (license keys off for development and testing): the desktop app honours `local` only when run with `pnpm dev` (never an installed copy), and the extensions when they are built (their ZIPs committed in the repository are never replaced by such a build). See AGENTS.md, "License keys".

> **Current platform/stack override:** This is the product requirement for G6. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Service limit:** Use email account sign-in and manual invoice approval. Third-party OAuth and payment gateways remain unavailable under the current external-service rule; the older examples below are historical.

**Status:** Partially implemented (desktop).

**Current coverage:** Local editable profile exists; Supabase account flow, billing, seats and password reset are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 12 developer days  
**Proposed module:** `api/auth.ts and api/billing.ts`

## Purpose

Sign-up, email verification, organisations with seats, plans and quotas, all on Supabase Auth and
Postgres. Because no external payment tool is used, payments are approved by hand in the admin panel:
the customer pays by bank transfer or any local method you accept, you mark the invoice paid, and the
plan turns on instantly. A payment gateway can be added later without changing the design.

## How it works

1. User signs up with email or OAuth; Supabase Auth sends the verification mail.
2. User picks a plan and presses 'Request upgrade'; an invoice with payment instructions is created.
3. After the money arrives, an admin marks the invoice paid; plan, seats, quota and expiry update in
Postgres.
4. Every run, export, extension sync and extension scan checks the plan and quota on the server; usage
counters reset each month.

## Dependencies and requirements

Supabase Auth (email and OAuth), Row Level Security, Node API, manual payment approval in the admin
panel, Supabase Postgres

## Interface behavior

Plan badge in the top bar and a Billing page with usage meters, invoices, payment instructions and a
friendly 'Upgrade' sheet that explains what a locked feature does.

## User value

- No fees to a payment processor and no third-party dependency.
- Plan changes apply instantly after approval.
- Server-side limits cannot be bypassed from the browser or the extension.

## Edge cases and limits

- Manual approval does not scale past a few hundred customers; plan to add a gateway later.
- Expired plans: 7-day grace period, then downgrade to Explorer; never delete data immediately.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

