> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# A6: Dry Run and Yield Estimator

> **Current platform/stack override:** This is the product requirement for A6. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No sampling-based yield estimator.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 4 developer days  
**Proposed module:** `core/estimator/dryrun.ts`

## Purpose

Before the full run the tool samples a few cells and sources, then predicts how many leads, emails and
phones to expect, how long the run will take and how many requests it will make.

## How it works

1. User presses 'Estimate'.
2. The engine runs a small sample (for example 5 cells, 20 sites) with the real pipeline.
3. Hit rates for email, phone and address are measured and extrapolated to the full area.
4. A summary card shows expected leads, time, proxy usage and risk level.

## Dependencies and requirements

Supabase Postgres, plain TypeScript statistics

## Interface behavior

A summary card with big black numbers, grey labels and a risk badge: Low (blue outline), Medium (grey
fill), High (black fill with white text).

## User value

- Prevents long runs that would produce little value.
- Helps pick the right plan or quota before starting.
- Early risk warning reduces blocks.

## Edge cases and limits

- Samples can mislead in uneven areas; show a confidence range, not one number.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

