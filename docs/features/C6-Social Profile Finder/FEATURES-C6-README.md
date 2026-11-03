> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C6: Social Profile Finder

> **Current platform/stack override:** This is the product requirement for C6. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Common social links are found in page anchors; structured sameAs and full platform coverage are missing.

**Minimum plan:** Explorer  
**Priority:** P1  
**Estimated effort:** 3 developer days  
**Proposed module:** `extract/social.ts`

## Purpose

Collects links to public social and professional profiles from company pages: LinkedIn, Facebook,
Instagram, X, YouTube, plus review and directory profile links.

## How it works

1. Scan anchors and structured data (sameAs) for known social domains.
2. Strip tracking parameters and normalise to canonical URLs.
3. Validate format (company page vs personal profile).
4. Attach to lead and optionally queue for B6.

## Dependencies and requirements

cheerio, tldts

## Interface behavior

Small grey network icons next to the company name; they turn blue on hover and show the URL.

## User value

- Gives the user extra contact routes beyond email.
- Feeds the social page reader.
- Useful for outreach research.

## Edge cases and limits

- Personal profile URLs should be ignored by default to limit personal data.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

