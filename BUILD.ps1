#Requires -Version 5.0
<#
.SYNOPSIS
    Build WhatsApp Manager Desktop v1.0.0 for Windows
.DESCRIPTION
    Automated build script. Run from the whatsapp-manager-desktop folder.
    Requires: Node.js 20+ (https://nodejs.org)
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File BUILD.ps1
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "WhatsApp Manager - Build Script"

function Write-Step($n, $total, $msg) {
    Write-Host ""
    Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor Cyan
    Write-Host "  Step $n/$total : $msg" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor Cyan
}

function Invoke-Step($cmd) {
    $result = Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
    return $result
}

Write-Host ""
Write-Host "  ╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║         WhatsApp Manager Desktop v1.0.0               ║" -ForegroundColor Green
Write-Host "  ║            Windows Build Script (PowerShell)           ║" -ForegroundColor Green
Write-Host "  ╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check Node.js
try {
    $nodeVersion = (node --version 2>&1).ToString()
    Write-Host "  [OK] $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Step 1 5 "Installing dependencies (first run ~5-10 min)"
Write-Host "  Note: Puppeteer downloads Chromium (~170 MB)..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "  [OK] Dependencies installed" -ForegroundColor Green

Write-Step 2 5 "Building React UI (Vite)"
npm run build:renderer
if ($LASTEXITCODE -ne 0) { Write-Host "Renderer build failed" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "  [OK] Renderer built" -ForegroundColor Green

Write-Step 3 5 "Compiling Express server (TypeScript)"
npm run build:server
if ($LASTEXITCODE -ne 0) { Write-Host "Server compilation failed" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "  [OK] Server compiled" -ForegroundColor Green

Write-Step 4 5 "Compiling Electron main process"
npm run build:electron
if ($LASTEXITCODE -ne 0) { Write-Host "Electron compilation failed" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "  [OK] Electron compiled" -ForegroundColor Green

Write-Step 5 5 "Packaging into .exe"
npx @electron/packager . "WhatsApp Manager" `
    --platform=win32 `
    --arch=x64 `
    --electron-version=28.3.3 `
    --out=releases `
    --overwrite `
    --asar `
    --prune `
    --app-version=1.0.0 `
    '--ignore=renderer[\\/]src' `
    '--ignore=server' `
    '--ignore=\.git' `
    '--ignore=releases' `
    '--version-string.CompanyName=WhatsApp Manager' `
    '--version-string.FileDescription=WhatsApp Manager Desktop v1.0.0' `
    '--version-string.ProductName=WhatsApp Manager'

if ($LASTEXITCODE -ne 0) { Write-Host "Packaging failed" -ForegroundColor Red; Read-Host; exit 1 }

# ZIP the output
Set-Location releases
Compress-Archive -Path "WhatsApp Manager-win32-x64" `
    -DestinationPath "WhatsApp-Manager-v1.0.0-win32-x64.zip" -Force
Set-Location ..

Write-Host ""
Write-Host "  ╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                  BUILD COMPLETE!                       ║" -ForegroundColor Green
Write-Host "  ╠════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  .exe  : releases\WhatsApp Manager-win32-x64\          ║" -ForegroundColor White
Write-Host "  ║          WhatsApp Manager.exe                          ║" -ForegroundColor White
Write-Host "  ║  .zip  : releases\WhatsApp-Manager-v1.0.0-win32-x64   ║" -ForegroundColor White
Write-Host "  ╠════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  Default login:  admin / 123456                        ║" -ForegroundColor Yellow
Write-Host "  ║  Change your password immediately after first login!   ║" -ForegroundColor Yellow
Write-Host "  ╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
