// After `electron-builder` (nsis-web target): give the app package a fixed, URL-safe name and point
// latest.yml at it. electron-builder names the package after the internal app name (`@leadsghr/desktop`
// → `@leadsghrdesktop-<version>-x64.nsis.7z`); the `@` is not safe in GitHub release asset names, and the
// internal name cannot change because it decides where installed copies keep their data.
// LeadsGhr-Setup.exe (setup/) and installed copies find the package through latest.yml; LeadsGhr-Installer.exe
// run on its own downloads it from `nsisWeb.appPackageUrl` (electron-builder.yml), which uses this name. Renaming does not change the file or its hashes.
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGE_NAME = 'LeadsGhr-App-x64.nsis.7z'
const dir = join(import.meta.dirname, '..', 'dist-installer', 'nsis-web')

const packages = (await readdir(dir)).filter((name) => name.endsWith('.nsis.7z'))
if (packages.length !== 1) throw new Error(`Expected one app package in ${dir}, found: ${packages.join(', ') || 'none'}`)
const [built] = packages
if (built !== PACKAGE_NAME) await rename(join(dir, built), join(dir, PACKAGE_NAME))

const latestPath = join(dir, 'latest.yml')
const latest = await readFile(latestPath, 'utf8')
const updated = latest.split(`'${built}'`).join(PACKAGE_NAME).split(built).join(PACKAGE_NAME)
if (!updated.includes(`path: ${PACKAGE_NAME}`)) throw new Error('latest.yml does not reference the app package.')
await writeFile(latestPath, updated)
console.log(`Web installer ready: LeadsGhr-Installer.exe + ${PACKAGE_NAME} (was ${built})`)
