# Chrome 拡張機能の配布用 zip 作成スクリプト
# 使い方: PowerShell で chrome-extension/ ディレクトリに移動して実行
#   cd chrome-extension
#   ./package-zip.ps1

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$finalOut = Join-Path $root "..\focus-secretary-extension.zip"

# Files to include (exclude things not needed for distribution)
$include = @(
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "popup.html",
  "popup.css",
  "popup.js",
  "blocked.html",
  "blocked.js",
  "sidepanel.html",
  "sidepanel.js",
  "PRIVACY.md",
  "README.md"
)
$iconDir = Join-Path $root "icons"

# Workspace lives under a path with Japanese chars. PowerShell's Compress-Archive
# silently fails on non-ASCII paths, so we build entirely under $env:TEMP
# (ASCII) and copy the finished zip back to the final location.
$workDir = Join-Path $env:TEMP "focus-secretary-pack-$(Get-Random)"
$srcDir  = Join-Path $workDir "src"
$tmpZip  = Join-Path $workDir "focus-secretary-extension.zip"

New-Item -ItemType Directory -Force -Path $srcDir | Out-Null

foreach ($f in $include) {
  $src = Join-Path $root $f
  if (Test-Path $src) { Copy-Item $src $srcDir }
}
Copy-Item $iconDir (Join-Path $srcDir "icons") -Recurse

# zip under ASCII path
Compress-Archive -Path (Join-Path $srcDir "*") -DestinationPath $tmpZip -Force

if (-not (Test-Path $tmpZip)) {
  throw "Compress-Archive failed: $tmpZip was not created"
}

# Copy back to final location (handles Japanese path correctly via Copy-Item)
if (Test-Path $finalOut) { Remove-Item $finalOut -Force }
Copy-Item $tmpZip $finalOut

# Cleanup
Remove-Item $workDir -Recurse -Force

if (Test-Path $finalOut) {
  Write-Host "OK: $finalOut"
  Get-Item $finalOut | Select-Object Name, Length, LastWriteTime
} else {
  Write-Host "FAILED: zip not at final destination"
  exit 1
}
