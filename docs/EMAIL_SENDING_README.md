# Email Sending: LeadsGhr Mailer

Email Sending is its own Chrome MV3 extension, **LeadsGhr Mailer**, in `apps/mailer-extension/` (package `@leadsghr/mailer-extension`). It only sends: it adds no tracking pixel, ticks, or compose line to Gmail, does not track opens, and has no Supabase connection.

The desktop **Email Sending** page is the Mailer's install page (no back button). The desktop **Email Templates** page is the template list: **Add template** opens a right-side panel for a name, subject, plain-text or HTML body, and a preview. The table's action column is Edit, Preview, and Delete; Delete asks for confirmation. Saving writes `C:\LeadsGhr\extensions\leadsghr-mailer\data\templates.json`, which the Mailer popup and settings page read. An older copy at `C:\LeadsGhr\data\email-templates.json` is imported only when that Mailer file is missing. The Mailer settings page can still edit the same file. **Download extension ZIP** saves `leadsghr-mailer.zip` and then shows an **Extension saved** dialog with the path, next steps, and **Show in folder**. Extract it to a folder named `leadsghr-mailer` and load it with **Load unpacked**. Rebuild with `pnpm.cmd build:mailer-extension`: it builds `apps/mailer-extension/dist`, archives it to `apps/mailer-extension/leadsghr-mailer.zip`, copies that ZIP to `C:\LeadsGhr\extensions\leadsghr-mailer.zip`, and extracts it into `C:\LeadsGhr\extensions\leadsghr-mailer\` (emptied first, except its `data` folder). Load that folder once with **Load unpacked**; after each rebuild, select **Reload** on LeadsGhr Mailer in `chrome://extensions`. No manual extraction is needed, and because the folder path stays the same, Chrome keeps the extension's saved templates and settings.

Extension files: `popup.html` and `src/popup.tsx` (toolbar popup), `settings.html` and `src/settings.tsx` (settings page), `src/background.ts` (sending queue only), `src/gmail.ts` (Gmail content script that fills and sends compose windows), and `src/email-sending/` (modules below). The logo is the paper plane in `public/icon.svg` / `icon.png`.

## Architecture

| Module | Role |
| --- | --- |
| `csv.ts` | Parse recipient CSV rows, detect the email column, keep ordered unique addresses and row fields |
| `recipients-file.ts` | Read a `.csv` or `.xlsx` file (`read-excel-file`, sheet with the most recipients) into recipients; 10 MB limit |
| `template.ts` | Load subject/body templates and render `{{field}}` placeholders; a body with no HTML tags is sent as plain text, one line per line (blank lines kept) |
| `range.ts` | Validate inclusive 1-based From/To ranges and slice the recipient list |
| `storage.ts` | Saved templates and preferences in the data folder (`data/templates.json`, `data/preferences.json`); the active job, send log, and popup draft in `chrome.storage.local` |
| `data-folder.ts`, `data-folder-panel.tsx` | Read data files from the extension folder; write them through the folder chosen once on the settings page (**Data folder**) |
| `runner.ts` | Background queue: start, pause, resume, cancel, polite delay alarms |
| `compose.ts` | Gmail content-script compose fill and Send click |
| `preferences.tsx` | Settings page **Preferences**: delay type (`sendingPreferences.delayMode` in `chrome.storage.local`) |
| `panel.tsx` | Settings page: saved templates (New, Edit, Delete, Import from file) |
| `../popup.tsx` | Toolbar popup: saved-template dropdown, CSV/Excel upload, Start/End/Delay, Send/Pause/Resume and Stop |

### Writing templates

A template body is either **HTML** or **plain text**. A body with no HTML tags is plain text: the Mailer keeps its line breaks. HTML bodies are inserted into Gmail's compose window as written, so use email-safe HTML: tables for layout, inline `style` attributes (Gmail drops `<style>` blocks), web-safe fallback fonts, and buttons as styled links (`<a href="...">` inside a table cell). Images are most reliable with a public `https://` URL; files on this computer cannot be referenced. The example templates in `data/templates.json` (Introduction and How we can help in HTML, and a plain-text Follow-up) use the Roboto font and show the LeadsGhr Mailer paper-plane logo from a public Supabase Storage link: `https://<project-ref>.supabase.co/storage/v1/object/public/assets/email-assets/leadsghr-mailer-logo.png` (128 × 128 PNG, shown at 28 px and 24 px). Gmail removes images embedded as base64 `data:` code, so logos and other pictures must be hosted.

**Email images (Supabase Storage):** migration `supabase/migrations/0004_assets_bucket.sql` creates the public `assets` bucket (PNG, JPEG, or GIF, 512 KB limit; anyone can read an object by its URL, only the service role can upload). Email images go in its `email-assets/` folder; the logo is `assets/email-assets/leadsghr-mailer-logo.png`, from the source file `apps/mailer-extension/email-assets/leadsghr-mailer-logo.png`. The bucket holds public, non-sensitive files only, never leads, recipients, subjects, message bodies, or exports. Until the migration is deployed with the rest of the Supabase changes, set it up once in the Supabase dashboard: Storage → **New bucket** named `assets` with **Public bucket** on; open it, **Create folder** `email-assets`, open the folder, and upload the PNG keeping its file name.

### Where Mailer data is saved

Saved templates and preferences are files on this computer, in the extension's own folder:

| File | Holds |
| --- | --- |
| `C:\LeadsGhr\extensions\leadsghr-mailer\data\templates.json` | Saved templates: a list of `{ id, name, subject, bodyHtml, updatedAt }`. The desktop Email Templates page also stores `format` (`plain` or `html`); the Mailer ignores it and still decides plain versus HTML from the body |
| `C:\LeadsGhr\extensions\leadsghr-mailer\data\preferences.json` | Preferences: `{ delayMode }` (`between` or `steps`) |

They are not removed when Chrome's site or extension data is cleared, and `pnpm.cmd build:mailer-extension` never deletes or overwrites the `data` folder (it replaces everything else in `leadsghr-mailer`). They are not in the repository, not synced, and not sent to Supabase. Back up the `data` folder to keep templates when moving to another computer.

How the extension uses the folder (`src/email-sending/data-folder.ts`):

- **Reading** needs no permission: the popup, settings page, and background worker fetch `chrome-extension://<id>/data/<file>`, which Chrome serves straight from the unpacked folder.
- **Writing** uses Chrome's File System Access API, because extensions cannot write files on their own. Open settings (popup gear button) and, under **Data folder**, select **Choose folder**, open `C:\LeadsGhr\extensions\leadsghr-mailer\data`, choose **Select Folder**, and allow editing. The Mailer checks that the chosen folder really is its own data folder and rejects any other. Chrome remembers the choice (in the extension's IndexedDB) but may ask again in a later session; the next **Save**, **Delete**, or preference change then shows Chrome's **Allow** prompt, or select **Allow access** in Data folder. If the IndexedDB entry is cleared, choose the folder again; the files are unaffected.
- **Moving older data:** templates and preferences that earlier builds kept in `chrome.storage.local` (`sendingTemplates`, `sendingPreferences`) are written to the folder the first time it is connected (only when the folder has no file for them yet), then removed from Chrome storage.
- Short-lived state stays in `chrome.storage.local`: the running job (`sendingJob`), the send log used for the finished "Sent N of M" line (`sendingHistory`), and the popup's current inputs (`sendingDraft`). `mailerDataChangedAt` only signals open pages to re-read the files.

Campaign state stays in the Chrome profile. Recipients, subjects, and bodies are not sent to Supabase.

## Flow

1. Install the extension from **Email Sending → Download extension ZIP**.
2. Open LeadsGhr Mailer settings (popup gear button) and create templates under **Saved templates**: select **New template**, enter a name, subject, and body, or **Import from file** (`.txt` with a `Subject:` line, `.json` with `subject`/`bodyHtml`, or `.html`), then save. Placeholders such as `{{email}}` and CSV/Excel column names (for example `{{name}}`) are supported. Gmail's own templates (More options → Templates) are not used.
3. Open Gmail, click the LeadsGhr Mailer toolbar icon, and pick a saved template in the **Template** dropdown. With none saved, the dropdown links to settings.
4. Click **Browse files to upload** (or drop a file) and choose a `.csv` or `.xlsx` recipient file. The email column is detected by header name, else by content. Start and End (shown with Delay directly under the template dropdown) default to 1 and the recipient count. The chosen file appears below the upload area as its name with a × button that removes it; with no file chosen, nothing is shown there.
5. Set a delay of 5–120 seconds and select **Send N emails**. Keep the Gmail tab open.
6. The footer shows "N of M sent" with a countdown to the next send. Use **Pause**, **Resume**, or **Stop** (square button). Sending continues in the background if the popup closes; reopening it shows the current progress. A finished run shows "Sent N of M".

### Delay types

Choose how the popup's **Delay (s)** (5–120 seconds, default 10) is used under **Preferences** on the settings page. The choice is saved immediately and applies to the next run; a run already sending keeps the type it started with.

| Delay type | What the delay means | Example with 10 s |
| --- | --- | --- |
| **Wait between emails** (default) | Each email is opened, filled, and sent right away. The delay is the wait after one email has been sent before the next starts. | Email 1 sent at 0:03, email 2 starts at 0:13. |
| **Spread across steps** | The delay is the total time for one email, split evenly over its 4 steps: open compose, fill the recipient, fill the template (subject and body), click Send. The next email starts when the full delay has passed. | Compose 0:00, recipient 0:02.5, template 0:05, Send 0:07.5, next email 0:10. |

With **Spread across steps**, steps are timed from the first step, so a slow step does not push the later ones back. If Gmail takes longer than the remaining time to finish sending, the next email starts about half a second after it does. The first email of a run, and the first after **Resume**, starts about half a second after the button is pressed. Chrome's alarm timer can fire a second or so late. These short waits work because the Mailer is loaded unpacked; a Chrome Web Store build would be held to Chrome's 30-second minimum alarm interval.

The file picker that opens from **Browse files to upload** is the Windows file dialog; Windows and Chrome choose where it appears, and the extension cannot position it.

The popup saves its template choice, file, range, and delay in Chrome as you change them, so closing it loses nothing. It shows no template preview or send history.

## Limits

- Sends through the signed-in Gmail UI, one message at a time. Gmail DOM changes can break compose control.
- A send that fails stops the run with the error shown in the popup footer.
- Reload Gmail after installing or updating the extension so the content script can drive compose.
- The Mailer does not track opens.
- This is not a mass-mail API, SMTP relay, or proof of inbox delivery. Start with a small range while verifying.
