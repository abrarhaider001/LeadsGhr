> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# G4: Outreach Segments and Templates

> **Current platform/stack override:** This is the product requirement for G4. The active implementation uses TypeScript/React/Node, pnpm/Turborepo, shared Zod schemas and platform adapters. Any older module path, vendor, color or two-product assumption below is historical and is superseded by [architecture](../../structure/STRUCTURE_README.md), [theme](../../theme/THEME_README.md) and [platform coverage](../../platforms/PLATFORMS_README.md). Feature intent and public-data rules remain in force.

**Status:** Not implemented (desktop).

**Current coverage:** No outreach segmentation or template workflow.

**Minimum plan:** Professional  
**Priority:** P2  
**Estimated effort:** 6 developer days  
**Proposed module:** `web/src/pages/Outreach.tsx`

## Purpose

Builds lists (segments) from filters and prepares mail-merge ready exports with personalised fields. The
tool does not send email itself; it exports to the user's own mail or CRM tool.

## How it works

1. User saves a filter as a segment, for example 'MEP estimators with verified email, score over 70'.
2. Writes a template with merge fields such as {company} and {city}.
3. Preview shows five sample rows rendered.
4. Export produces a mail-merge file and keeps a log of who was exported.

## Dependencies and requirements

Handlebars, Supabase Postgres segments

## Interface behavior

Two-pane editor: template on the left, live preview on the right.

## User value

- Closes the loop from data to outreach.
- No sending keeps legal and reputation risk with the user's chosen platform.

## Edge cases and limits

- Warn if a segment contains personal emails in regulated regions.

## Related requirements

- [Feature catalogue](../../specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md)
- [Full detailed specification](../../specification/feature-specifications/SPECIFICATION-FEATURE-SPECIFICATIONS-README.md)

