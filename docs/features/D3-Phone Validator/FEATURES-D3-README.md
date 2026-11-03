> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# D3: Phone Validator

> **Current platform/stack override:** This is the product requirement for D3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Telephone parsing validates extracted tel links; a full number-validation workflow and flags are missing.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 3 developer days  
**Proposed module:** `quality/phone_validate.ts`

## Purpose

Validates numbers against national numbering plans, flags possible and impossible numbers and marks
toll-free or premium lines.

## How it works

1. Run is_possible and is_valid checks.
2. Detect type and carrier region where available offline.
3. Flag premium or special numbers.
4. Set a status and reason string.

## Dependencies and requirements

libphonenumber-js

## Interface behavior

Phone cell shows a small check or warning icon with a tooltip.

## User value

- Fewer wrong numbers in the call list.
- Type detection supports SMS or call campaigns.

## Edge cases and limits

- Offline validation cannot prove a line is active; label it 'format valid'.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

