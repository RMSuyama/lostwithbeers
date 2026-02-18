
$champions = @{
    "jaca" = "#15803d"
    "djox" = "#334155"
    "brunao" = "#db2777"
    "jubarbie" = "#1e3a8a"
    "shiryu" = "#064e3b"
    "charles" = "#475569"
    "gusto" = "#78350f"
    "kleyiton" = "#b45309"
    "milan" = "#4a044e"
    "enzo" = "#0369a1"
    "mayron" = "#0d9488"
    "klebao" = "#ffffff"
    "poisoncraft" = "#4d7c0f"
    "foxz" = "#7e22ce"
    "peixe" = "#fbbf24"
    "dan" = "#16a34a"
    "huntskan" = "#0f766e"
    "bia" = "#f472b6"
    "nadson" = "#f97316"
    "espirro" = "#dc2626"
    "rafarofa" = "#475569" # Alias
    "shiryusuyama" = "#064e3b" # Alias
}

Add-Type -AssemblyName System.Drawing

$width = 96  # 3 frames * 32
$height = 128 # 4 rows * 32
$frameSize = 32

foreach ($name in $champions.Keys) {
    $color = $champions[$name]
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
    $textBrush = [System.Drawing.Brushes]::White
    if ($color -eq "#ffffff") { $textBrush = [System.Drawing.Brushes]::Black }
    
    $font = New-Object System.Drawing.Font "Arial", 8
    
    # Draw Background blocks for each frame
    for ($y = 0; $y -lt 4; $y++) {
        for ($x = 0; $x -lt 3; $x++) {
            $rect = New-Object System.Drawing.Rectangle ($x * $frameSize), ($y * $frameSize), ($frameSize - 2), ($frameSize - 2)
            $g.FillRectangle($brush, $rect)
            
            # Draw Face/Direction indicator
            if ($y -eq 1) { # Front
                 $g.DrawString("F", $font, $textBrush, ($x * $frameSize + 10), ($y * $frameSize + 10))
            } elseif ($y -eq 0) { # Back
                 $g.DrawString("B", $font, $textBrush, ($x * $frameSize + 10), ($y * $frameSize + 10))
            } elseif ($y -eq 2) { # Left
                 $g.DrawString("L", $font, $textBrush, ($x * $frameSize + 10), ($y * $frameSize + 10))
            } elseif ($y -eq 3) { # Right
                 $g.DrawString("R", $font, $textBrush, ($x * $frameSize + 10), ($y * $frameSize + 10))
            }
        }
    }
    
    # Draw Name on the first frame of Front row
    $g.DrawString($name, $font, $textBrush, 0, 32)
    
    $path = "client/public/assets/champions/$name.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Generated $path"
    
    $g.Dispose()
    $bmp.Dispose()
}
