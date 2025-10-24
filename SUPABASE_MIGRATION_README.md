# 🚀 Supabase Migration - Quick Start Guide

## ✅ What's Been Set Up

You now have everything you need to migrate from IndexedDB to Supabase! Here's what's ready:

### Files Created:
1. **`supabase-client.js`** - Supabase connection with your credentials ✅
2. **`migrate-to-supabase.html`** - Automated migration tool with progress tracking ✅
3. **`test-supabase.html`** - Connection testing tool ✅
4. **`.supabase-credentials.js`** - Service role key (SECRET - for server-side only) ✅

### Supabase Project:
- **Project ID:** gamsynrzeixorftnivps
- **Project URL:** https://gamsynrzeixorftnivps.supabase.co
- **API Keys:** Configured ✅

---

## 🎯 Next Steps (In Order)

### Step 1: Test Your Connection (5 minutes)

1. Open `test-supabase.html` in your browser
2. Click each test button:
   - ✅ **Test Connection** - Should show success
   - ✅ **Test Authentication** - Should show user ID
   - ✅ **Test Database Query** - Should show 0 projects (initially)
   - ✅ **Test Storage** - Should show your buckets

**If any tests fail:** Check that you ran all 4 SQL scripts in Supabase dashboard.

---

### Step 2: Create Storage Buckets (2 minutes)

In your Supabase dashboard:

1. Go to **Storage** (left sidebar)
2. Click **Create a new bucket** (4 times)
3. Create these buckets:

| Bucket Name | Public? |
|-------------|---------|
| `csv-files` | ❌ Private |
| `invoices` | ❌ Private |
| `sketcher-csvs` | ❌ Private |
| `project-images` | ✅ Public |

**Then re-run Script 3** (Storage Policies) from the SQL Editor.

---

### Step 3: Run Migration (10-30 minutes depending on data size)

1. **Backup first!**
   - Open Chrome DevTools (F12)
   - Go to Application → IndexedDB
   - Right-click each database → Export (optional but recommended)

2. **Open `migrate-to-supabase.html`**

3. **Click "Test Connection"** - Verify it's green ✅

4. **Click "Start Migration"**
   - Watch the progress bar
   - Monitor the log for any errors
   - Migration is safe - your IndexedDB data stays intact

5. **Click "Validate Data"** when done
   - Verify counts match what you expected

---

### Step 4: Verify Your Data (5 minutes)

In Supabase dashboard:

1. Go to **Table Editor**
2. Click on each table and verify data is there:
   - `projects` - Should see your budget projects
   - `csv_files` - Should see metadata (actual files in Storage)
   - `invoices` - Should see invoice records
   - `sketcher_csv_imports` - Should see sketcher data
   - `gantt_projects` - Should see gantt charts

3. Go to **Storage**
4. Browse each bucket and verify files are uploaded

---

## 🎨 Next Phase: Integrate Supabase into Your HTML Files

Once migration is complete, you'll need to update your HTML files to use Supabase instead of IndexedDB.

### Quick Integration Example:

**Add to the `<head>` section of each HTML file:**

```html
<!-- Add before closing </head> tag -->
<script src="supabase-client.js"></script>
```

**Example: Reading projects from Supabase instead of IndexedDB:**

```javascript
// OLD CODE (IndexedDB):
async function loadProjects() {
    const transaction = db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');
    const request = store.getAll();

    request.onsuccess = () => {
        allProjects = request.result;
        updateUI();
    };
}

// NEW CODE (Supabase):
async function loadProjects() {
    await ensureAuthenticated(); // Make sure user is logged in

    const { data, error } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error loading projects:', error);
        return;
    }

    allProjects = data;
    updateUI();
}
```

---

## 🔧 Troubleshooting

### "Connection test failed"
- Check that `supabase-client.js` has your correct API key
- Verify your project URL is correct
- Check browser console for errors

### "Database query failed"
- Make sure you ran all 4 SQL scripts
- Check that RLS policies are enabled
- Verify you're authenticated (run Test Authentication)

### "Storage upload failed"
- Check that buckets are created
- Verify bucket names are spelled correctly
- Make sure Storage Policies (Script 3) are applied

### "Authentication failed"
- Clear localStorage: `localStorage.clear()`
- Refresh page and try again
- Check browser console for specific error

---

## 📊 Migration Timeline

**Already Done:**
- ✅ Supabase project created
- ✅ API keys configured
- ✅ Migration scripts created
- ✅ Test tools created

**This Week (Estimated: 2-3 hours):**
- ⬜ Run SQL scripts (if not done yet) - 10 min
- ⬜ Create storage buckets - 5 min
- ⬜ Test connection - 5 min
- ⬜ Run migration tool - 30 min
- ⬜ Validate data - 10 min

**Next Week (Estimated: 8-12 hours):**
- ⬜ Add Supabase script to grants.html
- ⬜ Update grants.html to read from Supabase
- ⬜ Add Supabase script to spend.html
- ⬜ Update spend.html to read from Supabase
- ⬜ Add Supabase script to index.html (sketcher)
- ⬜ Update sketcher to read from Supabase
- ⬜ Add Supabase script to gantt.html
- ⬜ Update gantt.html to read from Supabase
- ⬜ Test all pages thoroughly

**Week 3 (Estimated: 4-6 hours):**
- ⬜ Remove IndexedDB code (keep as fallback for 1 week)
- ⬜ Monitor for errors
- ⬜ Final cleanup

---

## 💰 Cost Monitoring

**Current Plan:** Free tier
- 500MB database
- 1GB file storage
- 5GB bandwidth/month

**When to Upgrade to Pro ($25/month):**
- When you exceed 1GB file storage
- When you have >500MB database
- When you need >2 active projects
- When projects pause due to inactivity

**Check Usage:**
1. Go to Supabase dashboard
2. Click **Settings** → **Billing**
3. View current usage

---

## 🆘 Need Help?

**Resources:**
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Your Project Dashboard: https://supabase.com/dashboard/project/gamsynrzeixorftnivps

**Common Commands:**

```javascript
// Test if Supabase is ready
console.log('Supabase ready?', isSupabaseReady);

// Check current user
console.log('Current user:', currentUser);

// Test database query
const { data } = await supabaseClient.from('projects').select('*');
console.log('Projects:', data);

// List storage buckets
const { data } = await supabaseClient.storage.listBuckets();
console.log('Buckets:', data);
```

---

## ✅ Current Status

- [x] Supabase project created
- [x] API credentials configured
- [x] Migration tool ready
- [x] Test tool ready
- [ ] SQL scripts run
- [ ] Storage buckets created
- [ ] Connection tested
- [ ] Data migrated
- [ ] Integration into HTML files

**Next action:** Open `test-supabase.html` and verify connection! 🚀
