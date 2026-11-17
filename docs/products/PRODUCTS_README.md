# Desktop product

LeadsGhr is one Electron desktop app. Its React renderer requests operations through a narrow, Zod-validated preload API. Electron main performs public-site crawling using the user's PC and IP. SQLite stores extracted leads, runs, and local jobs in `C:\LeadsGhr\data\leadsghr.sqlite`; exports go to local files.

Supabase Auth and the RLS-protected user profile table hold account identity, display name, plan and preferences only. No extracted contacts, source pages, scan results or exports are uploaded. A future email/manual-page Chrome extension is a separate project, not an installed component of this app.

The original specification's web, hosted-worker and extension descriptions are historical requirements. Desktop capability and implementation status are documented in the adjacent guides.
