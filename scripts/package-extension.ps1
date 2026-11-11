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
} finally {
  Pop-Location
}
