# Automatic Backup Data Types

Complete list of all data automatically backed up to Supabase cloud storage.

## Overview

Your application uses **TWO backup systems** working together:

1. **auto-sync-manager.js** - Syncs IndexedDB data to Supabase
2. **universal-backup.js** - Monitors localStorage changes and backs up to Supabase

---

## Data Types Backed Up

### 1. **Projects (Budget Data)**
- **Source:** grants.html
- **Storage:** IndexedDB (`PEBLGrantsBudgets` database, `projects` store)
- **Backup System:** auto-sync-manager.js
- **Supabase Table:** `projects`
- **What's Backed Up:**
  - Project name
  - Project number
  - Complete budget data (quarters, spending, forecasts, allocations)
  - Last modified timestamp
- **Trigger:** Auto-saves 2 seconds after changes
- **Unique Key:** `user_id, project_name`

---

### 2. **CSV Transaction Files**
- **Source:** spend.html
- **Storage:** IndexedDB (`PEBLGrantsBudgets` database, `csvFiles` store)
- **Backup System:** auto-sync-manager.js
- **Supabase Storage:** `csv-files` bucket
- **Supabase Table:** `csv_files` (metadata)
- **What's Backed Up:**
  - Complete CSV file content
  - File name
  - File size
  - Upload date
- **Trigger:** Auto-syncs when CSV uploaded
- **File Path:** `{user_id}/{filename}.csv`

---

### 3. **Invoice PDFs**
- **Source:** spend.html
- **Storage:** IndexedDB (`PEBLGrantsBudgets` database, `invoices` store)
- **Backup System:** auto-sync-manager.js
- **Supabase Storage:** `invoices` bucket
- **Supabase Table:** `invoices` (metadata)
- **What's Backed Up:**
  - PDF file blob
  - Filename
  - Transaction reference
  - Upload date
- **Trigger:** Auto-syncs when PDF attached to transaction
- **File Path:** `{user_id}/{filename}.pdf`

---

### 4. **Transactions**
- **Source:** spend.html
- **Storage:** localStorage (`transactions` key)
- **Backup System:** universal-backup.js
- **Supabase Table:** `transactions`
- **What's Backed Up:**
  - Date
  - Description
  - Amount (spent/received)
  - Bank
  - Category
  - Project allocation
  - Invoice filename (if attached)
  - Notes
  - Complete transaction data (JSON)
- **Trigger:** Auto-backs up when localStorage updated
- **Unique Key:** `user_id, date, description, amount`

---

### 5. **Labour Allocation**
- **Source:** timesheet.html
- **Storage:** localStorage (keys with "labour" or "labor")
- **Backup System:** universal-backup.js
- **Supabase Table:** `labour_allocation_entries`
- **What's Backed Up:**
  - Month (e.g., "2507" = Jul 2025)
  - Staff name
  - Gross pay
  - FTE (Full-Time Equivalent)
  - Project allocations (JSON)
  - Complete entry data (JSON)
- **Trigger:** Auto-backs up when staff allocations saved
- **Unique Key:** `user_id, month, staff_name`
- **Validation:** Requires month and staff name to be valid

---

### 6. **Gantt Charts**
- **Source:** gantt.html
- **Storage:** localStorage (`ganttProjects` or `peblgen_gantt_projects`)
- **Backup System:** Both systems
  - auto-sync-manager.js (full sync)
  - universal-backup.js (incremental)
- **Supabase Table:** `gantt_projects`
- **What's Backed Up:**
  - Project name
  - Tasks (array with task numbers, names, deliverable codes)
  - Complete gantt data (JSON)
- **Trigger:** Auto-backs up when gantt project modified
- **Unique Key:** `user_id, project_key` or `user_id, project_name`

---

### 7. **Sketcher CSV Imports**
- **Source:** index.html (Marine Species Sketcher)
- **Storage:** IndexedDB (`MarineSpeciesSketcherDB` database, `csvImports` store)
- **Backup System:** auto-sync-manager.js
- **Supabase Storage:** `sketcher-csvs` bucket
- **Supabase Table:** `sketcher_csv_imports` (metadata)
- **What's Backed Up:**
  - CSV content (converted to string)
  - File name
  - Row count
  - Upload date
- **Trigger:** Auto-syncs when CSV imported in Sketcher
- **File Path:** `{user_id}/{filename}.csv`

---

### 8. **Quotes**
- **Source:** quote.html
- **Storage:** localStorage (keys with "quote")
- **Backup System:** universal-backup.js
- **Supabase Table:** `quotes`
- **What's Backed Up:**
  - Quote number
  - Client name, organization, address
  - Quote date
  - Valid until date
  - Items (line items array)
  - Subtotal, VAT, Total
  - Notes
  - Status (draft/sent/accepted)
  - Complete quote data (JSON)
- **Trigger:** Auto-backs up when quote saved
- **Unique Key:** `user_id, quote_number`

---

### 9. **Invoices (Generated)**
- **Source:** quote.html or invoice generation features
- **Storage:** localStorage (keys with "invoice")
- **Backup System:** universal-backup.js
- **Supabase Table:** `saved_invoices`
- **What's Backed Up:**
  - Invoice number
  - Client name, organization, address
  - Invoice date
  - Due date
  - Items (line items array)
  - Subtotal, VAT, Total
  - Notes
  - Status (draft/sent/paid)
  - Complete invoice data (JSON)
- **Trigger:** Auto-backs up when invoice saved
- **Unique Key:** `user_id, invoice_number`
- **Note:** Different from invoice PDFs (#3 above)

---

### 10. **Clients**
- **Source:** quote.html or client management
- **Storage:** localStorage (keys with "client")
- **Backup System:** universal-backup.js
- **Supabase Table:** `clients`
- **What's Backed Up:**
  - Client name
  - Organization
  - Email
  - Phone
  - Address
  - Notes
  - Complete client data (JSON)
- **Trigger:** Auto-backs up when client saved
- **Unique Key:** `user_id, client_name, organization`

---

### 11. **Price List Items**
- **Source:** quote.html or pricing management
- **Storage:** localStorage (keys with "pricelist")
- **Backup System:** universal-backup.js
- **Supabase Table:** `price_list`
- **What's Backed Up:**
  - Item name
  - Description
  - Unit price
  - Unit (e.g., "per hour", "per item")
  - Category
  - Complete item data (JSON)
- **Trigger:** Auto-backs up when price list updated
- **Unique Key:** `user_id, item_name`

---

### 12. **Timesheets**
- **Source:** timesheet.html (if stored separately, not as history)
- **Storage:** localStorage (keys with "timesheet", excluding "history")
- **Backup System:** universal-backup.js
- **Supabase Table:** `timesheets`
- **What's Backed Up:**
  - Date
  - Staff name
  - Project
  - Hours worked
  - Task description
  - Notes
  - Complete timesheet data (JSON)
- **Trigger:** Auto-backs up when timesheet saved
- **Unique Key:** `user_id, date, staff_name, project`
- **Validation:** Requires valid date field
- **Note:** `timesheetHistory` is **NOT** backed up (UI state only)

---

## Data That's NOT Backed Up

### Excluded (Intentionally)
- **UI State:** Keys with "history", "cache", "temp"
- **timesheetHistory** - UI history for viewing previous generations
- **Temporary session data**
- **Authentication tokens**
- **User preferences** (may be added in future)

---

## Backup Timing

### Auto-Sync (IndexedDB → Supabase)
- **Debounce Delay:** 2 seconds after last change
- **Retry Attempts:** 3 times on failure
- **Retry Delay:** 5 seconds between retries
- **Periodic Full Sync:** Every 5 minutes
- **Auto-Restore:** Restores data if browser cache cleared

### Universal Backup (localStorage → Supabase)
- **Trigger:** Immediately when localStorage.setItem() called
- **Queue Processing:** Batched with 500ms delay
- **Retry:** Up to 3 attempts with exponential backoff
- **Notifications:** Shows banner on failure, silent on success

---

## Monitoring Backup Status

### Cloud Sync Icon (☁️)
- Click the cloud icon in top navigation
- Shows detailed status:
  - ✅ All backed up - Green
  - ⟳ Syncing now - Blue, spinning
  - ⏳ Changes pending - Orange, pulsing
  - ❌ Sync failed - Red
- Dropdown shows:
  - Last sync time
  - What's backed up
  - Error details if failed

### Console Logs
- `✅ [AUTO-SYNC]` - Background sync messages
- `✅ [UNIVERSAL-BACKUP]` - localStorage backup messages
- `❌` prefix indicates errors
- `ℹ️` prefix indicates skipped items

---

## Storage Requirements

### Supabase Tables (12 tables)
1. `projects`
2. `transactions`
3. `labour_allocation_entries`
4. `csv_files` (metadata)
5. `invoices` (metadata)
6. `sketcher_csv_imports` (metadata)
7. `gantt_projects`
8. `quotes`
9. `saved_invoices`
10. `clients`
11. `price_list`
12. `timesheets`

### Supabase Storage Buckets (3 buckets)
1. `csv-files` - Transaction CSV files
2. `invoices` - PDF invoices
3. `sketcher-csvs` - Marine species data CSVs

### IndexedDB Databases (2 databases)
1. `PEBLGrantsBudgets` (version 6) - Projects, CSVs, invoices
2. `MarineSpeciesSketcherDB` (version 1) - Sketcher imports

---

## Data Recovery

If you lose local data:
1. **Automatic:** Backup systems auto-restore on cache clear
2. **Manual:** Click cloud icon → "Sync Now" to pull from cloud
3. **Full Restore:** All data restored from Supabase on first load

---

## Security

- **User Isolation:** All data scoped to `user_id`
- **Row Level Security (RLS):** Enforced on all tables
- **Private Storage:** User files not publicly accessible
- **Authentication Required:** Must be signed in to backup/restore

---

**Last Updated:** January 19, 2026
**Total Data Types:** 12
**Total Tables:** 12
**Total Storage Buckets:** 3
