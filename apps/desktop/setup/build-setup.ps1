# Builds LeadsGhr's small branded Windows programs with the C# compiler that ships with Windows (.NET Framework 4.x):
#   -Target setup      LeadsGhr-Setup.exe into dist-installer\nsis-web (after electron-builder; it downloads that output).
#   -Target uninstall  LeadsGhr-Uninstall.exe into setup\out (before electron-builder, which packs it into the app's
#                      resources; the uninstaller in setup\installer.nsh runs it).
param([ValidateSet('setup', 'uninstall')][string]$Target = 'setup')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path $csc)) { throw 'The .NET Framework C# compiler (csc.exe) was not found.' }

$assets = Join-Path $here 'assets'
$fonts = @('InstrumentSans-Regular.ttf', 'InstrumentSans-SemiBold.ttf', 'InstrumentSans-Bold.ttf')
if ($Target -eq 'setup') {
  $out = Join-Path $here '..\dist-installer\nsis-web'
  $exe = Join-Path $out 'LeadsGhr-Setup.exe'
  $sources = @(Join-Path $here 'LeadsGhrSetup.cs')
  $resourceFiles = $fonts
} else {
  $out = Join-Path $here 'out'
  $exe = Join-Path $out 'LeadsGhr-Uninstall.exe'
  $sources = @((Join-Path $here 'Brand.cs'), (Join-Path $here 'LeadsGhrUninstall.cs'))
  $resourceFiles = $fonts
}
New-Item -ItemType Directory -Force $out | Out-Null
$resources = $resourceFiles | ForEach-Object { "/resource:$(Join-Path $assets $_),$_" }

& $csc /nologo /target:winexe /optimize+ /platform:anycpu `
  "/out:$exe" `
  "/win32icon:$(Join-Path $here '..\resources\leadsghr-icon.ico')" `
  "/win32manifest:$(Join-Path $here 'setup.manifest')" `
  /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll `
  $resources `
  $sources
if ($LASTEXITCODE -ne 0) { throw "csc failed with exit code $LASTEXITCODE" }
Write-Output ("{0} built: {1:N0} KB" -f (Split-Path $exe -Leaf), ((Get-Item $exe).Length / 1KB))
