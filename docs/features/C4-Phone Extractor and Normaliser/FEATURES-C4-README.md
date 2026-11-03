> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# C4: Phone Extractor and Normaliser

> **Current platform/stack override:** This is the product requirement for C4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** tel links are parsed with libphonenumber-js; body-text phone extraction and type classification are missing.

**Minimum plan:** Explorer  
**Priority:** P0  
**Estimated effort:** 5 developer days  
**Proposed module:** `extract/phones.ts`

## Purpose

Extracts phone numbers from text and tel links, then normalises them to international E.164 form using the
target country as a hint. Type detection (mobile, landline, toll-free) is added where the numbering plan
allows.

## How it works

1. Find candidate numbers by regex with tolerant separators.
2. Parse each with the phonenumbers library using the region hint.
3. Reject invalid or too short numbers and typical non-phone digit strings (dates, zip codes).
4. Store E.164, national format and detected type.

## Dependencies and requirements

libphonenumber-js (offline), regex

## Interface behavior

Phone cells display national format with a small flag; click copies E.164.

## User value

- Consistent format makes calling and CRM import easy.
- Offline library has no cost or limit.
- False positives drop sharply compared with raw regex.

## Edge cases and limits

- Local numbers without country context are ambiguous; use the lead's country field.
- Extensions ('ext. 12') should be preserved in a separate field.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

