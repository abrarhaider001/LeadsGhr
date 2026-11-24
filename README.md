# LeadsGhr

**Pick a niche. Get the leads.**

LeadsGhr is a desktop application for discovering businesses by niche and location, collecting publicly available company and contact information, reviewing quality, organizing local lead lists, and exporting them. The app runs in Electron on the user's computer and IP. Extraction data, scan runs, page observations, and exports stay on that computer in SQLite and local files. Supabase holds account/profile data and, when deployed, opaque email-tracking pixel tokens and image-load counts; it does not store extracted leads.

A companion Gmail tracking extension, **LeadsGhr Tracker**, is available as a downloadable MV3 ZIP from the desktop Email Tracking page. It needs a separately deployed public HTTPS pixel endpoint to observe recipient-side image loads. Manual email extraction in the extension remains planned.

**LeadsGhr Mailer** is a separate Chrome extension (`apps/mailer-extension`) for sending saved email templates to CSV or Excel recipient ranges through the user's Gmail session; the desktop **Email Sending** page downloads it, and **Email Templates** saves those messages in `C:\LeadsGhr\extensions\leadsghr-mailer\data`.

[Feature implementation status](docs/features/FEATURE_STATUS_README.md) tracks what is built and what remains across the original specification.

## Pipeline

The **Discovery tools** sidebar also includes **Email Validation** and **Email Spam Check**. Email Validation runs a local SMTP RCPT TO probe (no mail sent) after MX/A lookup and labels addresses Valid, Risky, Invalid, or Unknown; many networks block outbound port 25, so Unknown is common and not overclaimed. Email Spam Check remains a navigation placeholder. Email Filtering remains the local syntax and junk cleanup tool.

**Deleting a saved pipeline:** The Pipeline page lists previous pipelines with a trash icon. After confirmation, deletion removes that pipeline's SQLite run, business rows, queued pages, and export history. The delete button is unavailable while a pipeline is running; stop it first. CSV files already written to disk are retained.

**License keys:** LeadsGhr has no sign-up. The desktop app and each Chrome extension open with a license-key screen (desktop: after the splash screen; extensions: when the popup, Mailer settings page, or Tracker side panel opens). The owner creates keys in the Supabase SQL editor (`select public.create_license_key('Name', 'email@example.com', '2026-12-31');`, which returns a 32-character key with capital and small letters, digits, and special characters such as `6fN$YM7xQ7!3RP2!JtqYHAWzT3QYN!Mx`, made from the name, email, the current time, and a random value with SHA-256; keys are case-sensitive) and gives each person their own. A key activates once on each product (desktop app, LeadsGhr Mailer, LeadsGhr Tracker) and is then bound to that installation, so it cannot be shared; `reset_license_product` frees a product again (for example after reinstalling Windows) and `revoke_license_key` turns a key off. Every start re-checks the key with the `license` Edge Function; an expired, revoked, or reused key removes the local license and shows the key screen again ("ask your admin for a new key"). Without internet a product keeps working for 7 days after its last check. The key is stored encrypted (desktop: `C:\LeadsGhr\data\license.bin` with Windows encryption; extensions: encrypted in Chrome storage) and never shown in full; **Settings → License** shows the status, masked key, expiry date, and which products the key is used on. Supabase holds only the keys with the name and email they were made for, expiry dates, and activation records (`supabase/migrations/0005_license_keys.sql`). Deleting LeadsGhr's data at uninstall also removes this computer's installation ID, so that key needs `reset_license_product` before it can activate the desktop app again.

**Local mode (no license keys while developing):** add `LEADSGHR_LOCAL_MODE=true` to the `.env` file in the repository root to work without license keys. `pnpm dev` then opens the desktop app straight after the splash screen (**Settings → License** says "Local mode: license check is off"), and `pnpm build:extension` / `pnpm build:mailer-extension` build extensions without the license screen, with a **LOCAL MODE** strip at the top. Remove the line or set it to `false` and restart (or rebuild the extensions) to turn license keys back on. Installed copies of the desktop app always require a key, and a local-mode extension build never replaces the ZIPs committed in the repository; only the copy in `C:\LeadsGhr\extensions` is updated.

**Where LeadsGhr keeps your data:** everything LeadsGhr saves is in `C:\LeadsGhr` (on the system drive): `data\` holds the database (`leadsghr.sqlite`: runs, results, pipeline queues, email-validation cache, export history), `preferences.json`, `search-criteria.json`, and `profile.json` (name, email, avatar); `exports\` holds CSV exports, `extensions\` the Chrome extensions, and `settings\` exported settings files. Back up or move LeadsGhr's data by copying that one folder. It is not removed when LeadsGhr is uninstalled, so a reinstall shows the same runs, results, and settings. The first start of a version with the data folder copies the database and settings from the old location (`%APPDATA%\@leadsghr\desktop`) into `C:\LeadsGhr\data` (only files the data folder does not have yet) and leaves the old files there as a backup; the profile moves from the window's storage into `profile.json`. If `C:\LeadsGhr\data` cannot be created, LeadsGhr keeps using the old location. `LEADSGHR_DATA_DIR` points the data folder elsewhere, for example a separate folder for tests. Electron's own caches stay in `%APPDATA%\@leadsghr\desktop`.

**Uninstalling LeadsGhr:** Windows **Settings → Apps → LeadsGhr → Uninstall** opens LeadsGhr's own window (same look as LeadsGhr Setup): **Uninstall LeadsGhr?** with an **Also delete my LeadsGhr data** card that is **unchecked by default**. Left unchecked, **Uninstall** removes only the app and keeps everything in `C:\LeadsGhr`, so a later install shows the same runs, results, and settings. Ticked, the card turns red and the button becomes **Uninstall and delete data**, which also deletes `C:\LeadsGhr` (data, exports, extensions, settings), the old `%APPDATA%\@leadsghr\desktop` folder, and the updater cache. **Cancel** (or closing the window) removes nothing. While the app is removed, a small window shows **Removing LeadsGhr…** and then **LeadsGhr was removed.** Automatic updates never show this window and never delete data. How it works: the installer sets the Windows uninstall command to `"Uninstall LeadsGhr.exe" /currentuser /S --ask` (`apps/desktop/setup/installer.nsh`, included through `nsisWeb.include`); `/S` skips electron-builder's plain confirmation and `--ask` runs `resources\LeadsGhr-Uninstall.exe` (`apps/desktop/setup/LeadsGhrUninstall.cs` with the shared drawing in `setup/Brand.cs`; exit code 0 keep data, 2 delete data, 1 cancel). Updates run the old uninstaller with `/S --updated` and no `--ask`. If the window file is missing, the uninstaller asks with a plain box instead. `pnpm build` builds the window first (`build:uninstall`, into the ignored `apps/desktop/setup/out/`) so electron-builder packs it. It applies to versions installed with this change; older installs keep the plain uninstaller until they update.

**Clear all local crawl and Pipeline history:** Close the desktop app, then run `pnpm clear:crawl-history` from the project root. The script backs up `leadsghr.sqlite` in `C:\LeadsGhr\data` (or the old `%APPDATA%\@leadsghr\desktop` location if the data folder has no database yet) before removing saved runs, page queues, result rows, filter audits, and export-history records. Preferences, saved selections, leads, and CSV files on disk remain available. Restart the app to see the empty history.

**Current creation flow:** Click **Create pipeline** to open the right-side drawer. Enter a name, select Google Maps, and choose whether to reuse the saved niche, state, and location selections. If all three checked sections have saved choices, **Start pipeline** begins the crawl. Uncheck a section and the action becomes **Add pipeline**; the guided page opens at the first section needing new choices and skips the sections being reused. New states require new locations.

Open **Pipeline** directly below Dashboard for a visual overview of search, URL queue, crawl, and export. Select **Create pipeline**, enter a required name, and choose a search platform in the provider grid. Google Maps is the available automated provider; Google, Facebook, and LinkedIn are shown as planned because their automated search or access is not supported under the current public-data rules. The guided timeline then moves through Niches → States → Locations → Crawl → Export. Select **Start crawl** after choosing locations. Public Maps business cards enter the saved results table, and each business website enters a persistent URL queue. The crawler visits the homepage, prioritizes a contact page, extracts public emails, and follows further same-site links when the contact-only preference is off. A fetch stage prepares page N+1 while the crawl stage inspects page N, including a sandboxed rendered page and scrolling. The URL queue shows each page's status and emails. Completed and stopped runs produce a CSV, then the export page shows its full file location. **New Search** retains its separate search-only flow.

The sidebar groups Crawler, New Search, Niche Library, and **Email Filtering** under **Discovery tools**. Email Filtering is a local two-panel workflow: import `.xlsx` or `.csv`, review detected email columns, optionally paste addresses, then select **Start filtering**. It normalizes case, removes duplicates (including Gmail dot/plus aliases), malformed and placeholder addresses, no-reply mailboxes, and a local list of known disposable domains. Kept emails and removal reasons appear on the right; copy or export the kept list as CSV. Unknown domain endings are held for manual review. The filter does not verify mailbox existence or send data to a service.

### Run history and CSV files

Each run records its name and provider, selected niches and states, first and last selected state numbers, query count, next query position, start and finish times, filtered business rows, and website page queue. After an app restart, in-flight pages return to the queue. **Resume** on Pipeline, Runs, or Exports retries the current Maps query or continues the unfinished website queue. Pipeline's home page lists saved pipelines for resumption or deletion. The automatic CSV is written to `C:\LeadsGhr\exports` (on non-Windows systems, `Documents/LeadsGhr/exports`) with niche, run date, and time in its filename. It includes the business fields, source, and collected emails. Dashboard shows saved runs in one Latest pipelines table. Runs and Exports show progress, filenames, entry counts, paths, file sizes, and re-export actions. The separate Crawler test remains unsaved.

## Responsible use

Collect public data only. Respect robots.txt and polite delays, pause on challenges, and do not bypass captchas or logins. Do not use external data APIs or data tools. Hosting, a domain, and an email sender are the only allowed external services.

## Technology

- TypeScript, React, Node.js, pnpm workspaces, Turborepo.
- Electron and electron-vite for the desktop UI; context isolation, disabled Node integration, Zod-validated IPC, electron-builder and electron-updater.
- Local SQLite through better-sqlite3 for leads, scan history and queued jobs. Exports are files on disk.
- Supabase Auth and an RLS-protected user profile table for account data; an optional Edge Function stores opaque mail-tracking tokens, image-load counts, and load timestamps.
- Shared packages: core, extract, crawler, quality, export, schemas, ui, app and platform. Extractors accept HTML strings and use Cheerio and libphonenumber-js.

## Repository

```text
apps/desktop/  Electron main, preload and React renderer
apps/extension/  Gmail tracking Chrome MV3 extension and downloadable ZIP
apps/mailer-extension/  LeadsGhr Mailer: Gmail sending Chrome extension and downloadable ZIP
packages/     Shared domain, extraction, crawling, quality, export, schemas, UI and adapters
supabase/     Account/profile schema and optional mail-tracking function/migration
.github/workflows/  Supabase deploy: applies migrations and deploys Edge Functions on every branch push
docs/         Current desktop guides and preserved original specification
```

Legacy web, API, and worker folders remain inactive reference code. `apps/extension` (LeadsGhr Tracker) and `apps/mailer-extension` (LeadsGhr Mailer) are active, separate Chrome extension builds in the pnpm workspace.

## LeadsGhr Mailer (Gmail sending)

Open **Email Sending** in the desktop app and select **Download extension ZIP**; an **Extension saved** dialog shows where `leadsghr-mailer.zip` was saved. Extract it to a `leadsghr-mailer` folder and load it with **Load unpacked** in `chrome://extensions`. Save templates on the desktop **Email Templates** page, which writes `C:\LeadsGhr\extensions\leadsghr-mailer\data\templates.json`, or on the Mailer's settings page (popup gear button), then click the toolbar icon in Gmail: pick a template, upload a CSV or Excel file, set Start, End, and a 5–120 second delay, and use Start, Pause, Resume, and Stop. Rebuild with `pnpm.cmd build:mailer-extension`. See [Email Sending](docs/EMAIL_SENDING_README.md).

## Supabase deployment

`.github/workflows/supabase-deploy.yml` runs on GitHub Actions when a push to any branch changes `supabase/migrations/`, `supabase/functions/`, or `supabase/config.toml`. It applies migrations not yet recorded in the hosted project's migration history (`supabase db push`) and deploys every function in `supabase/functions/` without Docker. It needs the repository secret `SUPABASE_ACCESS_TOKEN` (a Supabase personal access token) and the repository variable `SUPABASE_PROJECT_ID` (the project ref). Function secrets such as `MAIL_TRACKING_REGISTRATION_KEY` stay in the Supabase dashboard. It can also be run manually from the Actions tab, with a dry-run option and a one-time option to record migrations that were already applied by hand in the SQL Editor. There is one hosted project, so the most recent push from any branch is what runs live, and a migration applied from a branch stays applied even if that branch is abandoned. Keep migrations additive and safe to re-run.

## Desktop releases (download link)

`.github/workflows/release.yml` runs on GitHub Actions for every push to `main` (and on demand from the Actions tab). On a Windows runner it installs dependencies, builds the Chrome extension ZIPs, builds the app with `pnpm build`, and publishes a GitHub Release tagged `v0.1.<build number>`. People download **LeadsGhr Setup** (`LeadsGhr-Setup.exe`, about 0.5 MB): a small branded window (plain white with the headline "Your lead workspace is almost ready." and a progress bar) that reads `latest.yml` from the newest release, downloads `LeadsGhr-Installer.exe` and the app package `LeadsGhr-App-x64.nsis.7z` (about 100 MB) with a progress bar, checks both against the SHA-512 hashes in `latest.yml`, runs the installer silently (`/S --force-run --package-file=…`), and opens LeadsGhr. If the download fails it shows the reason and **Try again**. Its source is `apps/desktop/setup/` (`LeadsGhrSetup.cs`, a WinForms program for the .NET Framework built into Windows 10/11, with the Plus Jakarta Sans fonts and logo in `setup/assets/`); `setup/build-setup.ps1 -Target setup` compiles it with the C# compiler that ships with Windows, and `pnpm build` runs it last (`build:setup`). For testing it accepts `--feed <url>` (another location for `latest.yml` and the files), `--dry-run` (download and verify without installing), and `--preview <preparing|downloading|installing|starting|failed> --screenshot <file.png>`. `LeadsGhr-Installer.exe` and the package come from electron-builder's web installer (`nsis-web` target in `apps/desktop/electron-builder.yml`); run on its own, the installer downloads the package from the latest release (`nsisWeb.appPackageUrl`). Each release carries `LeadsGhr-Setup.exe`, `LeadsGhr-Installer.exe`, `LeadsGhr-App-x64.nsis.7z`, and `latest.yml`, which installed copies read to update themselves. `apps/desktop/scripts/finish-web-installer.mjs` runs after electron-builder: it renames the package from its internal name (`@leadsghrdesktop-<version>-x64.nsis.7z`, not safe as a GitHub asset name) to `LeadsGhr-App-x64.nsis.7z` and updates `latest.yml`; the internal name stays because it decides where installed copies keep their data. `pnpm build` runs electron-builder with `--publish never`; only the workflow publishes. The version is set only inside the CI run; nothing is committed back. Only `better-sqlite3` is a runtime `dependency` of `apps/desktop`: electron-vite bundles everything else into `out/`, and every package listed under `dependencies` is copied into the installer, so keep bundled packages under `devDependencies`.

Share this permanent link; it always downloads the newest release: `https://github.com/abrarhaider001/LeadsGhr/releases/latest/download/LeadsGhr-Setup.exe`. Setup needs an internet connection, because it downloads LeadsGhr while installing; if the download fails it offers **Retry**. The repository must be public for people without repository access to download it. The installer is not code-signed, so Windows SmartScreen shows "Windows protected your PC" (choose **More info**, then **Run anyway**). Users need Windows and Google Chrome. **Auto-update:** installed copies from 0.1.3 on update themselves. At start-up and every four hours the app checks GitHub Releases (the `publish` target in `apps/desktop/electron-builder.yml`); the result appears as a banner above every page and under **Settings → Preferences → Updates**. With **Download updates automatically** on (the default), a newer version downloads in the background (the banner shows its progress) and the banner then shows **Update ready** with **Restart now** or **Later**; Later installs it the next time LeadsGhr closes. With it off, the banner only says **LeadsGhr X is available**; **Update now** downloads it and restarts into it. The Updates tab shows the installed version, the last check, and **Check for updates**. The version also appears on the splash screen and in the sidebar footer. 0.1.3 itself still shows the older system dialog (Restart now / Later) for its first update. Data in `%APPDATA%` and `C:\LeadsGhr` is kept. The updater reads `latest.yml`, downloads `LeadsGhr-App-x64.nsis.7z` (checking its SHA-512), and runs `LeadsGhr-Installer.exe` with that package, so updating needs no second download; later updates can download only the changed parts. The repository must be public for installed copies to see new releases. Copies older than 0.1.3 (0.1.1, 0.1.2) cannot update themselves: install 0.1.3 or later once from the download link.

## Gmail tracking extension

Open **Email Tracking** in the desktop app to download the ZIP and read how to install the extension and how tracking works. The source build is `pnpm --filter @leadsghr/extension build`. The extension displays a tracking control in Gmail compose, a LeadsGhr toolbar entry, gray or purple double ticks in matched sent rows with a hover card showing observed image-load counts and times, an observed-load history, and Chrome notifications for new loads. Gmail's image cache can hide repeat opens, so counts are observed loads, not exact opens. Real recipient-side loads require deploying the included public HTTPS tracking function and configuring its endpoint in extension settings. See the [Email Tracking guide](docs/EMAIL_TRACKING_README.md) for setup, behavior, and limits.

## Run the desktop app

Install Node.js and pnpm. From the project root:

```bash
pnpm install
pnpm dev
```

`pnpm dev:desktop` is an equivalent explicit command. The splash screen shows the LeadsGhr logo (drawn by `BrandLogo` from the design tokens) and a loading progress bar. The Electron window opens maximized with the light-on-dark LeadsGhr wordmark in the sidebar and the LG monogram desktop icon. Keep the terminal running while using it and press Ctrl+C to stop. The local SQLite file is `C:\LeadsGhr\data\leadsghr.sqlite` (see **Where LeadsGhr keeps your data**).

`pnpm install` rebuilds `better-sqlite3` for Electron. A binary built for plain Node fails at startup with a `NODE_MODULE_VERSION` mismatch; run `pnpm --filter @leadsghr/desktop run rebuild:native` to rebuild it again. If an earlier install skipped dependency scripts and reports `Electron uninstall`, run `pnpm --filter @leadsghr/desktop rebuild electron`. If your shell has `ELECTRON_RUN_AS_NODE=1`, clear it for that session with `Remove-Item Env:ELECTRON_RUN_AS_NODE` before `pnpm dev`.

```bash
pnpm typecheck
pnpm build
```

The current scan flow can crawl a user-supplied public site through the Electron IPC bridge. Broad niche discovery, most feature pages, and Supabase sign-in UI remain planned work. See the [documentation index](docs/DOCS_README.md), [architecture](docs/structure/STRUCTURE_README.md), and [theme](docs/theme/THEME_README.md).
## Desktop dashboard and crawler test

The desktop app has a light and a dark theme (Settings → Preferences → Appearance: Light, Dark, or Match Windows). Light uses white cards on a soft grey canvas with charcoal text and green actions; dark uses charcoal surfaces with bright green actions. Both come from the design tokens in `packages/ui/src/tokens.css`. It keeps compact type, four icon-and-copy metric cards, a trend chart, quick actions, and a Latest pipelines table. Its metrics, chart, and table read saved local crawl runs and CSV history. The [theme](docs/theme/THEME_README.md), [components](docs/components/COMPONENTS_README.md), and [icons](docs/icons/ICONS_README.md) guides describe the design and brand assets.

### Contractor search sources and emails

Profile > Preferences controls whether Crawl Results shows public Google Maps business listings and whether it uses expanded Niche Library terms. Expanded terms are off by default: each selected niche name is searched once per location. Turn them on for broader searches that take longer. The saved run table shows the selected business fields and hides listings without a website URL by default. Profile > Preferences > Search result filters can turn those rows back on. Pipeline crawls linked public websites for emails after the Maps searches; New Search remains search-only. Google regular web-search results are not scanned because Google disallows automated `/search` access in robots.txt.

### Crawler test page

Open **Crawler** in the desktop sidebar, enter a public homepage URL, and click **Crawl page**. The crawler fetches and scrolls the homepage, discovers same-site links, then crawls its contact page first. One live status line changes as work progresses. The URL queue table shows each page's status and found emails. In Profile > Preferences, **Crawl homepage and contact page only** is on by default. Turn it off to queue every unique same-site URL found on the homepage. This test flow does not write to SQLite or Supabase. See the [crawler guide](docs/crawler/CRAWLER_README.md).

## Profile and preferences

The **Profile** sidebar page has Account and Preferences tabs. The Account tab starts with Abrar Haider and abrar@leedsghr.com as editable local profile details and displays a locally saved generated avatar. The sidebar greets the saved first name. A Reset Password form is visible but inactive until Supabase authentication is connected. Click **Generate new** to replace the avatar and save the new choice. Supabase sign-in is not wired into this desktop build, so no name, email, or plan is invented. Profile details and preferences are saved in `C:\LeadsGhr\data` (`profile.json`, `preferences.json`): show or hide the Crawler webpage preview, show Chrome during contractor searches or run it in the background, choose fast niche-name searches or expanded Niche Library terms, show or hide businesses without website URLs (hidden by default), and choose which contractor fields appear in the saved crawl results table (company, website, phone, address, and searched location), and choose Email Validation checks (Syntax, Domain, MX, SMTP, Disposable, Role-based, and Catch-all; Catch-all needs SMTP, SMTP needs MX, and MX needs Domain). Hiding the preview does not stop the Crawler from scrolling and extracting. Crawl results and selected fields are saved locally with their run; Supabase does not receive them.

**Import and export settings:** the top of **Settings → Preferences** has **Export settings** and **Import settings**. Export opens **Choose what to export**: tick a whole section (Appearance, Crawler, Search, Email Validation, Updates) or open it and pick single settings (a section shows a mixed tick when only some are chosen, and each setting shows its current value), then **Export N settings** writes only those to `C:\LeadsGhr\settings\leadsghr-settings-<date>-<time>.json` (`{ app, kind: "preferences", version, exportedAt, preferences }`) and shows a **Settings exported** notice with **Show in folder**. Send that file to someone to share your setup. Import opens a file picker for a `.json` file, applies only the preferences that are in the file and that this version accepts, keeps every other preference at its current value, saves the result, and shows **Settings imported successfully** with how many settings were updated (and, for a file from another version, how many were kept or ignored); the open page updates at once. So a file from an older LeadsGhr (fewer preferences) changes only what it contains, and a file from a newer one imports everything this version understands. A file that is not JSON, holds no usable LeadsGhr preferences, or is over 1 MB is rejected with a **Settings not changed** notice and nothing is changed. The file format and these rules live in `packages/schemas/src/preferences-file.ts`. Account details (name, email, avatar) are not part of the file. Search public websites stays off after an import, as it does for every save.

## Feature summary

The original specification catalogues **54 features**. Groups A-G inform this desktop product; group X documents a separate future extension. Each ID links to its own detailed document through the [feature index](docs/DOCS_README.md).

<details>
<summary><strong>A · Niche, search, and filters</strong> (6 features)</summary>

**What it covers:** Define a campaign with niches, places, source and lead filters, saved setups, and a yield estimate.

- [A1: Niche Library](docs/features/A1-Niche%20Library/FEATURES-A1-README.md) — A ready-made tree of business niches, each with a keyword pack: main terms, synonyms, related services, negative keywords and typical website phrases.
- [A2: Custom Niche Builder and Keyword Expansion](docs/features/A2-Custom%20Niche%20Builder%20and%20Keyword%20Expansion/FEATURES-A2-README.md) — Lets the user type any niche in plain words and expands it into a full keyword pack without calling any external API.
- [A3: Geo Targeting](docs/features/A3-Geo%20Targeting/FEATURES-A3-README.md) — Selects where to search: country, state or province, city, ZIP or postal code, or a map radius.
- [A4: Filter Engine](docs/features/A4-Filter%20Engine/FEATURES-A4-README.md) — A rule builder that applies filters before and after scraping.
- [A5: Saved Search Profiles and Templates](docs/features/A5-Saved%20Search%20Profiles%20and%20Templates/FEATURES-A5-README.md) — Stores a complete setup (niche pack, geography, filters, sources, export template) as a named profile that can be run again or scheduled.
- [A6: Dry Run and Yield Estimator](docs/features/A6-Dry%20Run%20and%20Yield%20Estimator/FEATURES-A6-README.md) — Before the full run the tool samples a few cells and sources, then predicts how many leads, emails and phones to expect, how long the run will take and how many requests it will make.

</details>

<details>
<summary><strong>B · Public discovery</strong> (8 features)</summary>

**What it covers:** Find candidate companies from public and user-provided sources, with controls for higher-risk sources.

- [B1: Search Engine Discovery](docs/features/B1-Search%20Engine%20Discovery/FEATURES-B1-README.md) — Finds company websites by running niche plus city queries on public search result pages using the tool's own browser automation (no paid API).
- [B2: Map Listings Adapter](docs/features/B2-Map%20Listings%20Adapter/FEATURES-B2-README.md) — Reads the public business listing panels shown on map search pages: name, category, address, phone, website, rating and review count.
- [B3: Public Directory Adapters](docs/features/B3-Public%20Directory%20Adapters/FEATURES-B3-README.md) — A plug-in set of adapters for public business directories and industry listing sites.
- [B4: Open Map Data Importer](docs/features/B4-Open%20Map%20Data%20Importer/FEATURES-B4-README.md) — Imports openly licensed map data (OpenStreetMap regional extracts, downloaded once as files) into local SQLite tables on the user's computer.
- [B5: Professional Network Company Pages (Browser Extension, Assisted Mode)](docs/features/B5-Professional%20Network%20Company%20Pages%20%28Browser%20Extension%2C%20Assisted%20Mode%29/FEATURES-B5-README.md) — Assisted capture is limited to public pages available without a source-site login.
- [B6: Social Public Pages Reader](docs/features/B6-Social%20Public%20Pages%20Reader/FEATURES-B6-README.md) — Reads the public 'About' information of business pages that are reachable without login: phone, email, address, website and hours when the page owner has published them.
- [B7: Associations, Chambers and Licence Registries](docs/features/B7-Associations%2C%20Chambers%20and%20Licence%20Registries/FEATURES-B7-README.md) — Adapters for public member lists of trade associations, chambers of commerce and government contractor or business registries.
- [B8: Bring Your Own List](docs/features/B8-Bring%20Your%20Own%20List/FEATURES-B8-README.md) — Imports a CSV or Excel file of company names or domains the user already has and runs enrichment only (crawl, extract, verify, score).

</details>

<details>
<summary><strong>C · Extraction</strong> (8 features)</summary>

**What it covers:** Read relevant public pages and turn their contact and company information into structured records.

- [C1: Website Crawler](docs/features/C1-Website%20Crawler/FEATURES-C1-README.md) — The core engine.
- [C2: Contact Page Detector](docs/features/C2-Contact%20Page%20Detector/FEATURES-C2-README.md) — Ranks internal links by how likely they are to hold contact data using multilingual keyword lists (contact, about, team, reach us, impressum, kontakt, contacto and so on) plus URL and menu position signals.
- [C3: Email Extractor](docs/features/C3-Email%20Extractor/FEATURES-C3-README.md) — Finds email addresses in page text, mailto links, JSON-LD and common obfuscations such as 'name [at] domain [dot] com', HTML entities, split spans and simple JavaScript string joins.
- [C4: Phone Extractor and Normaliser](docs/features/C4-Phone%20Extractor%20and%20Normaliser/FEATURES-C4-README.md) — Extracts phone numbers from text and tel links, then normalises them to international E.164 form using the target country as a hint.
- [C5: Address Parser and Geocoder](docs/features/C5-Address%20Parser%20and%20Geocoder/FEATURES-C5-README.md) — Finds postal addresses on pages and in structured data, splits them into street, city, state, postcode and country, and attaches latitude and longitude from the offline place database when possible.
- [C6: Social Profile Finder](docs/features/C6-Social%20Profile%20Finder/FEATURES-C6-README.md) — Collects links to public social and professional profiles from company pages: LinkedIn, Facebook, Instagram, X, YouTube, plus review and directory profile links.
- [C7: Company Profile Builder](docs/features/C7-Company%20Profile%20Builder/FEATURES-C7-README.md) — Summarises what the company does using only text from its own public pages: services list, specialties (for example 'MEP takeoff', 'roofing'), software mentioned, regions served, size hints (team count, years) and a short auto-generated description made by simple extraction, not by an external AI service.
- [C8: Structured Data Reader](docs/features/C8-Structured%20Data%20Reader/FEATURES-C8-README.md) — Reads machine-readable data that sites publish for search engines: JSON-LD, microdata and RDFa such as Organization, LocalBusiness, PostalAddress, ContactPoint and sameAs.

</details>

<details>
<summary><strong>D · Quality and intelligence</strong> (5 features)</summary>

**What it covers:** Merge duplicates, check contact quality, rank leads, and retain source evidence.

- [D1: Deduplication and Entity Resolution](docs/features/D1-Deduplication%20and%20Entity%20Resolution/FEATURES-D1-README.md) — Merges records that describe the same company across sources.
- [D2: Email Verifier](docs/features/D2-Email%20Verifier/FEATURES-D2-README.md) — Partial: Email Validation runs a local SMTP RCPT TO probe after MX/A lookup; disposable and catch-all workflows remain future work.
- [D3: Phone Validator](docs/features/D3-Phone%20Validator/FEATURES-D3-README.md) — Validates numbers against national numbering plans, flags possible and impossible numbers and marks toll-free or premium lines.
- [D4: Lead Scoring](docs/features/D4-Lead%20Scoring/FEATURES-D4-README.md) — Gives every lead a 0 to 100 score from transparent rules: has verified email, has phone, website quality, niche match strength, location match, size hint, rating and recency.
- [D5: Source Tracking and Confidence](docs/features/D5-Source%20Tracking%20and%20Confidence/FEATURES-D5-README.md) — Every field remembers where it came from, when it was seen and how confident the extraction was.

</details>

<details>
<summary><strong>E · Storage and export</strong> (4 features)</summary>

**What it covers:** Preserve run history and deliver complete lead files in useful formats.

- [E1: Live Excel Export](docs/features/E1-Live%20Excel%20Export/FEATURES-E1-README.md) — Leads are journaled in the database the moment they are found, and the Excel workbook is rebuilt on the server while the run is going.
- [E2: Multi-format Export](docs/features/E2-Multi-format%20Export/FEATURES-E2-README.md) — Exports the same data to CSV, JSON, VCF contact cards and CRM-friendly CSV layouts, with column selection and saved export presets.
- [E3: Database and Run History](docs/features/E3-Database%20and%20Run%20History/FEATURES-E3-README.md) — Runs, leads, sources and logs stay in local SQLite on the user's computer.
- [E4: Excel Template Designer](docs/features/E4-Excel%20Template%20Designer/FEATURES-E4-README.md) — Visual editor for the output workbook: pick columns and order, rename headers, set colours, add conditional formatting for score and verification status, and create extra sheets such as 'Hot leads'.

</details>

<details>
<summary><strong>F · Reliability and safety</strong> (6 features)</summary>

**What it covers:** Schedule and resume jobs, respect site rules, handle blocks, and monitor the engine.

- [F1: Job Queue and Scheduler](docs/features/F1-Job%20Queue%20and%20Scheduler/FEATURES-F1-README.md) — A persistent queue of small jobs (one geo cell on one source, or one domain crawl) processed by separate worker containers.
- [F2: Proxy Pool Manager](docs/features/F2-Proxy%20Pool%20Manager/FEATURES-F2-README.md) — Specified capability, unavailable under the current rule that excludes external proxy services and tools.
- [F3: Politeness Engine and robots.txt](docs/features/F3-Politeness%20Engine%20and%20robots.txt/FEATURES-F3-README.md) — Applies per-domain request spacing, concurrency of one by default, crawl-delay support, robots.txt allow and disallow rules, and honest user-agent identification with a contact URL.
- [F4: Resilience Layer](docs/features/F4-Resilience%20Layer/FEATURES-F4-README.md) — Handles flaky networks and tricky sites: retries with exponential backoff, timeouts, redirect loops, SSL errors, encoding problems, JavaScript-only pages (auto escalate from HTTP to headless browser) and memory limits on browser contexts.
- [F5: Challenge and Block Policy](docs/features/F5-Challenge%20and%20Block%20Policy/FEATURES-F5-README.md) — Detects captchas, login walls and 'unusual traffic' pages and responds by pausing, not by bypassing.
- [F6: Logging and Monitoring](docs/features/F6-Logging%20and%20Monitoring/FEATURES-F6-README.md) — Structured logs for every request, extraction and decision with levels and filters, plus a health panel (requests per minute, success rate, memory, active browsers).

</details>

<details>
<summary><strong>G · Product workspace</strong> (7 features)</summary>

**What it covers:** Let users run campaigns, review leads, manage settings and plans, and control responsible use.

- [G1: Dashboard](docs/features/G1-Dashboard/FEATURES-G1-README.md) — Home screen with totals, recent runs, leads by niche, email hit rate, quota usage and quick actions such as 'New search', 'Import list' and 'Open last file'.
- [G2: Live Run Console](docs/features/G2-Live%20Run%20Console/FEATURES-G2-README.md) — Real-time view of an active run: progress bar by cells, leads found, emails and phones found, speed, ETA, current source and recent leads stream.
- [G3: Lead Table Workspace](docs/features/G3-Lead%20Table%20Workspace/FEATURES-G3-README.md) — Spreadsheet-like table for browsing millions of rows with sorting, instant search, column chooser, inline editing, tags, notes, multi-select actions and a detail drawer.
- [G4: Outreach Segments and Templates](docs/features/G4-Outreach%20Segments%20and%20Templates/FEATURES-G4-README.md) — Builds lists (segments) from filters and prepares mail-merge ready exports with personalised fields.
- [G5: Compliance Center](docs/features/G5-Compliance%20Center/FEATURES-G5-README.md) — One place for responsible use: source risk labels, global source switches, suppression and do-not-contact lists, robots decisions, data retention settings, a legal notice template and a per-lead 'public source' proof link.
- [G6: Accounts, Billing and Plans](docs/features/G6-Accounts%2C%20Billing%20and%20Plans/FEATURES-G6-README.md) — Sign-up, email verification, organisations with seats, plans and quotas, with Supabase Auth and account profile data; extracted data stays local.
- [G7: Settings and Team](docs/features/G7-Settings%20and%20Team/FEATURES-G7-README.md) — Account and organisation settings: speed profile, defaults, language, fixed light theme, keyboard shortcuts, team members and roles, notification preferences and data export.

</details>

<details>
<summary><strong>X · Chrome extension</strong> (10 features)</summary>

**What it covers:** Archive the original extension requirements; a separate future extension is planned for email sending and manual email extraction from an opened page.

- [X1: Extension Shell, Side Panel and Login](docs/features/X1-Extension%20Shell%2C%20Side%20Panel%20and%20Login/FEATURES-X1-README.md) — The extension is a Manifest V3 add-on for Chrome.
- [X2: One-Click Site Scan](docs/features/X2-One-Click%20Site%20Scan/FEATURES-X2-README.md) — The lighter version of the crawler.
- [X3: Page Data Capture (Assisted)](docs/features/X3-Page%20Data%20Capture%20%28Assisted%29/FEATURES-X3-README.md) — A Capture button reads only the company cards that are visible on the page the user is viewing (name, website link, phone, address, size band, category).
- [X4: Batch Domain Scan Queue](docs/features/X4-Batch%20Domain%20Scan%20Queue/FEATURES-X4-README.md) — The user pastes a list of domains, or selects captured leads, and the extension scans them one by one with polite delays.
- [X5: Local Lead List and Dedupe](docs/features/X5-Local%20Lead%20List%20and%20Dedupe/FEATURES-X5-README.md) — All captured and scanned leads are stored on the user's machine in IndexedDB, merged by website domain and phone number so the same company never appears twice.
- [X6: Quick Verify](docs/features/X6-Quick%20Verify/FEATURES-X6-README.md) — Checks email syntax and phone format locally.
- [X7: Export in the Browser (CSV and Excel)](docs/features/X7-Export%20in%20the%20Browser%20%28CSV%20and%20Excel%29/FEATURES-X7-README.md) — Exports the local list as CSV or a formatted Excel file straight from the browser, with light grey headers and the same column names as the website export.
- [X8: Sync with the Main Website](docs/features/X8-Sync%20with%20the%20Main%20Website/FEATURES-X8-README.md) — Pushes leads from the extension into the user's website account and pulls down settings: niche keyword packs, filter profiles, suppression list and selector packs.
- [X9: Compliance Guard in the Extension](docs/features/X9-Compliance%20Guard%20in%20the%20Extension/FEATURES-X9-README.md) — Built-in safety rules: it checks robots.txt of a site before scanning, never fetches with cookies, never auto-paginates, enforces delays and daily caps, shows risk labels for sensitive sites and honours a remote block list and suppression list.
- [X10: Lite Filters and Quick Score](docs/features/X10-Lite%20Filters%20and%20Quick%20Score/FEATURES-X10-README.md) — A small set of filters (has email, has phone, has website, country, tag) and a simple 0 to 100 quick score from the fields found, so the user sees the best leads first.

</details>

Features are prioritized P0 for first release, P1 for the next release, and P2 for later work. See the [feature catalogue](docs/specification/feature-catalogue/SPECIFICATION-FEATURE-CATALOGUE-README.md) for each feature's minimum plan, priority, and effort.

## Plans and responsible use

The specification describes Explorer, Starter, Professional and Agency plans. The hosted account controls plans and team membership; desktop and extension may view entitlements when online. Public business data only: obey robots.txt, polite delays, suppression and opt-out rules, pause on challenges, and never bypass captchas or scrape behind logins. See [responsible use](docs/specification/responsible-use/SPECIFICATION-RESPONSIBLE-USE-README.md) and [platform limits](docs/platforms/PLATFORMS_README.md).








## Desktop zoom

**Font size:** Settings → Preferences → Appearance → **Font size** sets the type from 80% to 150% in 10% steps. Only the letters change. Spacing, buttons, and the rest of the layout stay the same. It is saved in `preferences.json` and included in the Appearance section of exported settings.

**Display size:** Settings → Preferences → Appearance → **Display size** sets the window zoom from 70% to 200% in 10% steps with the **Zoom** row's − / + stepper (and **Reset** to 100%); a second row lists the keyboard shortcuts. `Ctrl + Plus` (or `Ctrl + =`) makes everything larger, `Ctrl + Minus` smaller, and `Ctrl + 0` returns to 100%. The shortcuts and the setting are the same thing: either one is saved in `preferences.json`, shown on the Appearance page, and applied the next time LeadsGhr opens. Display size is part of the Appearance section in exported settings files.

The Crawler test lists same-site homepage links in a queue table and reports publicly exposed contact-form recipient addresses. It visits the contact page first, then other homepage links when the contact-only preference is off. It does not submit forms or save test results. Server-side form destinations are not visible to the crawler.

Form-recipient discovery also checks publicly exposed form fields and inline configuration. Script clues are displayed as unconfirmed candidates, never as proven delivery addresses.

## Niche and location choices

Open **Niche Library** from the sidebar to browse 35 categorized starter packs, edit search and negative terms, select packs, and preview the deduplicated keyword set. These local settings survive app restarts. See the [Niche Library guide](docs/features/A1-Niche%20Library/FEATURES-A1-README.md) for the full workflow and future RAG/chatbot integration plan.

Open **New Search** to prepare a local search draft. The starter library has 35 contractor and business niches in `packages/app/data/niches.json`. Add more through the side panel, entering one niche or a comma-separated list; each becomes a selectable chip. U.S. states and 31,948 places from the supplied `US_STATES_LOCATIONS.rar` are stored in `packages/app/data/us-states-locations.json`. Choose niches and states on the first screen, then click **Select locations** for a separate paginated location screen. Choose Search, By page, or By number from the custom selection-method dropdown, then select individual numbered places, all matches, a page range, or an inclusive location-number range. Custom niches and selected choices are saved to `search-criteria.json` in `C:\LeadsGhr\data`. Press **Search contractors** after selecting at least one location. The next page searches each distinct selected pack search term and location in order, one Chrome search at a time, and accumulates public result cards in a saved run table with business name, clickable website URL, phone, searched location, and visible address. Stop cancels the remaining queue; a challenge or error pauses it. Google Maps controls the returned results; each search is limited to loaded cards (up to 200), is not exhaustive, and is saved to local SQLite for resume and CSV re-export, never Supabase.

The Chrome search needs no external API key. It checks robots.txt, uses an empty temporary profile, pauses on challenges, and offers Stop and Retry controls. The Chrome process closes when the search finishes or is stopped. Its window visibility follows Profile preferences. Fully restart the Electron app after updating so its main process and preload expose the new scanner IPC.
