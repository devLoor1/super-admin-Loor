@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then run this file again.
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);if(!((v[0]===20&&v[1]>=19)||(v[0]===22&&v[1]>=12)||v[0]>22)){console.error('Node must satisfy ^20.19.0 or >=22.12.0.');process.exit(1)}"
if errorlevel 1 exit /b 1
where npm >nul 2>nul
if errorlevel 1 exit /b 1
if not exist "node_modules\.bin\vite.cmd" (
  call npm ci --prefer-offline --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
echo.
echo SHOWCASE: http://127.0.0.1:5192/#/mock/vitrine-publica/4
echo EDITOR:   http://127.0.0.1:5192/#/whitelabels/4/settings/plataforma/vitrine
echo Local mock only. Stop with Ctrl+C. Do not enter real credentials.
call npm run preview -- --host 127.0.0.1 --port 5192 --strictPort
