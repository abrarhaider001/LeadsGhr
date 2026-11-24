# LeadsGhr Scraper

A Chrome extension (`apps/scraper-extension`) that runs the searches you set up in LeadsGhr on Google Search's business list (the **More businesses** page) and saves the results for the desktop app. It is separate from LeadsGhr Mailer and LeadsGhr Tracker and has its own license slot (`scraper`).

## How it works

1. **Desktop app:** in **New Search**, choose the niche, state, and locations, then select **Send to LeadsGhr Scraper** (next to **Search contractors**). LeadsGhr creates a search run and writes `job.json` to the Scraper's data folder, then opens **Scraper Results**.
2. **Chrome:** open LeadsGhr Scraper from the toolbar. The **popup** (styled like LeadsGhr Mailer's) is a summary: the job (niche, state, number of locations), "Search n of m" with a progress bar, the businesses, with-website, and ads-skipped counts, and the current status; a yellow **Data folder not connected · Set up** strip appears until the folder is connected (like LeadsGhr Tracker's notice). Its footer has **Start scraping** (or **Pause**, **Resume scraping**) and a square **Stop** button. The **settings page** (the gear, styled like LeadsGhr Mailer's settings) has the **Data folder** card, the **Search job** card with its controls, progress, and counts, and a **Locations** table listing every selected location with its search, status (Waiting, Reading page n, Done, Paused here, Stopped by Google), and businesses found. The run happens on the settings page (it stays open while the Scraper works); **Start scraping** in the popup opens it in the background when needed, and Pause and Stop in the popup control it.
3. **The Scraper runs one search at a time**, each in a new tab in the Scraper's own Chrome window: it opens Google Search's business list for `<niche> in <place>`, reads every business card (name, phone, address, Website button; both Google's compact list and its larger photo cards), skips ads, and scrolls to the bottom (pressing **More places** when Google shows it) until no new businesses load; then it follows the next-page arrow, at most 5 pages per search. When a search is finished its tab closes and the next search opens a new tab. It pauses 4 to 7 seconds between pages and at least 45 seconds between searches, and saves `results/<jobId>/<n>.json` after every step.
4. **Desktop app:** **Scraper Results** reads the result files every few seconds, turns each Website link (a Google redirect) into the business's own address, and saves the businesses as rows of the run, with the source **Google Search**. The table has a search box and a Source column; **Export CSV** saves it like any run.

If Google shows its "unusual traffic" check page, the Scraper saves what it has and stops; it does not try to get past the check. **Resume** later continues from the search where it stopped (finished searches are not repeated). This is the owner-approved exception to Google's robots.txt described in AGENTS.md (rule 5).

## Files (the data folder)

`C:\LeadsGhr\extensions\leadsghr-scraper\data\` (kept by every rebuild):

| File | Written by | Contents |
| --- | --- | --- |
| `job.json` | Desktop app | The searches to run and the run they are saved into |
| `progress.json` | Scraper | The search being read, and why it stopped (paused, stopped, blocked by Google, finished) |
| `results/<jobId>/<n>.json` | Scraper | The businesses found for search n, rewritten after every page |

The formats and limits are in `packages/schemas/src/scraper.ts` (tested in `packages/schemas/tests/scraper.test.ts`). The desktop side is `apps/desktop/src/scraper-bridge.ts`; the screen is `packages/app/src/scraper-results-page.tsx`.

## Install and first run

1. Get it: open **LeadsGhr Scraper** in the desktop sidebar and select **Download extension ZIP**, then extract it to a `leadsghr-scraper` folder. From source, `pnpm build:scraper-extension` creates `C:\LeadsGhr\extensions\leadsghr-scraper.zip` and the ready-to-load folder beside it.
2. **Use a separate Chrome profile that is not signed in to Google** (recommended), so a block by Google can never affect your own Google account.
3. In that profile open `chrome://extensions`, turn on **Developer mode**, select **Load unpacked**, and choose `C:\LeadsGhr\extensions\leadsghr-scraper`. After later rebuilds, select **Reload**.
4. Open the Scraper's settings (the gear, or **Set up** in the popup), select **Choose folder**, and choose `C:\LeadsGhr\extensions\leadsghr-scraper\data`; then **Allow on every visit**.
5. Enter a license key with a free Scraper slot, or build with `LEADSGHR_MODE=local` while testing.

## Limits

- Google may still show its check page, especially for long jobs; split large jobs into smaller ones and run them at different times.
- The Scraper runs while its settings tab stays open; closing that tab stops the run, and the popup then shows it as interrupted (resume later).
- The `scraper` license slot needs the updated `license` Edge Function (`supabase/functions/license`), deployed by pushing.
