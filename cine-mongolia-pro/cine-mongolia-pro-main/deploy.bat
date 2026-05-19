@echo off
set NODE_OPTIONS=--max-old-space-size=8192
echo [1/2] Building the project...
call npm run build
if %errorlevel% neq 0 (
  echo Build failed!
  exit /b %errorlevel%
)
echo [2/2] Deploying to Cloudflare...
call npx wrangler deploy
echo Done!
