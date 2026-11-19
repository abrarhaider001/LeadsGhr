# Unpacks an extension ZIP into its ready-to-load folder (dot-sourced by package-extension.ps1 and
# package-mailer-extension.ps1). Uses .NET's ZipFile directly instead of Expand-Archive, which fails on newer
# GitHub Windows runners ("Cannot find an overload for ExtractToDirectory"). Existing files under 'data\' are
# the user's own records and are never overwritten; every other file is replaced.
function Expand-ExtensionZip([string]$ArchivePath, [string]$Destination) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  $root = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
  $zip = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
  try {
    foreach ($entry in $zip.Entries) {
      $name = $entry.FullName -replace '\\', '/'
      $target = [System.IO.Path]::GetFullPath((Join-Path $root ($name -replace '/', '\')))
      if (-not $target.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe path in ZIP: $name" }
      if ($name.EndsWith('/')) { New-Item -ItemType Directory -Force -Path $target | Out-Null; continue }
      if ($name -like 'data/*' -and (Test-Path -LiteralPath $target)) { continue }
      New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    }
  } finally {
    $zip.Dispose()
  }
}
