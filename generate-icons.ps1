Add-Type -AssemblyName System.Drawing

function Generate-Icon ($Path, $Size, $IsMaskable) {
    Write-Host "Generating icon of size $Size at $Path..."
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable high quality rendering
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 1. Background
    $bgColor = [System.Drawing.Color]::FromArgb(255, 19, 16, 28) # #13101C
    $bgBrush = New-Object System.Drawing.SolidBrush ($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Calculate scaling factor
    $scale = $Size / 512.0
    
    # 2. Draw outer decorative film ring (if not maskable, or scale down slightly)
    $ringSize = 380 * $scale
    $ringPos = (512 - 380) / 2 * $scale
    $ringPenColor = [System.Drawing.Color]::FromArgb(60, 229, 9, 20) # Red translucent
    $ringPen = New-Object System.Drawing.Pen ($ringPenColor, (8 * $scale))
    $g.DrawEllipse($ringPen, $ringPos, $ringPos, $ringSize, $ringSize)

    # 3. Draw a glowing Red gradient letter "M" represented by clean geometric film lines
    # Define points for M:
    # Left column, center intersection, right column.
    $redBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 229, 9, 20)) # #E50914 (Moncone primary red)
    
    # Let's draw M using a list of polygons or thick lines
    # We will build path points
    $p1 = New-Object System.Drawing.PointF (140 * $scale), (380 * $scale)
    $p2 = New-Object System.Drawing.PointF (140 * $scale), (160 * $scale)
    $p3 = New-Object System.Drawing.PointF (180 * $scale), (160 * $scale)
    $p4 = New-Object System.Drawing.PointF (256 * $scale), (240 * $scale)
    $p5 = New-Object System.Drawing.PointF (332 * $scale), (160 * $scale)
    $p6 = New-Object System.Drawing.PointF (372 * $scale), (160 * $scale)
    $p7 = New-Object System.Drawing.PointF (372 * $scale), (380 * $scale)
    $p8 = New-Object System.Drawing.PointF (332 * $scale), (380 * $scale)
    $p9 = New-Object System.Drawing.PointF (332 * $scale), (230 * $scale)
    $p10 = New-Object System.Drawing.PointF (256 * $scale), (300 * $scale)
    $p11 = New-Object System.Drawing.PointF (180 * $scale), (230 * $scale)
    $p12 = New-Object System.Drawing.PointF (180 * $scale), (380 * $scale)

    $points = [System.Drawing.PointF[]]($p1, $p2, $p3, $p4, $p5, $p6, $p7, $p8, $p9, $p10, $p11, $p12)
    $g.FillPolygon($redBrush, $points)

    # 4. Centered golden play button triangle
    $goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)) # #FBBF24 (Lucide Gold)
    $pt1 = New-Object System.Drawing.PointF (236 * $scale), (220 * $scale)
    $pt2 = New-Object System.Drawing.PointF (290 * $scale), (256 * $scale)
    $pt3 = New-Object System.Drawing.PointF (236 * $scale), (292 * $scale)
    $triPoints = [System.Drawing.PointF[]]($pt1, $pt2, $pt3)
    $g.FillPolygon($goldBrush, $triPoints)

    # 5. Clean up
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Create public directory if not exists
$pubDir = Join-Path "c:\Users\User\Desktop\dulguun5.14" "public"
if (!(Test-Path $pubDir)) {
    New-Item -ItemType Directory -Path $pubDir -Force
}

# Generate all required PWA icons
Generate-Icon (Join-Path $pubDir "icon-192.png") 192 $false
Generate-Icon (Join-Path $pubDir "icon-512.png") 512 $false
Generate-Icon (Join-Path $pubDir "maskable-icon-512.png") 512 $true
Generate-Icon (Join-Path $pubDir "apple-touch-icon.png") 180 $false

Write-Host "All icons generated successfully!"
