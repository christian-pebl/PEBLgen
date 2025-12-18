# 🚀 Quick Setup - New Machine

**Setting up PEBLGen on a new laptop? Follow these 3 simple steps:**

---

## Step 1: Install Node.js

Download and install from: https://nodejs.org/
- Choose the LTS (Long Term Support) version
- Run the installer and follow the prompts

**Verify installation:**
```bash
node --version
```
Should show v16 or higher.

---

## Step 2: Clone and Setup

```bash
# Clone the repository
git clone <your-github-repo-url>

# Navigate into the project
cd PEBLGen

# Install all dependencies
npm install
```

---

## Step 3: Start the App

```bash
npm run dev
```

Then open your browser to: **http://localhost:8000**

---

## ✅ That's It!

Your data will automatically be available because:
- ✅ Supabase credentials are already in the code (`supabase-client.js`)
- ✅ All your data lives in the Supabase cloud database
- ✅ Both laptops connect to the same database
- ✅ No manual file copying needed!

---

## 🔍 Verification

After starting the app:

1. **Login** with your account
2. **Check the map** - Your pins/areas should appear
3. **Open browser console** (F12) - Look for:
   ```
   ✅ [SUPABASE] Client initialized
   ✅ [SUPABASE] User authenticated: your-email@example.com
   ```

If you see those messages ✅ - Everything is working perfectly!

---

## ❌ Troubleshooting

**App won't start?**
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` and running `npm install` again

**Can't see your data?**
- Check browser console (F12) for errors
- Make sure you're logged in with the same account
- Verify internet connection (Supabase is cloud-based)

**Port 8000 already in use?**
- Close any other instances of the app
- Or change the port in `package.json`

---

## 📚 Full Documentation

For complete setup details, troubleshooting, and configuration options:
- See **README.md** in this folder

---

## 🔄 Keeping Both Laptops in Sync

### Code Changes
**After making changes on one laptop:**
```bash
git add .
git commit -m "Your changes"
git push
```

**To get changes on the other laptop:**
```bash
git pull
npm install  # Only if dependencies changed
```

### Data Changes
**No action needed!** All data syncs automatically through Supabase.

---

**Need help?** Check README.md for detailed troubleshooting and configuration options.
