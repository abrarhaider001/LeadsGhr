> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# F1: Job Queue and Scheduler

> **Current platform/stack override:** This is the product requirement for F1. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** A local queue adapter can enqueue jobs; persistent scheduling and worker controls are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 8 developer days  
**Proposed module:** `engine/queue.ts`

## Purpose

A persistent queue of small jobs (one geo cell on one source, or one domain crawl) processed by separate
worker containers. Jobs survive restarts and deploys, can be paused, resumed, prioritised and scheduled.
A fairness layer stops one customer from using all workers.

## How it works

1. Starting a run creates jobs in the pg-boss queue, which is stored inside Postgres (no Redis needed).
2. Workers pull jobs by priority with per-source, per-domain and per-organisation concurrency limits.
3. Failed jobs retry with backoff up to a limit, then move to a Failed list.
4. The scheduler creates new runs at set times and resumes unfinished ones after a deploy.

## Dependencies and requirements

pg-boss (job queue stored in Postgres), pg-boss schedules, Supabase Postgres

## Interface behavior

Run page with Pause, Resume and Stop buttons plus a queue position and progress gauge.

## User value

- Large runs become safe and resumable.
- Schedules enable weekly refreshes.
- Granular jobs make blocking easier to handle.

## Edge cases and limits

- Idempotency is vital; a repeated job must not create duplicate leads.
- Per-domain limits must be global across all customers (a small gate table in Postgres enforces it) so
two users cannot hammer the same website.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

