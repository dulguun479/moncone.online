$ffmpeg = "c:\Users\User\Desktop\dulguun5.14\ffmpeg.exe"
$assetsDir = "c:\Users\User\Desktop\dulguun5.14\GooglePlayAssets"

Write-Host "Starting image processing..."

# App Icon (512x512)
& $ffmpeg -i "C:\Users\User\.gemini\antigravity\brain\a3865e28-6550-4dab-96ac-2ada961bc6b9\moncone_app_icon_1780091336359.png" -vf "scale=512:512" -y -update 1 "$assetsDir\Icon_512x512.png"

# Feature Graphic (1024x500)
& $ffmpeg -i "C:\Users\User\.gemini\antigravity\brain\a3865e28-6550-4dab-96ac-2ada961bc6b9\moncone_feature_banner_1780091352953.png" -vf "scale=1024:-1,crop=1024:500:0:(ih-500)/2" -y -update 1 "$assetsDir\FeatureGraphic_1024x500.png"

# Screenshot 1: Home (1080x1920)
& $ffmpeg -i "C:\Users\User\.gemini\antigravity\brain\a3865e28-6550-4dab-96ac-2ada961bc6b9\moncone_screen_home_1780091369152.png" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:color=0x111116" -y -update 1 "$assetsDir\Screenshot_1_Home.png"

# Screenshot 2: Movie Detail (1080x1920)
& $ffmpeg -i "C:\Users\User\.gemini\antigravity\brain\a3865e28-6550-4dab-96ac-2ada961bc6b9\moncone_screen_detail_1780091388040.png" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:color=0x111116" -y -update 1 "$assetsDir\Screenshot_2_MovieDetail.png"

# Screenshot 3: VIP Plans (1080x1920)
& $ffmpeg -i "C:\Users\User\.gemini\antigravity\brain\a3865e28-6550-4dab-96ac-2ada961bc6b9\moncone_screen_plans_1780091404861.png" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:color=0x111116" -y -update 1 "$assetsDir\Screenshot_3_Plans.png"

# Screenshot 4: AI Chat Assistant (1080x1920)
& $ffmpeg -i "C:\Users\User\.gemini\antigravity\brain\a3865e28-6550-4dab-96ac-2ada961bc6b9\moncone_screen_chat_1780091423144.png" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:color=0x111116" -y -update 1 "$assetsDir\Screenshot_4_Search.png"

Write-Host "Image processing completed successfully!"
