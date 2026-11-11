# Email Tracking: local test and Gmail extension

## Gmail extension

Click the LeadsGhr icon in Chrome's toolbar to open a compact popup. **Tracking report** shows locally stored message counts, total image loads, up to three recent messages, and a Refresh counts action. **Settings** lets you turn tracking on or off by default for Gmail drafts and shows whether an endpoint and registration key are present. **Open full settings** opens the existing page for the public HTTPS endpoint, registration key, and complete tracked-message list. The popup does not add campaigns or other features from the visual reference. The preference is stored in Chrome and updates the Gmail compose control; an individual draft can still be toggled separately.

The extension ZIP is available from **Email Tracking → Get Chrome extension → Download extension ZIP** in the desktop app. Extract it, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose the extracted folder containing `manifest.json`. The same build artifact is at `apps/extension/leadsghr-mail-tracking.zip`.

The install page places a direct ZIP download button beside the introduction. Three setup cards explain extraction, loading the folder into Chrome, and configuring the public endpoint before reloading Gmail. The download action reports the saved ZIP path or cancellation. Use the back button to return to Email Tracking.

This is an MV3 extension for Gmail. A compose window shows a LeadsGhr tracking indicator and an on/off control. When tracking is on, clicking Gmail **Send** registers an opaque UUID, inserts a 1×1 image into the message, and then sends it. While the extension is enabled, Gmail's Sent rows show two gray ticks by default. After a tracked send is confirmed, the first tick turns purple. After an image load is observed, the second tick turns purple and the load count appears. Gray ticks on an untracked message do not imply that it was sent with tracking. The LeadsGhr logo sits beside Gmail's top-right Settings control and opens the full extension settings page. Recipient, subject, and sent time are stored in the Chrome profile, not the online tracking table. Gmail DOM changes may break placement or row matching; sending is blocked if pixel registration fails, and the user can turn tracking off to send normally.

**A public HTTPS endpoint is required for real recipient opens.** The local loopback test below cannot provide one. The supplied Supabase migration `supabase/migrations/0002_mail_tracking.sql` stores opaque tokens and image-load counts. `supabase/functions/mail-tracking/index.ts` serves the pixel and count requests. To run it, the owner must apply that migration, set a long random `MAIL_TRACKING_REGISTRATION_KEY` secret on the function, and deploy the function with JWT verification disabled as specified in `supabase/config.toml`. In extension settings, enter `https://<project>.supabase.co/functions/v1/mail-tracking` and the same registration key. The extension asks Chrome for permission to that origin when settings are saved. Do not enter the Supabase service role key in the extension. The service role stays server-side in the function environment.

Deployment requires a Supabase project and CLI login. From the repository root, link the intended project, apply the migration with `supabase db push`, set the function secret with `supabase secrets set MAIL_TRACKING_REGISTRATION_KEY=<long-random-value>`, then deploy with `supabase functions deploy mail-tracking --no-verify-jwt`. These commands change the hosted project and are for the owner to run after review; this repository change did not deploy anything. Keep the key private and give it only to Chrome profiles allowed to register tracking pixels. This single-key setup is a prototype, not per-user authentication or billing.

To test: install the extracted extension, configure its endpoint/key, reload Gmail, compose a message to an inbox you control, keep **Tracking on**, and send. Check the extension settings page for the new record. Open the received email with images enabled, wait about a minute, and select **Refresh counts**. The sent row and settings page should show purple double ticks and an image-load count above zero. First test the extension in an isolated Gmail account: Gmail UI changes and image proxy behavior can affect results. No real message was sent during development or automated checks.

The endpoint ignores image loads until after Gmail sends and the extension arms the token, plus a short delay to reduce compose-time false opens. Google or other mail image proxies can cache or prefetch images; therefore a load count is **image requests observed**, not a reliable unique-person or read count. If images are blocked, opens may be missed. Some Gmail layouts or send methods may not trigger the compose integration. The extension has not been manually exercised in a live Gmail session; verify a test send before relying on it.

Rebuild the ZIP after source changes on Windows with `pnpm.cmd build:extension`. This builds `apps/extension/dist` and archives its contents to `apps/extension/leadsghr-mail-tracking.zip`. Restart or reload the unpacked extension in Chrome after replacing its files.

## Local test

The Email Tracking page demonstrates the open-event path on the user's computer. It does **not** send email, confirm delivery, or observe a real recipient's inbox.

## Test flow

1. Run `pnpm.cmd dev` and open **Email Tracking**.
2. Enter a recipient address and subject, then select **Create test record**. This saves a record in the desktop SQLite database.
3. Select the launch icon in the record's **Actions** column. The browser opens a page served by LeadsGhr on `127.0.0.1`. Its one-pixel image requests a unique tracking URL.
4. Return to Email Tracking. Within about three seconds the row shows **Open detected**, an image-load count, and the last-load time. Reload the preview to increment the count.
5. Restart LeadsGhr. The saved record and count remain in SQLite.
6. To remove a test record, select its delete icon in **Actions** and confirm. This removes the local SQLite row and disables its local preview link. **Get Chrome extension** stays at the top right of the Email Tracking page.

## Backend and limits

`apps/desktop/src/local-email-tracking.ts` creates `local_email_tracking` in `leadsghr.sqlite` under Electron's user-data directory. A random UUID identifies each record; a separate random token appears in the pixel URL. The HTTP listener binds to loopback on an ephemeral port, serves a 1×1 GIF, and records the first and latest requests plus a count. The port and preview URL change when the app restarts. Electron IPC validates create, preview, and delete IDs with Zod schemas and exposes create, list, preview, and delete methods through the preload bridge. The renderer polls the local record list while the page is open.

This local endpoint cannot receive requests from a recipient on another computer and stops when the desktop app exits. A real send-and-open feature needs an email sender, a public HTTPS pixel endpoint, durable online event storage, account-scoped sync, and privacy controls. An image request means **open detected**, not proof that the person read the message; mail clients may block or preload images.
