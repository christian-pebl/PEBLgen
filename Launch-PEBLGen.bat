@echo off
title PEBLGen Server
echo.
echo ====================================
echo    Starting PEBLGen Application
echo ====================================
echo.

cd /d "%~dp0"

echo Starting server on http://localhost:8000...
echo.
echo Press Ctrl+C to stop the server
echo.

start http://localhost:8000/timesheet.html

npx http-server -p 8000
