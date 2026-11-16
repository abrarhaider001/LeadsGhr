$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'apps/mailer-extension'
$distRoot = Join-Path $extensionRoot 'dist'
$archivePath = Join-Path $extensionRoot 'leadsghr-mailer.zip'

Push-Location $projectRoot
try {
  pnpm.cmd --filter @leadsghr/mailer-extension build
  if ($LASTEXITCODE -ne 0) { throw 'Mailer extension build failed.' }
  if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'manifest.json'))) { throw 'Built manifest is missing.' }
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  Compress-Archive -Path (Join-Path $distRoot '*') -DestinationPath $archivePath
  Write-Output "Created $archivePath"
  # Install copy for Chrome in the LeadsGhr extensions folder.
  $systemDrive = if ($env:SystemDrive) { $env:SystemDrive } else { 'C:' }
  $installRoot = Join-Path "$systemDrive\" 'LeadsGhr\extensions'
  New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
  Copy-Item -LiteralPath $archivePath -Destination (Join-Path $installRoot 'leadsghr-mailer.zip') -Force
  Write-Output "Copied to $(Join-Path $installRoot 'leadsghr-mailer.zip')"
  # Ready-to-load copy next to the ZIP: Chrome loads this folder (Load unpacked, then Reload after rebuilds).
  # The folder path stays the same, so Chrome keeps the extension ID.
  # The 'data' folder holds the user's saved templates and preferences: it is never deleted or overwritten.
  $unpackedRoot = Join-Path $installRoot 'leadsghr-mailer'
  if (Test-Path -LiteralPath $unpackedRoot) {
    Get-ChildItem -LiteralPath $unpackedRoot -Force | Where-Object { $_.Name -ne 'data' } | Remove-Item -Recurse -Force
  }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $unpackedRoot -Force
  $dataRoot = Join-Path $unpackedRoot 'data'
  New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
  Write-Output "Extracted to $unpackedRoot (kept $dataRoot)"
} finally {
  Pop-Location
}
