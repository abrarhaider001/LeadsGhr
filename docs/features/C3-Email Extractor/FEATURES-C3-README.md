> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C3: Email Extractor

> **Current platform/stack override:** This is the product requirement for C3. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Page text and mailto email extraction work; obfuscation and structured-data extraction are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 6 developer days  
**Proposed module:** `extract/emails.ts`

## Purpose

Finds email addresses in page text, mailto links, JSON-LD and common obfuscations such as 'name [at]
domain [dot] com', HTML entities, split spans and simple JavaScript string joins. Results are classified as
generic (info@, sales@), role based (estimating@) or personal.

## How it works

1. Normalise HTML: decode entities, strip zero-width characters.
2. Run regex over text, mailto hrefs and attribute values.
3. Run deobfuscation rules and a small JS-string pattern reader.
4. Classify, de-duplicate, and attach page URL and timestamp as source.

## Dependencies and requirements

regex, validator (syntax only), he (HTML entities)

## Interface behavior

Lead table shows email chips: blue for role or generic, grey for personal, black with strike-through for failed
verification.

## User value

- Captures emails that simple scrapers miss.
- Classification helps choose safe outreach targets and respect privacy rules.
- Source URL gives proof of public availability.

## Edge cases and limits

- Reject image filenames and placeholder emails (example@, name@domain.com).
- Cloud-protected email scripts that need a decoding secret from the page are decoded only if the
algorithm is public and local.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

