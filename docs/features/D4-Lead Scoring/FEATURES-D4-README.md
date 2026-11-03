> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D4: Lead Scoring

> **Current platform/stack override:** This is the product requirement for D4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** A simple quickScore utility exists; the specified weighted lead scoring is not wired into the lead workflow.

**Minimum plan:** Professional  
**Priority:** P1  
**Estimated effort:** 6 developer days  
**Proposed module:** `quality/scoring.ts`

## Purpose

Gives every lead a 0 to 100 score from transparent rules: has verified email, has phone, website quality,
niche match strength, location match, size hint, rating and recency. Weights are editable.

## How it works

1. Compute sub-scores from stored fields.
2. Apply weights from the active scoring profile.
3. Sum and normalise to 0 to 100.
4. Store a short 'why' explanation for each score.

## Dependencies and requirements

plain TypeScript, JSON rules

## Interface behavior

Score ring in blue; hover shows breakdown bars.

## User value

- Sort and call the best leads first.
- Transparent rules build trust.
- Different profiles for different campaigns.

## Edge cases and limits

- Scores must be recomputed when fields change; keep it event driven.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

