# Desktop platform capabilities

| Capability | Desktop status |
| --- | --- |
| Public-site HTML contact extraction | Local crawler and extractor wired through Electron IPC |
| Robots and polite delays | Shared crawler checks robots.txt and waits between pages |
| Leads, runs and jobs | Local SQLite |
| CSV and other exports | Local disk adapter; export UI still planned |
| User identity and profile | Supabase account schema; sign-in UI still planned |
| Hosted scraping, team Realtime, server queues | Not part of this desktop product |
| Email sending and opened-page manual extraction | Planned for a separate Chrome extension |

The app uses the user's network and IP. Features that require a hosted worker, browser extension permissions, or a server-side Supabase lead store cannot run in this desktop architecture as originally written. Their desktop equivalents must use local jobs or user-directed Electron workflows.
