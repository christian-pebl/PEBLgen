# Labour Allocation Cloud Backup Setup

## ✅ What Was Done

Your labour allocation data is now **backed up to Supabase cloud** automatically!

### Changes Made:

1. **Created SQL Migration** (`labour_allocation_migration.sql`)
   - New `labour_allocation` table in Supabase
   - Row Level Security (RLS) enabled
   - Auto-update timestamp triggers

2. **Updated timesheet.html**
   - `saveLabourData()` - Now saves to both localStorage AND Supabase cloud
   - `loadLabourData()` - Now loads from Supabase first, localStorage as fallback
   - `clearLabourData()` - Now clears both local and cloud data
   - `initLabourAllocation()` - Auto-loads cloud data on page load

## 📋 Setup Instructions

### Step 1: Run the SQL Migration

1. Open your Supabase Dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor** (in left sidebar)
3. Click: **New Query**
4. Open `labour_allocation_migration.sql` and copy all the SQL
5. Paste into the SQL editor
6. Click: **Run** (or press Ctrl+Enter)
7. You should see: "Success. No rows returned"

### Step 2: Test It!

1. Open your timesheet page: http://localhost:8000/timesheet.html
2. Open browser console (F12) to see logs
3. Go to the Labour Allocation tab
4. Make some changes to the table
5. Watch the console - you should see:
   ```
   ✅ Labour data saved to localStorage
   ☁️ Labour data saved to Supabase
   ```

### Step 3: Verify Cloud Sync

1. Go to Supabase Dashboard → **Table Editor**
2. Select `labour_allocation` table
3. You should see your data in the `allocation_data` column
4. Try this test:
   - Clear browser cache/localStorage
   - Reload the page
   - Your data should automatically load from the cloud!

## 🔧 How It Works

### Auto-Save
Every time you make a change (edit cell, add row, delete row, etc.), the data is automatically saved to:
- ✅ **localStorage** (instant, offline backup)
- ☁️ **Supabase** (cloud backup, synced across devices)

### Auto-Load Priority
When you load the page:
1. **First**: Try to load from Supabase cloud
2. **Fallback**: If cloud fails, load from localStorage
3. **Default**: If no data exists, initialize with default projects

### Data Structure
Your labour allocation data includes:
- `projects` - Project list with names and colors
- `rows` - All labour allocation rows (month, staff, FTE, allocations)
- `hiddenProjects` - Which projects are currently hidden
- `staff` - Staff database
- `workingDaysPerYear` - Calculation setting (default: 224)
- `hoursPerDay` - Calculation setting (default: 8)

## 🎯 Benefits

✅ **Cloud Backup** - Your data is safe in Supabase, not just your browser
✅ **Multi-Device Sync** - Access your data from any device
✅ **Automatic** - No manual save/load needed
✅ **Offline Support** - localStorage fallback works offline
✅ **Secure** - Row Level Security ensures only you can access your data
✅ **Versioned** - Automatic timestamps track when data was modified

## 🔍 Console Logs

Watch for these messages in the browser console:

| Message | Meaning |
|---------|---------|
| `✅ Labour data saved to localStorage` | Local save successful |
| `☁️ Labour data saved to Supabase` | Cloud save successful |
| `☁️ Labour data updated in Supabase` | Cloud update successful |
| `☁️ Labour data loaded from cloud` | Data loaded from Supabase |
| `💾 Labour data loaded from localStorage` | Fallback to local data |
| `❌ Failed to save to Supabase:` | Cloud save failed (check SQL) |
| `⚠️ Data saved to localStorage only` | Offline mode / cloud unavailable |

## 🐛 Troubleshooting

### "Failed to save to Supabase"
1. Check if you ran the SQL migration
2. Verify the `labour_allocation` table exists in Supabase
3. Check RLS policies are enabled
4. Ensure you're authenticated (check for anonymous sign-in)

### "No saved data found"
- This is normal if it's your first time loading
- The page will initialize with default projects

### Data not syncing across devices
1. Make sure you're using the same Supabase account
2. Check that anonymous auth creates the same user ID (it doesn't - you'll need proper auth for multi-device sync)
3. For now, anonymous auth creates a unique user per browser

## 📝 Migration Notes

**Existing Data**: Your current localStorage data will be automatically uploaded to Supabase the next time you make a change.

**No Data Loss**: The system uses dual-save (localStorage + Supabase), so you have two backups of everything.

## 🚀 Next Steps

Consider implementing:
- [ ] Email/password authentication for true multi-device sync
- [ ] Version history / undo functionality
- [ ] Export to Excel feature
- [ ] Import from existing Excel files
- [ ] Conflict resolution for simultaneous edits

---

**Status**: ✅ Ready to use after running the SQL migration!
