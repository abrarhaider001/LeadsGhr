import { BrowserWindow, ipcMain, safeStorage } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { activateLicense, checkStoredLicense, type LicenseView, type StoredLicense } from '@leadsghr/license'
import { leadsGhrDataFile } from './data-folder'

/*
 * Desktop license (AGENTS.md, "License keys"). The activated license lives in C:\LeadsGhr\data\license.bin,
 * encrypted with Windows' per-user encryption (Electron safeStorage), so the key cannot be read from the
 * file. installation.bin holds this installation's random ID; it is kept when a license is removed, so the
 * same installation can re-activate its key. The renderer only ever receives a LicenseView (no full key).
 */

const licenseFile = () => leadsGhrDataFile('license.bin')
const installationFile = () => leadsGhrDataFile('installation.bin')

function encrypt(value: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows encryption is unavailable, so the license cannot be stored safely.')
  return safeStorage.encryptString(value)
}

async function decrypt(path: string): Promise<string | null> {
  try { return safeStorage.decryptString(await readFile(path)) } catch { return null }
}

async function installationId(): Promise<string> {
  const saved = await decrypt(installationFile())
  if (saved && saved.length >= 16) return saved
  const id = randomUUID()
  await writeFile(installationFile(), encrypt(id))
  return id
}

async function readLicense(): Promise<StoredLicense | null> {
  const text = await decrypt(licenseFile())
  if (!text) return null
  try { return JSON.parse(text) as StoredLicense } catch { return null }
}

async function saveLicense(stored: StoredLicense | null): Promise<void> {
  if (stored) await writeFile(licenseFile(), encrypt(JSON.stringify(stored)))
  else await rm(licenseFile(), { force: true })
}

let current: LicenseView | null = null

/** The start-up check: re-validate the stored key; remove it when it is expired, revoked, or used elsewhere. */
export async function checkLicense(): Promise<LicenseView> {
  const result = await checkStoredLicense(await readLicense(), 'desktop', await installationId())
  if (result.view.state === 'locked' && result.view.reason !== 'offline') await saveLicense(null)
  else if (result.stored) await saveLicense(result.stored)
  current = result.view
  return current
}

/** True once a license check passed in this session; IPC that does real work can rely on it. */
export const licenseActive = () => current?.state === 'active'

export function registerLicenseIpc(): void {
  // Checked once per start (the first call); later calls return the same result unless forced.
  let startupCheck: Promise<LicenseView> | null = null
  ipcMain.handle('leadsghr:license:status', async (event, force: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (!startupCheck || force === true) startupCheck = checkLicense()
    return startupCheck
  })
  ipcMain.handle('leadsghr:license:activate', async (event, input: unknown) => {
    if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Unexpected caller')
    if (typeof input !== 'string' || input.length > 200) throw new Error('Enter a license key')
    try {
      const result = await activateLicense(input, 'desktop', await installationId())
      if (result.stored) await saveLicense(result.stored)
      current = result.view
      startupCheck = Promise.resolve(result.view)
      return result.view
    } catch {
      return { state: 'locked', reason: 'error', message: 'The license service did not answer. Check your internet connection and try again.' } satisfies LicenseView
    }
  })
}
