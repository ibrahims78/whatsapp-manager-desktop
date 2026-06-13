@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title WhatsApp Manager Desktop - Build Tool

echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║         WhatsApp Manager Desktop v1.0.0               ║
echo  ║            Windows Build Script                        ║
echo  ╚════════════════════════════════════════════════════════╝
echo.

:: ─── Check Node.js ───────────────────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js not found!
    echo  Please install Node.js 20+ from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=1 delims=v" %%v in ('node --version') do set NODE_RAW=%%v
for /f "tokens=2 delims=v" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js version: v%NODE_VER%

:: ─── Check npm ───────────────────────────────────────────────────────────────
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] npm not found! Reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] npm found

echo.
echo  ─────────────────────────────────────────────────────────
echo  Step 1/5 : Installing dependencies (this may take 5-10 min)
echo  ─────────────────────────────────────────────────────────
echo  (Puppeteer/Chromium download ~170 MB — please wait...)
echo.
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed

echo.
echo  ─────────────────────────────────────────────────────────
echo  Step 2/5 : Building React UI (Vite)
echo  ─────────────────────────────────────────────────────────
call npm run build:renderer
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Renderer build failed.
    pause
    exit /b 1
)
echo  [OK] Renderer built

echo.
echo  ─────────────────────────────────────────────────────────
echo  Step 3/5 : Compiling Express server (TypeScript)
echo  ─────────────────────────────────────────────────────────
call npm run build:server
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Server TypeScript compilation failed.
    pause
    exit /b 1
)
echo  [OK] Server compiled

echo.
echo  ─────────────────────────────────────────────────────────
echo  Step 4/5 : Compiling Electron main process
echo  ─────────────────────────────────────────────────────────
call npm run build:electron
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Electron TypeScript compilation failed.
    pause
    exit /b 1
)
echo  [OK] Electron compiled

echo.
echo  ─────────────────────────────────────────────────────────
echo  Step 5/5 : Packaging into .exe with electron-packager
echo  ─────────────────────────────────────────────────────────
call npx @electron/packager . "WhatsApp Manager" ^
  --platform=win32 ^
  --arch=x64 ^
  --electron-version=28.3.3 ^
  --out=releases ^
  --overwrite ^
  --asar ^
  --prune ^
  --app-version=1.0.0 ^
  --ignore="renderer[\\/]src" ^
  --ignore="server" ^
  --ignore="\\.git" ^
  --ignore="releases" ^
  --ignore="node_modules[\\/]\\.cache" ^
  --version-string.CompanyName="WhatsApp Manager" ^
  --version-string.FileDescription="WhatsApp Manager Desktop v1.0.0" ^
  --version-string.ProductName="WhatsApp Manager"

if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] electron-packager failed.
    pause
    exit /b 1
)

:: ─── Create ZIP ──────────────────────────────────────────────────────────────
cd releases
if exist "WhatsApp-Manager-v1.0.0-win32-x64.zip" del /f /q "WhatsApp-Manager-v1.0.0-win32-x64.zip"
powershell -Command "Compress-Archive -Path 'WhatsApp Manager-win32-x64' -DestinationPath 'WhatsApp-Manager-v1.0.0-win32-x64.zip' -Force"
cd ..

echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║                 BUILD COMPLETE!                        ║
echo  ╠════════════════════════════════════════════════════════╣
echo  ║  EXE : releases\WhatsApp Manager-win32-x64\           ║
echo  ║        WhatsApp Manager.exe                            ║
echo  ║  ZIP : releases\WhatsApp-Manager-v1.0.0-win32-x64.zip ║
echo  ╠════════════════════════════════════════════════════════╣
echo  ║  Default login: admin / 123456                         ║
echo  ║  Change password immediately after first login!        ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
pause
