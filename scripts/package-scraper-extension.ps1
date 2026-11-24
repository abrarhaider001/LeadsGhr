$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'apps/scraper-extension'
$distRoot = Join-Path $extensionRoot 'dist'
$archivePath = Join-Path $extensionRoot 'leadsghr-scraper.zip'

Push-Location $projectRoot
try {
  pnpm.cmd --filter @leadsghr/scraper-extension build
  if ($LASTEXITCODE -ne 0) { throw 'Scraper extension build failed.' }
  # Local mode (LEADSGHR_MODE=local in .env) builds without the license check. Such a build must never replace
  # the ZIP committed in the repository (the one shipped to users), so it goes to a temporary file instead and only
  # the C:\LeadsGhr\extensions copy is updated.
  $localMode = (node -e "import('./scripts/local-mode.mjs').then((m) => process.stdout.write(String(m.readLocalMode(process.cwd()))))") -eq 'true'
  if ($localMode) {
    $archivePath = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetFileName($archivePath))
    Write-Warning 'LEADSGHR_MODE is local: this build skips the license check. The repository ZIP is left unchanged; only C:\LeadsGhr\extensions is updated.'
  }
  if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'manifest.json'))) { throw 'Built manifest is missing.' }
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  Compress-Archive -Path (Join-Path $distRoot '*') -DestinationPath $archivePath
  Write-Output "Created $archivePath"
  # Install copy for Chrome in the LeadsGhr extensions folder.
  $systemDrive = if ($env:SystemDrive) { $env:SystemDrive } else { 'C:' }
  $installRoot = Join-Path "$systemDrive\" 'LeadsGhr\extensions'
  New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
  Copy-Item -LiteralPath $archivePath -Destination (Join-Path $installRoot 'leadsghr-scraper.zip') -Force
  Write-Output "Copied to $(Join-Path $installRoot 'leadsghr-scraper.zip')"
  # Ready-to-load copy next to the ZIP: Chrome loads this folder (Load unpacked, then Reload after rebuilds).
  # The folder path stays the same, so Chrome keeps the extension ID.
  # The 'data' folder holds the user's search jobs, progress, and results: it is never deleted or overwritten.
  $unpackedRoot = Join-Path $installRoot 'leadsghr-scraper'
  if (Test-Path -LiteralPath $unpackedRoot) {
    Get-ChildItem -LiteralPath $unpackedRoot -Force | Where-Object { $_.Name -ne 'data' } | Remove-Item -Recurse -Force
  }
  . (Join-Path $PSScriptRoot 'expand-extension-zip.ps1')
  Expand-ExtensionZip -ArchivePath $archivePath -Destination $unpackedRoot
  $dataRoot = Join-Path $unpackedRoot 'data'
  New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
  Write-Output "Extracted to $unpackedRoot (kept $dataRoot)"
} finally {
  Pop-Location
}
