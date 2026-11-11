# Desktop architecture and folder structure

`apps/desktop/src/crawl-runs.ts` owns dedicated SQLite `crawl_runs`, `crawl_run_rows`, and `crawl_exports` tables, validated IPC, query checkpoints, and automatic or user-chosen CSV file writes. `packages/export/src/index.ts` builds spreadsheet-safe CSV bytes. `packages/app/src/crawl-run-bridge.ts` types the renderer IPC; `search-results-page.tsx` persists streamed rows and checkpoints; `exports-page.tsx` and `dashboard-page.tsx` read run/export summaries. Saved Maps rows remain separate from the general lead table. CSV files default to Documents/LeadsGhr/exports. No crawl data is sent to Supabase.

The Pipeline sidebar entry opens `packages/app/src/pipeline-overview-page.tsx`, with cards explaining search, URL queue, crawl, and export. It lists saved pipelines for resumption or deletion. Creation uses `search-setup-page.tsx` for required name and provider cards, then separate niche, state, and location steps. `pipeline-timeline.tsx` marks completed selections. Name and provider are stored on `crawl_runs` through a SQLite migration; only `google-maps` can currently create an automated run. `search-results-page.tsx` first saves Maps results, then sends business websites to `apps/desktop/src/pipeline-pages.ts`. That Electron module owns the persistent `pipeline_pages` SQLite queue and two overlapping stages: HTTP prefetch and rendered page inspection. It validates public targets, checks robots.txt, uses polite delays, pauses on challenges, and stores extracted emails on the matching business row. `pipeline-export-page.tsx` shows the CSV filename and path after the run ends. New Search continues to use the search-only result flow.

```text
apps/desktop/
  src/main.ts       Electron lifecycle, validated IPC and local scan orchestration
  src/preload.ts    Narrow renderer bridge
  src/adapters.ts   SQLite, public HTTP, local queue and disk adapters
  src/email-verify.ts Email Validation IPC and job control
  src/email-verify/ Pipeline, DNS, SMTP client, and Valid/Invalid SQLite cache
  src/local-email-tracking.ts Local loopback pixel and tracking records
  src/renderer.tsx  Shared React app
packages/
  app/              Desktop pages, splash, niche and location JSON data
  ui/               shadcn components, Tailwind globals, tokens and light-only styles
  schemas/          Zod contracts
  core/ extract/ crawler/ quality/ export/  Reusable product logic
  platform/         Adapter interfaces
supabase/migrations/ Account/profile schema, plus optional opaque mail-tracking tokens
apps/extension/     Active MV3 Gmail mail companion (sending + tracking)
  src/email-sending/ Modular campaign CSV, template, range, queue, and compose helpers
docs/              Current guides plus historical specification archive
```

All extraction information belongs in local SQLite or files. Supabase holds user auth and profile data; the optional mail-tracking function stores opaque pixel tokens and image-load counts only. Shared packages do not import Node-only modules; Electron main owns SQLite, network and filesystem access. Email Validation pipeline helpers live in `packages/quality/src/email-verify/`; DNS, SMTP sockets, and the local verify cache stay under `apps/desktop/src/email-verify/`. The legacy web/API/worker folders are inactive. `apps/extension` is an active MV3 Gmail mail build in the pnpm workspace. Campaign recipients and bodies stay in Chrome storage only.

The New Search page has a niche/state step and a separate location step with numbered chips and inclusive page and location-number range controls. It reads `packages/app/data/niches.json` and `packages/app/data/us-states-locations.json`. Electron main validates and stores custom niches and selections in a local `search-criteria.json` file under the app user-data directory.

Crawl Results is a React page in `packages/app`. The React results page queues all selected niche/location queries and runs them one by one. Electron main validates each query and starts a separate, clean Chrome instance through `apps/desktop/src/maps-scan.ts`. The scanner checks robots.txt, reads visible public result cards with polite scrolling, streams rows over IPC, and stops on challenges or user cancellation. The temporary Chrome profile is removed after the run; filtered streamed rows are saved in dedicated local crawl-run tables, separate from the lead table, with query checkpoints for resume.

Profile preferences use the Zod contract in `packages/schemas`. Electron main loads and saves `preferences.json` in the app user-data directory through validated preload IPC. The React profile component renders Profile from the sidebar footer and Preferences from the expandable Settings item in Workspace. Preferences groups Crawler, Search, and Email Validation controls. Email Validation stores MAIL FROM, EHLO, recipients per session, and pace for the local SMTP probe. The Chrome visibility setting reaches `maps-scan.ts` before a scan starts; selected result fields are retained in renderer memory and determine the table columns. Crawler keeps its sandboxed webview mounted offscreen when the preview option is off so scrolling and extraction continue. Account identity is a placeholder until Supabase Auth is connected.

Brand SVGs live in `public/`; the desktop PNG and ICO live in `apps/desktop/resources/`. `scripts/regenerate-brand-icons.mjs` rasterizes the mark-only SVG. The Profile character avatar uses `react-nice-avatar` with a locally stored seed; it is independent of account authentication and brand assets.

Crawl Results currently requests Maps listings only. Electron main forces linked-website email scanning off, including for older saved preferences. The separate Crawler test remains available for a user-entered public page. Website email scanning code is retained for a later feature, but is not called by the Crawl Results flow. Regular Google `/search` pages are excluded because robots.txt disallows automated access.

The Niche Library is `packages/app/src/niche-library-page.tsx` with merging/edit logic in `niche-library-data.ts` and 35 versioned starter packs in `packages/app/data/niche-packs.json`. User overrides remain in Electron user-data `search-criteria.json`; the built-in pack file is immutable at runtime. Crawl Results expands selected pack terms into sequential location queries. See [A1](../features/A1-Niche%20Library/FEATURES-A1-README.md).
