# Builds LeadsGhr-Setup.exe (the small branded setup program) into dist-installer\nsis-web, next to the
# electron-builder output it downloads. Uses the C# compiler that ships with Windows (.NET Framework 4.x).
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$out = Join-Path $here '..\dist-installer\nsis-web'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path $csc)) { throw 'The .NET Framework C# compiler (csc.exe) was not found.' }
New-Item -ItemType Directory -Force $out | Out-Null

$assets = Join-Path $here 'assets'
$resources = @('logo-256.png', 'InstrumentSans-Regular.ttf', 'InstrumentSans-SemiBold.ttf', 'InstrumentSans-Bold.ttf') |
  ForEach-Object { "/resource:$(Join-Path $assets $_),$_" }
$exe = Join-Path $out 'LeadsGhr-Setup.exe'

& $csc /nologo /target:winexe /optimize+ /platform:anycpu `
  "/out:$exe" `
  "/win32icon:$(Join-Path $here '..\resources\leadsghr-icon.ico')" `
  "/win32manifest:$(Join-Path $here 'setup.manifest')" `
  /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll `
  $resources `
  (Join-Path $here 'LeadsGhrSetup.cs')
if ($LASTEXITCODE -ne 0) { throw "csc failed with exit code $LASTEXITCODE" }
Write-Output ("LeadsGhr-Setup.exe built: {0:N0} KB" -f ((Get-Item $exe).Length / 1KB))
