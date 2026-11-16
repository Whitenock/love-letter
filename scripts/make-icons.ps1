# Генератор иконок PWA: сердце на розовом фоне, PNG без внешних зависимостей.
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$publicDir = Join-Path $PSScriptRoot '..\frontend\public'
$bg = [System.Drawing.Color]::FromArgb(255, 224, 82, 109)    # --color-accent #E0526D
$fg = [System.Drawing.Color]::FromArgb(255, 255, 253, 247)   # --color-letter #FFFDF7

# Параметрическое сердце: x = 16 sin^3 t, y = 13cos t - 5cos2t - 2cos3t - cos4t
# Диапазон: x в [-16, 16], y в [-17, 12]; центр по вертикали ~ -2.5.
function New-HeartIcon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear($bg)

    # Сердце занимает ~72% ширины; для маскируемых иконок остаётся запас.
    $scale = ($size * 0.72) / 32.0
    $cy = $size / 2.0

    $points = New-Object 'System.Drawing.PointF[]' 240
    for ($i = 0; $i -lt 240; $i++) {
        $t = [Math]::PI * 2 * $i / 240
        $x = 16 * [Math]::Pow([Math]::Sin($t), 3)
        $y = 13 * [Math]::Cos($t) - 5 * [Math]::Cos(2 * $t) - 2 * [Math]::Cos(3 * $t) - [Math]::Cos(4 * $t)
        $sx = [float]($size / 2.0 + $x * $scale)
        $sy = [float]($cy - ($y + 2.5) * $scale)
        $points[$i] = New-Object System.Drawing.PointF($sx, $sy)
    }

    $brush = New-Object System.Drawing.SolidBrush($fg)
    $g.FillPolygon($brush, $points)
    $brush.Dispose()
    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ("OK  " + $outPath)
}

foreach ($s in 180, 192, 512) {
    New-HeartIcon $s (Join-Path $publicDir ("icon-{0}.png" -f $s))
}
