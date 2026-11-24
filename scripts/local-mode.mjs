// Local mode for the Chrome extension builds: LEADSGHR_LOCAL_MODE=true (environment, or the repository's .env file)
// builds the extensions without the license check. The same rules as packages/license `parseLocalMode`
// and `localModeFromEnvFile`. See AGENTS.md, "License keys".
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** True when local mode is on for builds started in `repositoryRoot`. */
export function readLocalMode(repositoryRoot) {
  let value = process.env.LEADSGHR_LOCAL_MODE
  if (value === undefined) {
    try {
      const line = readFileSync(join(repositoryRoot, '.env'), 'utf8').match(
        /^\s*LEADSGHR_LOCAL_MODE\s*=\s*(.*)$/m,
      )
      value = line?.[1].replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2')
    } catch {
      /* No .env file: local mode stays off. */
    }
  }
  return /^(?:1|true|yes|on)$/i.test((value ?? '').trim())
}
