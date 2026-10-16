Add-Type -AssemblyName System.Drawing

function Draw-Logo {
    param(
        [int]$width,
        [int]$height,
        [string]$outputPath,
        [bool]$includeText
    )

    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Pure obsidian black background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 11, 14))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # Center coordinates
    $cx = [float]($width / 2.0)
    if ($includeText) {
        $cy = [float]($height * 0.42)
    } else {
        $cy = [float]($height / 2.0)
    }
    $scale = [float]([Math]::Min($width, $height) * 0.36)

    # Subtle ambient glow behind emblem
    $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(25, 255, 255, 255), [float]($scale * 0.4))
    $glowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowRect = New-Object System.Drawing.RectangleF([float]($cx - $scale * 0.8), [float]($cy - $scale * 0.5), [float]($scale * 1.6), [float]($scale * 1.0))
    $g.DrawArc($glowPen, $glowRect, 0, 360)

    # Precision Loop 1: Left arc (C - Commute) in pure crisp white
    $rect1 = New-Object System.Drawing.RectangleF([float]($cx - $scale * 0.88), [float]($cy - $scale * 0.65), [float]($scale * 1.15), [float]($scale * 1.3))
    $pen1 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), [float]($scale * 0.17))
    $pen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($pen1, $rect1, 65, 230)

    # Precision Loop 2: Right arc (S - Share) in refined platinum silver
    $rect2 = New-Object System.Drawing.RectangleF([float]($cx - $scale * 0.27), [float]($cy - $scale * 0.65), [float]($scale * 1.15), [float]($scale * 1.3))
    $pen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 185, 190, 200), [float]($scale * 0.17))
    $pen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($pen2, $rect2, 245, 230)

    # Intersecting dynamic mobility node (white connection point)
    $nodeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $nodeSize = [float]($scale * 0.24)
    $g.FillEllipse($nodeBrush, [float]($cx - $nodeSize/2.0), [float]($cy - $nodeSize/2.0), $nodeSize, $nodeSize)

    # Core inner accent
    $innerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 11, 14))
    $innerSize = [float]($scale * 0.11)
    $g.FillEllipse($innerBrush, [float]($cx - $innerSize/2.0), [float]($cy - $innerSize/2.0), $innerSize, $innerSize)

    if ($includeText) {
        $fontFamily = New-Object System.Drawing.FontFamily([System.Drawing.Text.GenericFontFamilies]::SansSerif)
        $fontSize = [float]($width * 0.052)
        $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $textRect = New-Object System.Drawing.RectangleF(0, [float]($cy + $scale * 0.95), [float]$width, [float]($fontSize * 1.8))
        $g.DrawString('RIDESHARE', $font, $textBrush, $textRect, $sf)

        $subFont = New-Object System.Drawing.Font($fontFamily, [float]($fontSize * 0.42), [System.Drawing.FontStyle]::Regular)
        $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 150, 155, 165))
        $subRect = New-Object System.Drawing.RectangleF(0, [float]($cy + $scale * 0.95 + $fontSize * 1.8), [float]$width, [float]($fontSize * 1.4))
        $g.DrawString('COMMUTE & CARPOOL', $subFont, $subBrush, $subRect, $sf)
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully generated: $outputPath"
}

Draw-Logo -width 1024 -height 1024 -outputPath "assets/icon.png" -includeText $false
Draw-Logo -width 1024 -height 1024 -outputPath "assets/adaptive-icon.png" -includeText $false
Draw-Logo -width 1284 -height 2778 -outputPath "assets/splash.png" -includeText $true
