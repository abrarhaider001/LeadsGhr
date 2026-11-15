$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'apps/extension'
$distRoot = Join-Path $extensionRoot 'dist'
$archivePath = Join-Path $extensionRoot 'leadsghr-mail-tracking.zip'

Push-Location $projectRoot
try {
  pnpm.cmd --filter @leadsghr/extension build
  if ($LASTEXITCODE -ne 0) { throw 'Extension build failed.' }
  if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'manifest.json'))) { throw 'Built manifest is missing.' }
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  Compress-Archive -Path (Join-Path $distRoot '*') -DestinationPath $archivePath
  Write-Output "Created $archivePath"
  # Install copy for Chrome: same folder the desktop app's download dialog opens (apps/desktop/src/paths.ts).
  $systemDrive = if ($env:SystemDrive) { $env:SystemDrive } else { 'C:' }
  $installRoot = Join-Path "$systemDrive\" 'LeadsGhr\extensions'
  New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
  Copy-Item -LiteralPath $archivePath -Destination (Join-Path $installRoot 'leadsghr-mail-tracking.zip') -Force
  Write-Output "Copied to $(Join-Path $installRoot 'leadsghr-mail-tracking.zip')"
  # Ready-to-load copy next to the ZIP: Chrome loads this folder (Load unpacked, then Reload after rebuilds).
  # The folder path stays the same, so Chrome keeps the extension ID and its saved settings and records.
  # A 'data' folder, if present, holds user data and is never deleted or overwritten.
  $unpackedRoot = Join-Path $installRoot 'leadsghr-mail-tracking'
  if (Test-Path -LiteralPath $unpackedRoot) {
    Get-ChildItem -LiteralPath $unpackedRoot -Force | Where-Object { $_.Name -ne 'data' } | Remove-Item -Recurse -Force
  }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $unpackedRoot -Force
  Write-Output "Extracted to $unpackedRoot"
} finally {
  Pop-Location
}
