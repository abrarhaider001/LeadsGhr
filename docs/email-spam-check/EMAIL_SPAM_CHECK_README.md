# Email Spam Check

The desktop Email Spam Check page analyzes an email subject and body locally. It does not send the draft, call an external service, or save it to the local database or Supabase. Its original 160 categorized phrase rules came from the user-provided `spam_engine_project.zip`; a curated extension brings the catalog to **543 unique phrases**. The Python web server and FastAPI code are not used.

## User flow

The desktop page uses a two-panel editor: a white draft panel on the left and a white analysis panel on the right. Before the first check, the analysis panel uses the shared `EmptyState` (No Data Found!) also used by Email Filtering and other project tables. Attachment selection sits below the message as a compact metadata control. On narrow windows, the panels stack vertically.

1. Enter a subject and message. The live counters show the current length; the subject is limited to 120 characters and the body to 10,000 characters.
2. Optionally select attachments. Only their names and sizes are inspected; file contents are not read or uploaded.
3. Select **Check content**. Review the content risk score, categorized findings, point contributions, and highlighted phrase matches with their positions in the subject and body.
4. Select **Suggest clearer wording** to generate a local, rule-based revision. Compare the original and suggested risk scores, review the change list, edit the proposed subject or body, then select **Apply to draft**. Run the check again after further edits.
4. Select **Clear** to reset the draft and findings.

## Checks

The checker uses 543 weighted phrases in four categories: urgency, financial claims, shady or phishing-like wording, and overpromising. Longer phrases take precedence so overlapping matches are counted once. Subject phrase weights are multiplied by 1.5. It also checks ALL CAPS words (excluding a configured acronym list), repeated punctuation and currency signs, subjects longer than eight words, multiple links, URL shorteners, IP-address links, HTTP links, and optional attachment size metadata. Personalization tags such as `{{firstName}}` reduce a nonzero score by four points and are protected during rewriting. The added phrase families are maintained in `scripts/expand-spam-rules.mjs`; running it again is idempotent.

The risk score is the weighted point total, capped at 100. Scores up to 20 are Low, above 20 through 50 Moderate, and above 50 High. This is a **content risk heuristic**, not a measured probability that an email will enter spam. The checker does not inspect sender reputation, SPF/DKIM/DMARC, recipient engagement, domain or link reputation, mailbox placement, or sending volume.

## Rewrite behavior

The rewrite replaces known phrases with the catalog alternatives, normalizes capitals, and reduces repeated punctuation. It preserves personalization placeholders. It leaves all URLs intact so a working destination is not silently removed or changed; flagged links require manual review. The added phishing and credential-request phrases are **manual-review only** and are never automatically rewritten. The suggestion is editable and never silently replaces the user's draft. It is not AI generated and cannot guarantee that meaning, tone, or claims remain accurate. No finite phrase list can cover all email content, and a matched phrase can appear in a legitimate message.

Implementation: `packages/app/src/email-spam-engine-page.tsx`, `packages/app/src/spam-engine-data.ts`, and `packages/app/data/spam-rules.json`; styles are in `packages/ui/src/styles.css`.
