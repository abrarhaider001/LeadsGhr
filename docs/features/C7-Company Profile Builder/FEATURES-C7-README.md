> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C7: Company Profile Builder

> **Current platform/stack override:** This is the product requirement for C7. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No company profile synthesis.

**Minimum plan:** Starter  
**Priority:** P1  
**Estimated effort:** 8 developer days  
**Proposed module:** `extract/profile.ts`

## Purpose

Summarises what the company does using only text from its own public pages: services list, specialties
(for example 'MEP takeoff', 'roofing'), software mentioned, regions served, size hints (team count, years)
and a short auto-generated description made by simple extraction, not by an external AI service.

## How it works

1. Collect text from home, about and services pages.
2. Extract headings and list items that look like services.
3. Score niche keywords with TF-IDF to detect specialties.
4. Detect size hints with patterns such as 'team of 25' or 'since 2008'.

## Dependencies and requirements

cheerio, natural (TF-IDF), Fuse.js

## Interface behavior

A 'Profile' tab with specialty tags and a one-paragraph summary.

## User value

- Allows filtering by real services, not only by category.
- Helps personalise outreach.
- Everything runs offline.

## Edge cases and limits

- Summaries are extractive; mark them 'auto-generated' and keep the source page link.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

