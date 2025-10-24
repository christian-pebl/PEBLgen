# Quick Setup Instructions for Supabase Backup

## Your Issue

The "Authenticating..." button was stuck because the database tables don't exist yet. The app is authenticated, but can't sync because there's nowhere to sync to!

## Fix (3 minutes)

### Step 1: Run the SQL Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your **PEBLGen** project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Open the file `SETUP_SUPABASE_DATABASE.sql` from this folder
6. Copy the ENTIRE contents
7. Paste into the SQL Editor
8. Click **RUN** (or press Ctrl+Enter)

You should see: **"Success. No rows returned"**

### Step 2: Refresh Your App

1. Go back to your PEBLGen app (spend.html or any page)
2. Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. Wait 5 seconds

### Step 3: Verify It's Working

Look at the cloud icon in the top-right corner:

- **Green border with ✓** = Everything working! Your data is backing up!
- **Red border with ⚠️** = Still an error (see below)

If you see red, click the cloud icon to see the error message.

## What This Does

The SQL script creates:
- **7 database tables** for storing your data
- **4 storage buckets** for files (CSVs, PDFs, images)
- **Security policies** so only you can see your data
- **Auto-update triggers** to track when things change

## After Setup

Your app will now:
- ✅ Auto-backup every 2 seconds after you make changes
- ✅ Auto-backup every 5 minutes (just in case)
- ✅ Show you the sync status with the cloud icon
- ✅ Auto-restore your data if browser cache clears

No manual saves needed!

## Troubleshooting

### Error: "bucket already exists"
- **Ignore this!** It means the bucket was already created. This is fine.

### Error: "policy already exists"
- **Ignore this!** It means you ran the script twice. This is fine.

### Cloud icon still shows error
1. Open browser console (F12)
2. Look for red error messages starting with `[AUTO-SYNC]`
3. Copy the error and I can help debug

### Anonymous sign-ins not enabled
1. Go to Supabase Dashboard
2. Click **Authentication** → **Settings**
3. Scroll to "Allow anonymous sign-ins"
4. **Turn it ON**
5. Refresh your app

## Questions?

Check the detailed docs:
- `SUPABASE_MIGRATION_README.md` - Full technical details
- `HYBRID_BACKUP_SETUP.md` - How the hybrid system works
