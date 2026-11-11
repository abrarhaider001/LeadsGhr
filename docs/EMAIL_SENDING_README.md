# Email Sending: Gmail extension campaigns

Email Sending runs in the Chrome MV3 companion under `apps/extension/src/email-sending/`. The desktop **Email Sending** page explains setup and downloads the same ZIP used for tracking (`apps/extension/leadsghr-mail-tracking.zip`). Rebuild with `pnpm.cmd build:extension` after source changes.

## Architecture

| Module | Role |
| --- | --- |
| `csv.ts` | Parse recipient CSV, detect the email column, keep ordered unique addresses and row fields |
| `template.ts` | Load subject/body templates and render `{{field}}` placeholders |
| `range.ts` | Validate inclusive 1-based From/To ranges and slice the recipient list |
| `storage.ts` | Persist the active job and local send history in `chrome.storage.local` |
| `runner.ts` | Background queue: start, pause, resume, cancel, polite delay alarms |
| `compose.ts` | Gmail content-script compose fill and Send click |
| `panel.tsx` | Extension settings UI on the Sending tab |

Campaign state stays in the Chrome profile. Recipients, subjects, and bodies are not sent to Supabase.

## Flow

1. Install the extension from **Email Sending → Get Chrome extension** (or Email Tracking).
2. Open Gmail, then open LeadsGhr Mail settings and choose **Sending**.
3. Enter or import a template. Placeholders such as `{{email}}` and CSV column names are supported.
4. Import a CSV of emails. Set inclusive From/To numbers for the slice to send.
5. Choose a delay of at least 5 seconds, then **Start sending**. Keep the Gmail tab open.
6. Use Pause, Resume, or Cancel as needed. Recent sends appear in the history list.

## Limits

- Sends through the signed-in Gmail UI, one message at a time. Gmail DOM changes can break compose control.
- Reload Gmail after installing or updating the extension so the content script can drive compose.
- Image-load tracking remains optional on the Tracking tab and still needs the public HTTPS pixel endpoint.
- This is not a mass-mail API, SMTP relay, or proof of inbox delivery. Start with a small range while verifying.
