@echo off
echo ========================================
echo Starting PEBL App on localhost:8000
echo ========================================
echo.
echo Your app will be available at:
echo http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.
python -m http.server 8000
