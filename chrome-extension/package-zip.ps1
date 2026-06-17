# Chrome 拡張機能の配布用 zip 作成スクリプト
# 使い方: PowerShell で chrome-extension/ ディレクトリに移動して実行
#   cd chrome-extension
#   ./package-zip.ps1

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$out  = Join-Path $root "..\focus-secretary-extension.zip"

# 既存zip削除
if (Test-Path $out) { Remove-Item $out -Force }

# 含めるファイル(配布に不要なものは除外)
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

# 一時ディレクトリ作って必要ファイルだけコピー
$tmp = Join-Path $env:TEMP "focus-secretary-pack-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
foreach ($f in $include) {
  $src = Join-Path $root $f
  if (Test-Path $src) { Copy-Item $src $tmp }
}
Copy-Item $iconDir (Join-Path $tmp "icons") -Recurse

# zip 化
Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $out -Force

# 後始末
Remove-Item $tmp -Recurse -Force

Write-Host "Created: $out"
Get-Item $out | Select-Object Name, Length, LastWriteTime
