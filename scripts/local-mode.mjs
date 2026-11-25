// App mode for the Chrome extension builds: LEADSGHR_MODE=local (environment, or the repository's .env file)
// builds the extensions without the license check; production (the default, and any other value) keeps it.
// The same rules as packages/license `isLocalMode` and `modeFromEnvFile`. See AGENTS.md, "License keys".
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** True when LEADSGHR_MODE is `local` for builds started in `repositoryRoot`. */
export function readLocalMode(repositoryRoot) {
  let value = process.env.LEADSGHR_MODE
  if (value === undefined) {
    try {
      const line = readFileSync(join(repositoryRoot, '.env'), 'utf8').match(
        /^\s*LEADSGHR_MODE\s*=\s*(.*)$/m,
      )
      value = line?.[1].replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2')
    } catch {
      /* No .env file: production mode. */
    }
  }
  return (value ?? '').trim().toLowerCase() === 'local'
}
