param(
  [Parameter(Mandatory = $true)]
  [string]$ImagePath
)

Add-Type -AssemblyName System.Drawing

$resolved = (Resolve-Path -LiteralPath $ImagePath).Path
$source = [System.Drawing.Bitmap]::FromFile($resolved)
$bitmap = New-Object System.Drawing.Bitmap($source.Width, $source.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.DrawImageUnscaled($source, 0, 0)
$source.Dispose()

$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$paperColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
$white = New-Object System.Drawing.SolidBrush($paperColor)
$black = [System.Drawing.Brushes]::Black
$fontPath = 'C:\Windows\Fonts\NotoSerifJP-VF.ttf'

function Draw-VerticalColumns {
  param(
    [System.Drawing.Graphics]$Canvas,
    [string[]]$Columns,
    [float]$Right,
    [float]$Top,
    [float]$ColumnStep,
    [float]$RowStep,
    [float]$FontSize
  )

  $collection = New-Object System.Drawing.Text.PrivateFontCollection
  $collection.AddFontFile($fontPath)
  $font = New-Object System.Drawing.Font($collection.Families[0], $FontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  for ($column = 0; $column -lt $Columns.Length; $column++) {
    $chars = $Columns[$column].ToCharArray()
    for ($row = 0; $row -lt $chars.Length; $row++) {
      $x = $Right - ($column * $ColumnStep)
      $y = $Top + ($row * $RowStep)
      $rect = New-Object System.Drawing.RectangleF(($x - $ColumnStep / 2), ($y - $RowStep / 2), $ColumnStep, $RowStep)
      $Canvas.DrawString([string]$chars[$row], $font, $black, $rect, $format)
    }
  }

  $format.Dispose()
  $font.Dispose()
  $collection.Dispose()
}

# 元の吹き出し・枠線・人物・コマ割りを残し、文字がある内側だけを紙色で戻す。
$graphics.FillEllipse($white, 28, 56, 166, 383)
$graphics.FillEllipse($white, 793, 45, 104, 205)
$graphics.FillEllipse($white, 742, 851, 158, 242)
$graphics.FillRectangle($white, 31, 866, 105, 612)

Draw-VerticalColumns $graphics @('命令では動かない。', '走る感覚の時だけ、', '足が反応した。', '何が違う？') 160 94 29 31 23
Draw-VerticalColumns $graphics @('もう一度、', '確かめよう。') 861 91 27 27 19
Draw-VerticalColumns $graphics @('この反応を、', '歩く動きへ', '広げるには？') 855 899 29 26 20
Draw-VerticalColumns $graphics @('彼は妹の歩き方を観察し、', '足の反応と照らし合わせた。') 111 909 34 35 23

$graphics.Dispose()
$bitmap.Save($resolved, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
$white.Dispose()
