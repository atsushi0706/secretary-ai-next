# SVG to PNG batch converter using Chrome headless.
# Wraps SVG in HTML to fit viewport, outputs to chrome-extension/assets/out/*.png

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$root  = $PSScriptRoot
$out   = Join-Path $root "out"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

New-Item -ItemType Directory -Force -Path $out | Out-Null

$jobs = @(
  @{ svg = "icon.svg";          w = 16;   h = 16;   name = "icon-16-16x16.png" }
  @{ svg = "icon.svg";          w = 48;   h = 48;   name = "icon-48-48x48.png" }
  @{ svg = "icon.svg";          w = 128;  h = 128;  name = "icon-128-128x128.png" }
  @{ svg = "icon.svg";          w = 256;  h = 256;  name = "icon-256-256x256.png" }
  @{ svg = "promo-small.svg";   w = 440;  h = 280;  name = "promo-small-440x280.png" }
  @{ svg = "promo-large.svg";   w = 920;  h = 680;  name = "promo-large-920x680.png" }
  @{ svg = "promo-marquee.svg"; w = 1400; h = 560;  name = "promo-marquee-1400x560.png" }
)

$wrapperTemplate = @'
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
svg { display: block; width: 100vw; height: 100vh; }
</style>
</head>
<body>
SVG_PLACEHOLDER
</body>
</html>
'@

foreach ($j in $jobs) {
  $svgPath = Join-Path $root $j.svg
  $pngPath = Join-Path $out $j.name

  # Use Get-Content (handles Japanese paths) instead of [System.IO.File]::ReadAllText
  $svgContent = Get-Content $svgPath -Raw -Encoding UTF8
  $html = $wrapperTemplate.Replace("SVG_PLACEHOLDER", $svgContent)

  $tmpHtml = Join-Path $env:TEMP ("kiyose_render_" + [System.Guid]::NewGuid().ToString() + ".html")
  $tmpPng  = Join-Path $env:TEMP ("kiyose_render_" + [System.Guid]::NewGuid().ToString() + ".png")
  [System.IO.File]::WriteAllText($tmpHtml, $html, [System.Text.Encoding]::UTF8)

  $htmlUrl = "file:///" + ($tmpHtml -replace "\\", "/")
  Write-Host "Rendering $($j.name) ($($j.w)x$($j.h))..."

  $chromeArgs = @(
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--default-background-color=00000000",
    "--force-device-scale-factor=1",
    "--window-size=$($j.w),$($j.h)",
    "--screenshot=$tmpPng",
    $htmlUrl
  )

  $stderr = [System.IO.Path]::GetTempFileName()
  $stdout = [System.IO.Path]::GetTempFileName()
  Start-Process -FilePath $chrome -ArgumentList $chromeArgs -Wait -NoNewWindow `
    -RedirectStandardError $stderr -RedirectStandardOutput $stdout
  Start-Sleep -Milliseconds 400

  if (Test-Path $tmpPng) {
    if (Test-Path $pngPath) { Remove-Item $pngPath -Force }
    Copy-Item $tmpPng $pngPath -Force
    $size = (Get-Item $pngPath).Length
    Write-Host "  OK: $($j.name) ($size bytes)"
    Remove-Item $tmpPng -Force -ErrorAction SilentlyContinue
  } else {
    Write-Host "  FAIL"
    Get-Content $stderr -ErrorAction SilentlyContinue
  }

  Remove-Item $tmpHtml -Force -ErrorAction SilentlyContinue
  Remove-Item $stderr -Force -ErrorAction SilentlyContinue
  Remove-Item $stdout -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Done."
Get-ChildItem $out | Select-Object Name, Length | Format-Table -AutoSize
