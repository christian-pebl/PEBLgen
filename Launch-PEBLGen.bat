@echo off
title PEBLGen Server
echo.
echo ====================================
echo    Starting PEBLGen Application
echo ====================================
echo.

cd /d "%~dp0"

REM Kill any existing servers on port 8000
echo Checking for existing servers on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Stopping old server process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting server on http://localhost:8000...
echo Browser will open automatically in 3 seconds...
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server in background and open browser after delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000/timesheet.html"

npx http-server -p 8000
