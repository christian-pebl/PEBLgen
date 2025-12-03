# How to Start Your PEBL App

## Quick Start (Always on Port 8000)

Simply **double-click** the `start-app.bat` file in this folder.

Your app will automatically open on **http://localhost:8000** where all your data is stored.

## What This Does

The `start-app.bat` script:
- Starts a Python HTTP server
- Always uses port 8000 (so your data is always available)
- Shows you the URL to open in your browser

## To Stop the Server

Press `Ctrl+C` in the command window that opens.

## Alternative: Manual Start

If you prefer to start manually:
```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

---

**Important:** Always use port 8000 to ensure your saved data (projects, CSV files, etc.) is available, since browser storage is specific to each port number.
