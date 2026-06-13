Add-Type -AssemblyName System.Drawing
$srcPath = 'C:\Users\User\Desktop\dulguun5.14\GooglePlayAssets\Icon_512x512.png'
$src = [System.Drawing.Image]::FromFile($srcPath)
$densities = 'mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'
$pxsizes = 48,72,96,144,192
for ($i = 0; $i -lt $densities.Length; $i++) {
    $d = $densities[$i]
    $sz = $pxsizes[$i]
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $base = "C:\Users\User\Desktop\dulguun5.14\android\app\src\main\res\mipmap-$d"
    $bmp.Save("$base\ic_launcher.png")
    $bmp.Save("$base\ic_launcher_round.png")
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Done $d $sz x $sz"
}
$src.Dispose()
Write-Host 'All icons done'
