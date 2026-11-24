# LeadsGhr Scraper

A Chrome extension (`apps/scraper-extension`) that runs the searches you set up in LeadsGhr on Google Search's business list (the **More businesses** page, `https://www.google.com/search?q=...&udm=local`) and saves the results for the desktop app. It is separate from LeadsGhr Mailer and LeadsGhr Tracker and has its own license slot (`scraper`).

## Where it fits among the search sources

LeadsGhr can find businesses in three ways. All three save into the same kind of search run, so the results table, Source column, search box, and **Export CSV** work the same for each.

| Source | Started from | Runs in | Reads |
| --- | --- | --- | --- |
| Google Maps (default) | **New Search** → **Search contractors** | The desktop app's own fresh, signed-out Chrome | Google Maps' list of places, scrolled to the end |
| Google Search business list, in the app | **New Search**, with **Show Google Search business listings** on in Preferences → Search sources | The same desktop Chrome, after Maps for each location | The **More businesses** page, with the pages and pauses from **Search timing** |
| **LeadsGhr Scraper** (this extension) | **New Search** → **Send to LeadsGhr Scraper** | Your own Chrome, through the extension | The **More businesses** page, scrolled to the end, with the pages and pauses from **Search timing** |

Use the Scraper when the in-app Google Search source keeps hitting Google's check page: a normal Chrome profile is less likely to be stopped than an automated one. Reading Google Search is the owner-approved exception to Google's robots.txt in AGENTS.md (rule 5); it covers this page only.

## The complete flow

### 1. Install (once)

1. Open **LeadsGhr Scraper** in the desktop sidebar (Discovery tools) and select **Download extension ZIP**. An **Extension saved** dialog shows where `leadsghr-scraper.zip` was saved, with **Show in folder**. Extract it to a folder named `leadsghr-scraper` and keep that folder. (From source, `pnpm build:scraper-extension` creates `C:\LeadsGhr\extensions\leadsghr-scraper.zip` and the extracted folder beside it.)
2. **Use a separate Chrome profile that is not signed in to Google** (recommended), so a block by Google can never affect your own Google account.
3. In that profile open `chrome://extensions`, turn on **Developer mode**, select **Load unpacked**, and choose the `leadsghr-scraper` folder. After an update, select **Reload** (always use the same folder, so Chrome keeps the extension's ID).
4. Open the Scraper. Its first screen asks for a license key with a free Scraper slot (a build made with `LEADSGHR_MODE=local` skips this).
5. Open its settings (the gear, or **Set up** on the popup's yellow **Data folder not connected** strip), select **Choose folder**, and choose `C:\LeadsGhr\extensions\leadsghr-scraper\data`, then **Allow on every visit**. The desktop app and the Scraper exchange everything through this folder.

### 2. Send a job from the desktop app

In **New Search**, choose the niche, state, and locations, then select **Send to LeadsGhr Scraper** (next to **Search contractors**). LeadsGhr:

- creates a search run (source **Google Search**) in the local database,
- adds a job to `jobs.json` in the Scraper's data folder: one search per location, `<niche> in <place>`,
- opens **Scraper Results** for that run.

Every job you send is **saved in a list** (newest first, up to 50), so you can send several now and run them later, one at a time, in any order.

### 3. Run it in Chrome

Click the Scraper's toolbar icon. The **popup** is a summary, styled like LeadsGhr Mailer's:

- a **Job** dropdown (like the Mailer's template picker) listing the saved jobs by niche, state, and number of locations, with the date each was sent; pick the one to run,
- **Search n of m** with a progress bar and the time taken,
- businesses, with website, and ads skipped,
- the current status line,
- **Start scraping** (then **Pause**, or **Resume scraping** after a pause) and a square **Stop** button.

The **settings page** (the gear) has the full detail:

- the **Data folder** card,
- a **Jobs** table with every saved job: when it was sent, searches done, status (Not started, Running, Paused, Stopped by Google, Finished), businesses found, and a remove button. Select a row to pick that job,
- the picked job's card with the same controls, counts, and progress, and its **Locations** table with every location, its search, its status (Waiting, Reading page n, Done, Paused here, Stopped by Google), and the businesses found.

Each job keeps its own progress, so you can pause one, run another, and resume the first later from where it stopped. Only one job runs at a time: while it runs, the picker shows that job and is locked. **Removing** a job only takes it off the Scraper's list; the desktop run keeps the businesses already saved (its **Scraper Results** then says it no longer updates).

The run happens on the settings page, which must stay open while the Scraper works. **Start scraping** in the popup opens it in the background when needed; Pause and Stop in the popup control it.

### 4. What the Scraper does for each location

One search at a time, in order:

1. Opens a **new tab in the same Chrome window** as the settings page, at Google Search's business list for `<niche> in <place>`.
2. Reads the business cards: name, phone, address, and the **Website** button's link. It understands both of Google's layouts (the compact list and the larger photo cards). Ads are skipped and counted.
3. Moves down the list **one business at a time**, like a person reading it: brings the card into view, looks up its website, saves it, and pauses (**Pause on each listing**, 1.2 seconds with Normal) before the next one. The website is looked up from inside the Google tab: the Scraper requests the Website link the way the page would, with the profile's own cookies, and reads where Google's redirect points (the `webRequest` permission) without opening the business's site. When Google answers with a page of its own instead of a redirect (its redirect notice), the address is read from that page. If Google refuses or the address cannot be found, the business is saved without it and the desktop app looks it up later (a Website button always points somewhere, so it is never saved as "no website"). At the end of what is loaded, it loads more (pressing **More places** when Google shows it) until no new businesses appear.
4. Follows the next-page arrow, up to the **pages per location** from Search timing (5 by default, and at most 300 businesses).
5. Saves `results/<jobId>/<n>.json` after every business, so nothing is lost if it stops.
6. Closes the tab, waits, and opens the next location in a new tab.

Pauses keep it polite. They come from **Settings → Preferences → Search → Search timing** in the desktop app and are saved with the job when you send it (`pacing` in `jobs.json`), so changing them later does not affect jobs already in the list. With the default **Normal** preset: 1.2 seconds on each listing, 2.2 seconds before loading more (3 after **More places**, at most 12 loads per page), **4 to 7 seconds** between pages, at least **45 seconds** between locations, and a **5-minute break every 10 locations**. **Careful** and **Faster** presets, and every single pause, can be changed there; the lower limits cannot be passed. Jobs sent before this setting existed use Normal. The settings page's footnote shows the pauses of the picked job.

If Google shows a captcha, consent, or "unusual traffic" page, the Scraper saves what it has and stops with **Stopped by Google**; it never tries to get past the check. **Resume** later continues with the location where it stopped; finished locations are not searched again. Closing the settings tab also stops the run; the popup then shows it as interrupted.

### 5. See the results in the desktop app

The **LeadsGhr Scraper** page in the sidebar lists every job sent to the Scraper with its status, searches done, businesses, and websites found (and how many are still being looked up), refreshed every 5 seconds. **Open results** opens a job's Scraper Results at any time, also for jobs sent earlier.


The desktop app **watches the data folder**: each time the Scraper saves a business, it is imported within about a second, and Scraper Results and the Jobs table refresh at once. As a fallback, Scraper Results also checks every 3 seconds and every saved job is checked in the background every 20 seconds (so results arrive after a restart too). Only files that changed are imported:

- businesses are saved as rows of the run, with the source **Google Search**,
- the website the Scraper found is used as it is. A Website link it could not look up (a `google.com/goto` redirect) is looked up by the desktop app. Google refuses many lookups in a row from there, so they are paced: at most 12 per check, 1.2 seconds apart, a 90-second pause when Google refuses, and a refused link is tried again later instead of being saved as "no website". The page says how many websites are still being looked up and keeps updating until they are done (a few minutes for a few hundred businesses),
- a later save never erases a website, phone, or address already known,
- the page shows the Scraper's status and progress while it runs.

The toolbar has the result count on the left and, on the right, the search box, **Open data folder**, and **Export CSV**. The table has a Source column. **Show businesses without a website** in Preferences decides whether businesses with no website are listed; while websites are still being looked up, those businesses count as "without a website" for a moment. **Export CSV** saves the results like any other run, and the run appears with the others in the app.

## Files (the data folder)

`C:\LeadsGhr\extensions\leadsghr-scraper\data\` (kept by every rebuild and update):

| File | Written by | Contents |
| --- | --- | --- |
| `jobs.json` | Desktop app | The saved jobs, newest first: each job's searches and the run they are saved into |
| `jobs-removed.json` | Scraper | Ids of jobs removed from the list in the Scraper |
| `progress/<jobId>.json` | Scraper | That job's search being read, and why it stopped (paused, stopped, blocked by Google, finished) |
| `results/<jobId>/<n>.json` | Scraper | The businesses found for search n, rewritten after every page |

Earlier versions kept a single `job.json` and `progress.json`; they are still read, and the next job sent moves the old job into `jobs.json`. The formats and limits are in `packages/schemas/src/scraper.ts` (tested in `packages/schemas/tests/scraper.test.ts`). The desktop side is `apps/desktop/src/scraper-bridge.ts`; the screens are `packages/app/src/scraper-extension-page.tsx` (download) and `packages/app/src/scraper-results-page.tsx` (results). Nothing the Scraper finds is sent to Supabase; only the license check talks to it.

## Saving to the data folder

Each save replaces the whole file. On Windows that replace can fail for a moment while another program has the file open (the desktop app reading it, antivirus, or the search indexer); Chrome then reports an error such as `InvalidStateError`. The Scraper retries such a save a few times, and a failed save in the middle of a location does not stop it, because the next save writes the complete file again. Only if the last save of a location keeps failing does the run stop, with the reason shown (*Stopped: could not save to the data folder ...*); **Resume** then reads that location again from its first page, without counting its businesses twice.

## Limits

- Google may still show its check page, especially for long jobs; split large jobs into smaller ones and run them at different times.
- The Scraper runs while its settings tab stays open; closing that tab stops the run (resume later).
- One job runs at a time; the others wait in the list. The list keeps the 50 newest jobs.
- The `scraper` license slot needs the updated `license` Edge Function (`supabase/functions/license`), deployed by pushing.
