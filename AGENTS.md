# AGENTS.md — LeadsGhr operating contract

Rules for coding agents working in this repository. LeadsGhr is a desktop application for public business discovery, local crawling, email review, and CSV export. This file defines the working boundaries; `README.md` and `docs/DOCS_README.md` provide product and feature detail. The referenced WolfApp `AGENTS.md` supplied the 11-section structure only; its product-specific instructions do not apply here.

## 1. What the system is

| Part | Location | Runs on | Data |
| --- | --- | --- | --- |
| Desktop app | `apps/desktop/` | Electron on the user's computer and IP | Local SQLite and data files in `C:\LeadsGhr\data`, CSV exports |
| React UI and shared logic | `packages/app/`, `packages/ui/`, other `packages/*` | Electron renderer or reusable TypeScript | No direct database or filesystem access from shared code |
| LeadsGhr Tracker (Gmail tracking extension) | `apps/extension/` | Chrome Manifest V3 | Message metadata in Chrome storage; opaque pixel counts in optional public service |
| LeadsGhr Mailer (Gmail sending extension) | `apps/mailer-extension/` | Chrome Manifest V3 | Saved templates and preferences as files in its `data` folder; recipients and campaign state in Chrome storage only |
| Account and tracking backend | `supabase/migrations/`, `supabase/functions/` | Supabase when deployed | Identity/profile data and opaque mail-tracking tokens/counts; the public `assets` storage bucket holds only public files such as images shown in outgoing emails, in purpose folders (`email-assets/`) |
| Product documentation | `docs/` | Repository files | Current guides, feature status, and archived specification |

The pnpm workspace includes `apps/desktop`, `apps/extension`, `apps/mailer-extension`, and `packages/*`. `apps/web`, `apps/api`, and `apps/worker` remain inactive reference code. `apps/extension` is LeadsGhr Tracker, the Gmail open-tracking companion; `apps/mailer-extension` is LeadsGhr Mailer, which only sends saved templates through the user's Gmail session (its templates and preferences are files in its `data` folder, its recipients and message bodies stay in Chrome storage). They are separate extensions. Other original extension features (such as manual email extraction) remain future work. The feature specification describes intended behavior; `docs/features/FEATURE_STATUS_README.md` distinguishes that from implemented behavior.

## 2. Environments

| Environment | How it is used | Data boundary |
| --- | --- | --- |
| Local development | `pnpm.cmd install` and `pnpm.cmd dev` from the repository root | `C:\LeadsGhr\data` holds SQLite, `preferences.json`, `search-criteria.json`, and `profile.json` (`apps/desktop/src/data-folder.ts`; `LEADSGHR_DATA_DIR` overrides it, and the first start copies older data from `%APPDATA%\@leadsghr\desktop`); CSV exports go to `C:\LeadsGhr\exports` the extension ZIPs to `C:\LeadsGhr\extensions`, and exported preference files to `C:\LeadsGhr\settings` (`apps/desktop/src/paths.ts`) |
| Chrome extension builds | `pnpm.cmd build:extension` (Tracker) and `pnpm.cmd build:mailer-extension` (Mailer) from the repository root | `C:\LeadsGhr\extensions` holds each extension's ZIP and its extracted, ready-to-load folder side by side (`leadsghr-tracker.zip` and `leadsghr-tracker\`, `leadsghr-mailer.zip` and `leadsghr-mailer\`); each extension's user data lives in that folder's `data\` subfolder |
| Packaged desktop build | `pnpm.cmd build` when packaging is needed | Runs on the user's PC; generated output is not source and stays ignored |
| Desktop releases | `.github/workflows/release.yml` on every push to `main` | Builds the unsigned Windows installer on GitHub Actions and publishes a GitHub Release (`v0.1.<run number>`: the branded setup `LeadsGhr-Setup.exe` from `apps/desktop/setup/`, plus `LeadsGhr-Installer.exe`, the app package `LeadsGhr-App-x64.nsis.7z`, and `latest.yml`, which setup and auto-update download; uninstalling opens the branded window from `apps/desktop/setup/LeadsGhrUninstall.cs`, which keeps `C:\LeadsGhr` unless the user ticks **Also delete my LeadsGhr data**); a push to `main` therefore publishes a downloadable release that installed copies (0.1.3+) download and offer to install automatically |
| Supabase | Account profile schema, optional mail tracking endpoint, and (planned) license keys with their activations | Never store extracted leads, crawl observations, queues, exports, message recipients, or subjects |
| GitHub | `abrarhaider001/LeadsGhr`, with `main` as the owner's branch | Agents commit completed work; pushing (which can trigger the Supabase deploy), releasing, and deploying require the owner's explicit approval |

There is no active web deployment, staging site, or Chrome Web Store extension release in this repository; desktop installers are published as GitHub Releases from `main`. Do not infer one from the historical specification or inactive app folders. The owner added `.github/workflows/supabase-deploy.yml`: when a commit the owner pushes to any branch changes `supabase/migrations/`, `supabase/functions/`, or `supabase/config.toml`, GitHub Actions applies pending migrations and deploys Edge Functions to the hosted Supabase project. There is only one hosted project, so the latest push from any branch is what runs live. Treat every migration as a live-database change: keep it additive and idempotent, and never weaken the data boundary in rule 6.

## 3. Hard rules

1. **Agents commit their own work.** After a change is complete and its checks have run, commit it on the current branch with a prefixed message (rule 8) without waiting to be asked. Commit only the agent's own change; do not amend, merge, cherry-pick, rebase, or otherwise rewrite existing commits unless the owner asks.
2. **Pushing requires the owner's approval.** Never push to `main`, another branch, or a tag without the owner's explicit approval for that push. Do not upload repository changes through `gh`, the GitHub API, a release tool, or editor sync without that approval. A request to implement a feature, or approval of an earlier push, does not authorize a new push. A push that changes `supabase/` deploys to the live Supabase project (see section 2).
3. **Stage deliberately.** Stage files by explicit path for the agent's own commit. Never stage secrets, `.env` files, local databases, exports, `supabase/.temp/`, build output, or unrelated owner work such as untracked extracted extension folders. Do not discard, reset, stash, or overwrite the owner's changes.
4. **Do not expose secrets.** Keep `.env`, tokens, credentials, local databases, exports, and generated builds out of tracked files and tool output. Use names of environment variables in docs, never their values.
5. **Public data only.** Respect `robots.txt`, polite delays, and site challenges. Do not bypass captchas, log in to target sites, submit contact forms, or scrape private endpoints. Do not add external data APIs or tools; hosting, a domain, and an email sender are the allowed external services.
6. **Keep extraction local.** Extraction data, run history, and exported files belong in local SQLite or files. Supabase may hold identity/profile data and opaque mail-tracking tokens and image-load counts; never send extracted leads, recipients, subjects, or message content there.
7. **No unrequested service writes.** Do not apply Supabase migrations, change a live account, send emails, or publish artifacts as part of ordinary feature work. Prepare reviewable source changes and report the action the owner must take.
8. **Use prefixed commit messages.** Every commit message must start with a lowercase type followed by a colon and a space: `feat:`, `fix:`, `chore:`, `docs:`, `update:`, `refactor:`, `test:`, `build:`, or `ci:`. Use a short imperative description after the prefix, such as `fix: prevent duplicate pipeline runs`. Choose the prefix that best describes the change; this formatting rule does not authorize a push.
9. **Name branches by type.** Use lowercase words joined by hyphens after a type prefix: `feature/<name>` for new features (for example `feature/email-sending`), `fix/<name>` for bug fixes, `hotfix/<name>` for urgent fixes to `main`, `docs/<name>` for documentation only, and `chore/<name>` for tooling, dependencies, or cleanup. Create `feature/`, `fix/`, `docs/`, and `chore/` branches from the latest `staging`, and `hotfix/` branches from `main`. `main` holds releases and `staging` is the shared integration branch; do not rename either. Delete a branch once its pull request is merged.

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
- Treat inactive web/API/worker folders as reference code. The user explicitly activated `apps/extension` (LeadsGhr Tracker) for Gmail open tracking and `apps/mailer-extension` (LeadsGhr Mailer) for sending; they are separate extensions. Keep tracking metadata in Chrome storage and the public pixel store limited to opaque tokens and image-load counts.

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

**Every table has an `id` column:** each new Supabase table (and each new local SQLite table) gets an `id` column, normally `id uuid primary key default gen_random_uuid()` in Supabase. When uniqueness depends on other columns (for example one activation per key and product), keep `id` as the primary key and enforce that rule with a `unique (...)` constraint instead of a composite primary key. If a table must keep another primary key (such as `user_profile.user_id`, which sign-in uses), still add `id uuid not null default gen_random_uuid() unique`. Adding `id` to an existing table goes in a new idempotent migration (see `supabase/migrations/0007_id_columns.sql`).

**Owner runs Supabase migrations manually:** whenever a change adds or edits a file in `supabase/migrations/`, the owner pastes that migration into the Supabase SQL editor and runs it. In the handoff, tell the owner which migration file to run, then give ready-to-paste **check queries** that prove it recorded: a query that lists the new tables, views, columns, and functions from `information_schema` with the number of rows to expect; a sample insert or owner command (for example `create_license_key`) followed by a `select` that shows the stored row; and what each result should look like. Keep migrations idempotent so a later run by the deploy workflow is harmless. Edge Functions are not created by running SQL; say when a change also needs a push (which deploys `supabase/functions/`).

**Preferences file (import/export):** Settings → Preferences → Export settings / Import settings use the JSON file defined in `packages/schemas/src/preferences-file.ts` (`buildPreferencesFile`, `applyPreferencesFile`). Whenever a preference is added, changed, renamed, or removed in `desktopPreferencesSchema`/`defaultDesktopPreferences`, update that file format in the same change so exported files keep working across versions:
- **Added:** give it a default in `defaultDesktopPreferences` and add it, with a label, to its section in `PREFERENCE_SECTIONS` so it appears in **Choose what to export** (the test fails until it is listed exactly once); import applies it when present.
- **Renamed:** add `oldName: 'newName'` to `PREFERENCE_RENAMES` so files from older versions still set it.
- **Allowed values changed:** add a conversion to `PREFERENCE_VALUE_UPGRADES` when an old value has a clear new equivalent; otherwise the old value is skipped and the current setting is kept.
- **Removed:** remove it from `PREFERENCE_SECTIONS` (older files that still contain it are ignored for that key); mention the removal in the user guide.
- **File structure changed** (not just the list of preferences): bump `PREFERENCES_FILE_VERSION` and keep reading older versions.

Import must stay version-tolerant: apply only the preferences present in the file that this version accepts, keep every other preference at its current value, and ignore entries this version does not know, so a file from an older or newer LeadsGhr imports as far as both versions agree. Extend `packages/schemas/tests/preferences-file.test.ts` (run with `pnpm.cmd --filter @leadsghr/schemas test`) for every rename, value upgrade, or structure change, and update the README's import/export paragraph.

**Generated files:** do not edit `apps/desktop/out/`, installer output, `node_modules/`, `.turbo/`, or other ignored build artifacts as source.

**Chrome extensions:** after any change to an extension, rebuild it with its packaging script (`pnpm.cmd build:mailer-extension` for LeadsGhr Mailer). The script must copy the ZIP to `C:\LeadsGhr\extensions\` and extract it into the same-named folder beside it (for example `C:\LeadsGhr\extensions\leadsghr-mailer\`), emptying that folder first. The owner never extracts anything by hand: the first time they choose that folder with **Load unpacked** in `chrome://extensions`, and after each rebuild they only select **Reload**. Always reuse the same folder path, because Chrome derives an unpacked extension's ID, and therefore its saved data, from the path. If a packaging script lacks the extract step, add it. Never extract or keep unpacked builds inside the repository. Report the ZIP and folder paths in the handoff.

**Extension data:** data a user creates or chooses in an extension (saved templates, preferences, and similar records) is stored as files in that extension's own `data` folder, for example `C:\LeadsGhr\extensions\leadsghr-mailer\data\templates.json`, not in `chrome.storage`, `localStorage`, or IndexedDB, which Chrome can clear. Read the files through `chrome.runtime.getURL('data/<file>')`; write them through the folder the user grants once with the File System Access API (see `apps/mailer-extension/src/email-sending/data-folder.ts`). Packaging scripts must never delete or overwrite an extension's `data` folder. `chrome.storage.local` may hold only short-lived state such as a running job, a send log, or unsaved form input. When moving existing data out of Chrome storage, copy it into the data folder before removing it.

**License keys (access control):** LeadsGhr has no sign-up and no email verification; access to the desktop app and to every Chrome extension is controlled by **license keys** that only the owner (admin) generates in Supabase. Implemented in `packages/license` (shared logic, the extension screen and gate), `supabase/migrations/0005_license_keys.sql`, `supabase/functions/license`, `apps/desktop/src/license.ts`, and `packages/app/src/license-page.tsx`; keep every licensing change consistent with it:
- **One key, one activation per product.** A key can be activated once for the **desktop app**, once for **LeadsGhr Mailer**, once for **LeadsGhr Tracker**, and once for each **future extension**. Activating marks that product's slot as used and binds it to that installation (a random installation ID, stored hashed), so the key cannot be shared (for example, after the desktop activation the two extension slots remain). A new product adds a new slot: add it to `LICENSE_PRODUCTS` in `packages/license/src/index.ts` and `PRODUCTS` in `supabase/functions/license/index.ts`, wrap its entry pages in `LicenseGate`, and check `leadsghr.licenseActive` before its content scripts act.
- **Expiry.** Each key has an expiry date. An expired or invalid key cannot be renewed by the user; they ask the admin for a new key.
- **Entry point.** The license-key screen is the first screen of every Chrome extension (current and future) and appears in the desktop app right after the splash screen. Nothing else is usable until a key is activated.
- **Local storage.** The activated license is stored locally in encrypted form; the user never sees the full key. Desktop: `C:\LeadsGhr\data\license.bin` and `installation.bin`, encrypted with Windows per-user encryption (Electron `safeStorage`). Extensions: `chrome.storage.local`, AES-GCM encrypted (an allowed exception to the extension-data rule, because re-entering the key re-creates it), plus a `leadsghr.licenseActive` flag that content scripts read. The desktop shows a **License** entry under **Settings** in the sidebar (status, the key's last 8 characters with a copy button, expiry with a progress bar, products used). The copy button calls `leadsghr:license:copy`, which writes the full key to the clipboard from Electron main, so the full key is never sent to the renderer or shown on screen.
- **Startup check.** On every start, each product validates its key with Supabase (key exists, not expired, activation still bound to this installation): the desktop during the splash screen, extensions at browser start-up and when a popup opens (at most hourly). If it is expired, revoked, or used elsewhere, remove the local license session and show the license-key screen. Without internet, a product keeps working for **7 days** after its last successful check (`OFFLINE_GRACE_DAYS`).
- **Data boundary.** Supabase holds only license keys, expiry dates, and activation records (product, installation, time). It never receives leads, recipients, subjects, message content, or other extraction data (rule 6). License changes go in idempotent migrations like any other Supabase change.
- **Admin commands** (Supabase SQL editor): `select public.create_license_key('Name', 'email@example.com', '2026-12-31');` returns a new key; `select * from public.license_overview;` lists keys with their name, email, and where they are used; `select public.reset_license_product('<key>', 'mailer');` frees one product (for a reinstalled PC); `select public.revoke_license_key('<key>');` turns a key off. A key is 32 case-sensitive characters from `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?` (no look-alikes or quotes), with at least one capital, small letter, digit, and special character: each byte of the SHA-256 of the name, email, creation time, and a random UUID picks one character (`supabase/migrations/0006_license_key_32.sql`). Older 64-character hex keys from `0005` keep working. `license_keys` stores the key with its name, email, expiry, revocation, and creation time; only the owner's SQL role can read it.
This replaces the sign-up, plans, and billing design in `docs/features/G6-Accounts, Billing and Plans/`.

**Supabase Storage:** use the single public bucket `assets` for every file the product stores in Supabase Storage. Do not create a separate bucket per feature. Put each file in a folder named for its purpose, for example `assets/email-assets/leadsghr-mailer-logo.png` for images shown in outgoing emails; add a new folder (such as `assets/<purpose>-assets/`) for a new purpose. Public URLs then take the form `https://<project-ref>.supabase.co/storage/v1/object/public/assets/<folder>/<file>`. Keep the source copy of each uploaded file in the repository (for example `apps/mailer-extension/email-assets/`), and only store public, non-sensitive files there: never leads, recipients, subjects, message bodies, exports, or credentials. Bucket changes go in an idempotent migration; uploading files to the live project is a service write that needs the owner's approval.

## 8. The change contract

Update the matching documentation in the same working-tree change whenever behavior, schema, UI conventions, integrations, or workflow changes.

| Change | Update |
| --- | --- |
| New or changed screen | Relevant feature README and `docs/components/COMPONENTS_README.md` when the component inventory changes |
| Crawler or pipeline behavior | `docs/crawler/CRAWLER_README.md`, relevant feature README, and architecture guide as needed |
| Preference or schema change | Zod contract, persistence/load path, the preferences import/export file (`packages/schemas/src/preferences-file.ts` and its test), relevant user guide, and migration notes if local data changes |
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
- Use `git diff` to inspect the change before committing it. Leave it unpushed until the owner approves a push.

## 10. Reusable workflows

This repository does not define local agent skills. Use these project workflows instead:

| Work | Follow |
| --- | --- |
| Feature change | Read code, feature README, status README, and design guide; implement; run focused checks; update docs |
| Bug fix | Reproduce, trace the failing path, fix the cause, add a focused regression test when useful, verify the flow |
| Crawler change | Check public-target guards, robots policy, delays, challenges, queue deduplication, source attribution, and no-saving test behavior |
| Pipeline/data change | Check SQLite schema migration, resume checkpoints, export consistency, and local-only data boundary |
| UI change | Reuse tokens/components, keep keyboard and focus behavior, verify responsive layout and empty states |
| Release handoff | Commit the change, then report the commit, changed files, checks, risks, and owner actions; do not push, deploy, or publish without approval |

## 11. Definition of done

A change is ready for owner review when the requested behavior is implemented; relevant checks have passed or their limits are stated; current docs and feature status are synchronized; secrets and generated files are excluded; and the final handoff names changed files, behavior, tests, and material risks. **The agent commits the finished change and stops without pushing. Pushing happens only with the owner's explicit approval.**
