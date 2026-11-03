# Implementation status

The active product is Electron desktop. The local scan IPC calls the shared robots-aware crawler, saves a lead and run result to SQLite, and runs through the user's network. The adapters provide SQLite leads, local job persistence, public HTTP with private-address blocking and redirect rechecks, and disk file saving.

The React dashboard is still illustrative. Search/discovery, lead review, exports UI, account sign-in, and most specification features require implementation. Supabase has an account/profile-only migration; applying it to a new Supabase project requires project configuration. Existing remote lead/run tables from an older deployment are not removed by this migration and need a separate reviewed data-retention decision.

Native Electron dependencies may require a platform-specific rebuild before packaging. Use `pnpm dev` for development, `pnpm typecheck` for TypeScript and `pnpm build` for a desktop package.
