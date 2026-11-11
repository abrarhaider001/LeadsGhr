# AGENTS.md — LeadsGhr operating contract

Rules for coding agents working in this repository. LeadsGhr is a desktop application for public business discovery, local crawling, email review, and CSV export. This file defines the working boundaries; `README.md` and `docs/DOCS_README.md` provide product and feature detail. The referenced WolfApp `AGENTS.md` supplied the 11-section structure only; its product-specific instructions do not apply here.

## 1. What the system is

| Part | Location | Runs on | Data |
| --- | --- | --- | --- |
| Desktop app | `apps/desktop/` | Electron on the user's computer and IP | Local SQLite, user-data files, CSV exports |
| React UI and shared logic | `packages/app/`, `packages/ui/`, other `packages/*` | Electron renderer or reusable TypeScript | No direct database or filesystem access from shared code |
| Account backend | `supabase/migrations/` | Supabase when account features are connected | Authentication and user/profile data only |
| Product documentation | `docs/` | Repository files | Current guides, feature status, and archived specification |

The pnpm workspace includes `apps/desktop` and `packages/*`. `apps/web`, `apps/api`, `apps/worker`, and `apps/extension` remain inactive reference code. The future Chrome extension is a separate product, not a second active app in this repository. The feature specification describes intended behavior; `docs/features/FEATURE_STATUS_README.md` distinguishes that from implemented behavior.

## 2. Environments

| Environment | How it is used | Data boundary |
| --- | --- | --- |
| Local development | `pnpm.cmd install` and `pnpm.cmd dev` from the repository root | Electron user-data directory holds preferences, SQLite, and local exports |
| Packaged desktop build | `pnpm.cmd build` when packaging is needed | Runs on the user's PC; generated output is not source and stays ignored |
| Supabase | Account authentication and profile schema, when connected | Never store extracted leads, crawl observations, queues, or exports |
| GitHub | `abrarhaider001/LeadsGhr`, with `main` as the owner's branch | Agents do not commit, push, release, or deploy |

There is no active web deployment, staging site, extension release, or automated production database workflow in this repository. Do not infer one from the historical specification or inactive app folders.

## 3. Hard rules

1. **No agent commits.** Do not run `git commit`, amend, merge, cherry-pick, rebase, or another operation that creates or rewrites commits. Leave changes in the working tree for the owner.
2. **No agent pushes.** Never push to `main`, another branch, or a tag. Do not upload repository changes through `gh`, the GitHub API, a release tool, or editor sync. A request to implement a feature does not authorize a commit or push.
3. **Do not stage by default.** Stage only if the owner specifically asks to review a staged diff. Do not discard, reset, stash, or overwrite the owner's changes.
4. **Do not expose secrets.** Keep `.env`, tokens, credentials, local databases, exports, and generated builds out of tracked files and tool output. Use names of environment variables in docs, never their values.
5. **Public data only.** Respect `robots.txt`, polite delays, and site challenges. Do not bypass captchas, log in to target sites, submit contact forms, or scrape private endpoints. Do not add external data APIs or tools; hosting, a domain, and an email sender are the allowed external services.
6. **Keep extraction local.** Extraction data, run history, and exported files belong in local SQLite or files. Supabase is for user identity and account/profile data only.
7. **No unrequested service writes.** Do not apply Supabase migrations, change a live account, send emails, or publish artifacts as part of ordinary feature work. Prepare reviewable source changes and report the action the owner must take.
8. **Use prefixed commit messages.** Every commit message must start with a lowercase type followed by a colon and a space: `feat:`, `fix:`, `chore:`, `docs:`, `update:`, `refactor:`, `test:`, `build:`, or `ci:`. Use a short imperative description after the prefix, such as `fix: prevent duplicate pipeline runs`. Choose the prefix that best describes the change; this formatting rule does not authorize a commit or push.

## 4. Source-of-truth hierarchy

When sources disagree, investigate and document the mismatch. Use this order for current behavior:

1. Running code and focused tests.
2. `packages/schemas/src/index.ts`, Electron IPC contracts, and local SQLite schema code for data behavior.
3. `pnpm-workspace.yaml`, package manifests, Electron configuration, and `supabase/migrations/` for active build and schema boundaries.
4. Current guides in `docs/` and the root `README.md` for intended user flows and design rules.
5. `docs/features/FEATURE_STATUS_README.md` for implementation status.
6. `docs/specification/` and unimplemented feature READMEs for historical requirements, not proof of current functionality.
7. Git history for background only.

Do not silently rewrite the product to match an old specification. Explain any conflict between that specification and the desktop-only direction.

## 5. Architectural boundaries

- `apps/desktop/src/main.ts` owns Electron lifecycle and IPC registration. `preload.ts` exposes a narrow bridge. Keep `contextIsolation` on, `nodeIntegration` off, and validate IPC inputs with Zod.
- `apps/desktop/src/adapters.ts`, `crawler-test.ts`, `maps-scan.ts`, `pipeline-pages.ts`, and `crawl-runs.ts` own platform-specific networking, SQLite, filesystem, browser control, and persistent run state.
- `packages/app` owns React screens and UI flow. `packages/ui` owns shared components, fonts, tokens, and styles. `packages/schemas` owns shared contracts. `packages/extract` accepts HTML strings and must remain usable without Node-only modules.
- The Crawler tab is a temporary, unsaved test. Pipeline runs and their URL queue are persisted locally and resumable. Do not conflate their state or promise that an extracted email is verified.
- Use the existing light-only theme: Instrument Sans, Monaspace Neon, the tokens in `packages/ui/src/styles.css`, and the brand assets in `public/`. Use the custom dropdown component for dropdowns. Consult `docs/theme/THEME_README.md` before changing visual behavior.
- Treat inactive web/API/worker/extension folders as reference code. Do not wire them into builds or move active behavior there without an explicit product change.

## 6. Where context lives

| Need | Read |
| --- | --- |
| Product overview and run commands | `README.md` |
| Documentation index | `docs/DOCS_README.md` |
| Current implementation status | `docs/features/FEATURE_STATUS_README.md` |
| Architecture and folder map | `docs/structure/STRUCTURE_README.md` |
| Theme, typography, motion | `docs/theme/THEME_README.md` |
| Components and icons | `docs/components/COMPONENTS_README.md`, `docs/icons/ICONS_README.md` |
| Crawler test and source modes | `docs/crawler/CRAWLER_README.md` |
| Feature requirements | Matching `docs/features/<code>-<name>/FEATURES-<code>-README.md` |
| Original 90-page specification | `docs/specification/` — historical source material |
| Active code and schemas | `apps/desktop/src/`, `packages/*/src/`, `packages/app/data/` |

## 7. Working rules

**Before editing:** inspect the call path, relevant schema, existing tests, and matching guide. Read-only `git status`, `git diff`, and `git log` are allowed. Preserve uncommitted owner work.

**Implementation:** make the smallest complete change. Keep reusable logic in shared packages and platform access in Electron main or adapters. Validate public URLs, redirects, IPC inputs, file imports, and export content at their boundaries. Do not assume placeholders in the UI represent working features.

**Testing:** run focused checks for touched packages, such as `pnpm.cmd --filter @leadsghr/app exec tsc --noEmit` or `pnpm.cmd --filter @leadsghr/desktop exec tsc --noEmit`. Run `pnpm.cmd typecheck` when a change crosses packages. Run existing targeted tests when relevant; add a test when a risky behavior or bug needs a regression check. Build or walk the Electron flow when the change depends on packaging or browser behavior. Report any check that could not run.

**Migrations and data:** write schema changes as reviewable files and validate locally. Do not apply migrations to Supabase or alter a user's real extraction database. Preserve existing data and define how new local schema fields migrate.

**Generated files:** do not edit `apps/desktop/out/`, installer output, `node_modules/`, `.turbo/`, or other ignored build artifacts as source.

## 8. The change contract

Update the matching documentation in the same working-tree change whenever behavior, schema, UI conventions, integrations, or workflow changes.

| Change | Update |
| --- | --- |
| New or changed screen | Relevant feature README and `docs/components/COMPONENTS_README.md` when the component inventory changes |
| Crawler or pipeline behavior | `docs/crawler/CRAWLER_README.md`, relevant feature README, and architecture guide as needed |
| Preference or schema change | Zod contract, persistence/load path, relevant user guide, and migration notes if local data changes |
| Theme, font, icon, or component change | `docs/theme/THEME_README.md`, `docs/icons/ICONS_README.md`, or `docs/components/COMPONENTS_README.md` as applicable |
| Feature status change | `docs/features/FEATURE_STATUS_README.md` and its feature README |
| Removed or retired behavior | Current guide plus a short explanation of what replaced it; do not leave active docs claiming it still works |
| New environment variable or external service | Root README and relevant architecture/product guide; document names and purpose only |

Keep historical specification transcriptions recognizable as historical requirements. Do not alter them merely to make current code appear complete.

## 9. Keeping context synchronized

- There is no `docs/registry.yaml`, context-audit script, or repository skill system here. Do not invent one or claim an audit ran.
- Before finishing, follow links in the affected READMEs and check that paths and user instructions still match the code.
- When an implementation changes, update the current guide and feature-status entry if its completion status changed. Keep the root README's general product summary useful, but do not turn it into a build log.
- If a documented feature is only planned or partial, say so explicitly. Record meaningful limitations where users and future agents will find them.
- Use `git diff` to inspect the working-tree change, but leave it uncommitted and unpushed.

## 10. Reusable workflows

This repository does not define local agent skills. Use these project workflows instead:

| Work | Follow |
| --- | --- |
| Feature change | Read code, feature README, status README, and design guide; implement; run focused checks; update docs |
| Bug fix | Reproduce, trace the failing path, fix the cause, add a focused regression test when useful, verify the flow |
| Crawler change | Check public-target guards, robots policy, delays, challenges, queue deduplication, source attribution, and no-saving test behavior |
| Pipeline/data change | Check SQLite schema migration, resume checkpoints, export consistency, and local-only data boundary |
| UI change | Reuse tokens/components, keep keyboard and focus behavior, verify responsive layout and empty states |
| Release handoff | Report changed files, checks, risks, and owner actions; do not commit, push, deploy, or publish |

## 11. Definition of done

A change is ready for owner review when the requested behavior is implemented; relevant checks have passed or their limits are stated; current docs and feature status are synchronized; secrets and generated files are excluded; and the final handoff names changed files, behavior, tests, and material risks. **The agent stops with uncommitted working-tree changes. The owner alone commits and pushes.**
