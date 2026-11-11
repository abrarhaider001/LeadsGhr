> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G7: Settings and Team

> **Current platform/stack override:** This is the product requirement for G7. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Partially implemented (desktop).

**Current coverage:** Local desktop preferences persist for Crawler, Search, and Email Validation (MAIL FROM, EHLO, session pacing); team, roles and broader organisation settings are missing.

**Minimum plan:** Explorer  
**Priority:** P1  
**Estimated effort:** 4 developer days  
**Proposed module:** `web/src/pages/Settings.tsx`

## Purpose

Account and organisation settings: speed profile, defaults, language, a fixed light theme, keyboard
shortcuts, team members and roles, notification preferences and data export.

## How it works

1. Settings are saved per user and organisation in the database.
2. Changes apply live where possible.
3. The same light-only tokens apply across web, desktop and extension; no theme switch is shown.
4. Owners invite teammates by email and assign roles (Owner, Member, Viewer); users can export or
delete their data.

## Dependencies and requirements

React, CSS variables, Supabase Postgres user_settings

## Interface behavior

Left-side settings categories with search, in a clean list layout with soft rounded cards.

## User value

- Comfortable for long working sessions on any device.
- Safe defaults for beginners, deep control for advanced users.
- Team roles keep clients' data separated inside an agency.

## Edge cases and limits

- Dangerous options (very high concurrency) sit behind an 'Advanced' toggle with a warning.
- Deleting a team member must reassign or keep their saved profiles.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

