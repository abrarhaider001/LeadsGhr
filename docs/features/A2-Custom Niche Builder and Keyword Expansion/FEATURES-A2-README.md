> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# A2: Custom Niche Builder and Keyword Expansion

> **Current platform/stack override:** This is the product requirement for A2. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Custom niches can be added and selected; local synonym expansion is missing.

**Minimum plan:** Starter  
**Priority:** P0  
**Estimated effort:** 5 developer days  
**Proposed module:** `core/niche/builder.ts`

## Purpose

Lets the user type any niche in plain words and expands it into a full keyword pack without calling any
external API. Expansion uses a local synonym dictionary, plural and stem rules, a service-phrase template
list and optional n-gram mining from websites the tool has already crawled.

## How it works

1. User types a niche, for example 'steel estimating services'.
2. Tool generates variants: synonyms, plural forms, 'services', 'company', 'consultants', 'near me' style
patterns.
3. Tool proposes negative keywords such as 'jobs', 'course', 'salary', 'software'.
4. User accepts, edits or drops chips; the pack can be saved as a new library niche.

## Dependencies and requirements

fastest-levenshtein or Fuse.js, natural (offline NLP), Supabase Postgres

## Interface behavior

A single text field; chips animate in below it. Each chip has a small x and a drag handle for priority.

## User value

- Works for any industry, not only estimation, which makes the tool a true all-rounder.
- Negative keywords remove job boards and training sites early and save crawl time.
- Mined phrases improve with use because every crawl adds vocabulary.

## Edge cases and limits

- Very short or ambiguous niches (for example 'steel') are flagged with a warning and a suggestion to
add context.
- Non-English niches need an optional language pack; ship English first.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

