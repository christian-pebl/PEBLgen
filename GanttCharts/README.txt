# GanttCharts Folder

This folder stores your Gantt chart JSON files.

## How It Works:

1. In gantt.html, click "Set Save Folder" and choose THIS folder
2. When you click "Save Current Project", it will:
   - Save to browser localStorage (for quick access)
   - Save a JSON file here (for permanent storage)

3. When you click "Download JSON", it will save here too

## File Format:

Each file contains:
- Project name, start/end dates
- All tasks with their numbers and names
- Active month data (ganttData object)
- **NEW: Calculated start/end dates for each task**

## Loading in Timesheet:

In timesheet.html, Section 3:
- Option 1: Load from localStorage (quick, but temporary)
- Option 2: Choose JSON file from THIS folder (permanent)

## Why Use This?

- Browser updates won't delete your Gantt charts
- You can backup/share these files
- Works across different computers
- Version control friendly

Created: 2025-10-20
