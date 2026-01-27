@echo off
REM Voiden Cleanup Script for Windows
REM This script removes all node_modules, dist, and cache folders, then performs a clean install and build
REM
REM What this script does:
REM 1. Removes all node_modules folders
REM 2. Removes all dist folders (compiled output)
REM 3. Clears TypeScript build cache
REM 4. Clears Vite cache
REM 5. Removes build artifacts
REM 6. Clears Yarn cache (optional)
REM 7. Runs yarn install
REM 8. Builds packages in dependency order (SDK -> Shared -> Core Extensions)
REM    - Core Extensions automatically runs 'yarn generate-registry' as prebuild step

setlocal enabledelayedexpansion

echo.
echo 🧹 Starting Voiden cleanup...
echo.

REM Store the root directory
set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

REM Step 1: Remove all node_modules folders
echo =📦 Removing all node_modules folders...
for /d /r . %%d in (node_modules) do @if exist "%%d" rd /s /q "%%d" 2>nul
echo ✓ Removed all node_modules
echo.

REM Step 2: Remove all dist folders
echo =📦 Removing all dist folders...
for /d /r . %%d in (dist) do @if exist "%%d" rd /s /q "%%d" 2>nul
echo ✓ Removed all dist folders (includes core-extensions compiled output)
echo.

REM Step 3: Remove TypeScript build info files
echo =🗑️  Removing TypeScript build cache...
for /r . %%f in (*.tsbuildinfo) do @if exist "%%f" del /q "%%f" 2>nul
echo ✓ Removed TypeScript build cache
echo.

REM Step 4: Remove Vite cache
echo =🗑️  Removing Vite cache...
if exist "apps\ui\node_modules\.vite" rd /s /q "apps\ui\node_modules\.vite" 2>nul
echo ✓ Removed Vite cache
echo.

REM Step 5: Remove build artifacts
echo =🗑️  Removing build artifacts...
if exist "apps\electron\out" rd /s /q "apps\electron\out" 2>nul
if exist "apps\ui\.vite" rd /s /q "apps\ui\.vite" 2>nul
echo ✓ Removed build artifacts
echo.

REM Step 6: Clear Yarn cache (optional - uncomment if needed)
REM echo =🗑️  Clearing Yarn cache...
REM yarn cache clean --all
REM echo ✓ Cleared Yarn cache
REM echo.

REM Step 7: Clean install
echo =📦 Running yarn install...
call yarn install
if errorlevel 1 (
    echo ✗ Failed to install dependencies
    exit /b 1
)
echo ✓ Dependencies installed
echo.

REM Step 8: Build packages in correct order
echo =🔨 Building packages in correct order...
echo.

echo   Building core extensions...
echo    → Running 'yarn generate-registry' (automatic via prebuild)
call yarn workspace @voiden/core-extensions build
if errorlevel 1 (
    echo ✗ Failed to build core extensions
    exit /b 1
)
echo    ✓ Core extensions built (voiden-rest-api, voiden-advanced-auth, voiden-faker, md-preview, postman-import)
echo.

REM Step 9: Optional - Build UI (commented out by default since dev mode doesn't need it)
REM Uncomment the lines below if you want to build the UI as well
REM echo   4/4 Building UI...
REM cd apps\ui
REM call yarn build
REM if errorlevel 1 (
REM     echo ✗ Failed to build UI
REM     exit /b 1
REM )
REM cd "%ROOT_DIR%"
REM echo    ✓ UI built
REM echo.

echo 🎉 Cleanup complete!
echo.
echo Next steps:
echo   1. To start the app: cd apps\electron ^&^& yarn start
echo   2. To build UI (optional): cd apps\ui ^&^& yarn build
echo.

endlocal
