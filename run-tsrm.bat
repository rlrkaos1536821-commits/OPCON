@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo TSRM construction operations PoC
echo ========================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required.
  echo Install Node.js first, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist package.json (
  echo package.json was not found in this folder.
  echo Put this file in the project root folder and run it again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages. This can take a few minutes.
  call npm install
  if errorlevel 1 (
    echo.
    echo Package installation failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting the development server.
echo Open http://localhost:3000 in your browser.
echo.

call npm run dev

pause
endlocal
