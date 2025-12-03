# Gmail Invoice Search - Detailed Debugging Logs

## Problem
Need to verify that Gmail invoice search is actually searching through all connected accounts properly, and understand why searches are returning no results.

## Solution
Added comprehensive console logging to track every step of the Gmail search process.

---

## How to Debug

### Step 1: Open Browser Console
Press **F12** → **Console** tab

### Step 2: Clear Console
Click the 🚫 icon to clear old logs

### Step 3: Trigger Invoice Search
- Select a transaction (e.g., Gaelforce Marine)
- Press **E** key or click "Find Invoice" button
- Watch the console output

---

## Console Logs to Look For

### 1. **Search Loop Initialization**
```
🔄 [SEARCH LOOP] Searching 2 account(s) for query: "www.gaelforcemar invoice"
```
**What it shows:** How many accounts will be searched and what query is being used

---

### 2. **Account Processing**
For each account, you'll see:

```
🔍 [SEARCH LOOP] Processing account 1: your-email@gmail.com
{
    hasCheckbox: true,
    isChecked: true,
    accountIndex: 0,
    hasAccessToken: true
}
```

**What to check:**
- ✅ `hasCheckbox: true` - Account checkbox exists in UI
- ✅ `isChecked: true` - Account is selected for search
- ✅ `hasAccessToken: true` - Account has valid Gmail auth token

**If unchecked:**
```
⏭️ [SEARCH LOOP] Skipped account 1 (unchecked)
```

---

### 3. **Gmail API Call Start**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [GMAIL SEARCH START]
   Account: your-email@gmail.com
   Has access token: true
   Token preview: ya29.a0AcM612x0...
   Query: www.gaelforcemar invoice
   Date window: ±5 days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to check:**
- Account email is correct
- Token exists (shows preview)
- Query is what you expect
- Date window is appropriate

---

### 4. **Gmail API Checks**
```
✅ [GMAIL SEARCH] Gmail API is available
✅ [GMAIL SEARCH] Set access token for: your-email@gmail.com
```

**What it shows:** Gmail API initialized and token set successfully

**If error:**
```
❌ [GMAIL SEARCH] Gmail API not initialized
```
→ Problem: Gmail API script didn't load

---

### 5. **Date Range Calculation**
```
📅 [GMAIL SEARCH] Date range: 2025/09/25 to 2025/10/05
🔎 [GMAIL SEARCH] Full Gmail query: www.gaelforcemar invoice after:2025/09/25 before:2025/10/05
```

**What to check:**
- Date range makes sense for your transaction
- Transaction date (09/30/2025) falls within range
- Full query includes date filters

**Common issues:**
- Date parsing errors (DD/MM vs MM/DD)
- Transaction date outside search window
- Invalid date format

---

### 6. **Gmail API Call**
```
⏳ [GMAIL SEARCH] Calling Gmail API...
```
**Status:** Request sent to Gmail

---

### 7. **Gmail API Response**
```
📦 [GMAIL SEARCH] Gmail API response received:
{
    hasResult: true,
    hasMessages: false,
    messageCount: 0,
    resultSizeEstimate: 0
}
```

**What each field means:**
- `hasResult: true` - API call succeeded
- `hasMessages: false` - No emails matched the query
- `messageCount: 0` - Zero results
- `resultSizeEstimate: 0` - Gmail's estimate of total matches

**If messages found:**
```
📦 [GMAIL SEARCH] Gmail API response received:
{
    hasResult: true,
    hasMessages: true,
    messageCount: 3,
    resultSizeEstimate: 3
}

✅ [GMAIL SEARCH] Found 3 message(s) for your-email@gmail.com
   Message IDs: 18f8a..., 18f9b..., 18fac...
```

---

### 8. **No Results**
```
⚠️ [GMAIL SEARCH] No messages found in response
   Result object: { resultSizeEstimate: 0 }
```
**Meaning:** Query completed successfully but returned zero results

---

### 9. **Error Handling**
If an error occurs:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ [GMAIL SEARCH ERROR]
   Account: your-email@gmail.com
   Error type: Error
   Error message: Invalid credentials
   Status: 401
   Full error object: {...}
   Error result: {...}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Common errors:**
- **401 Unauthorized** - Access token expired, need to re-authenticate
- **403 Forbidden** - Gmail API not enabled or scope not granted
- **400 Bad Request** - Invalid query syntax
- **500 Server Error** - Gmail API temporary issue

---

### 10. **Loop Completion**
```
✅ [SEARCH LOOP] Account 1 returned 0 message(s)
⚠️ [SEARCH LOOP] Account 2 returned 0 messages
📊 [SEARCH LOOP] Completed query. Total results: 0
```

**What it shows:** Final tally of results from all accounts

---

## Common Scenarios

### Scenario 1: Both Accounts Search Successfully (No Results)
```
🔄 [SEARCH LOOP] Searching 2 account(s)
🔍 [SEARCH LOOP] Processing account 1: email1@gmail.com
🔎 [SEARCH LOOP] Calling searchGmailWithQuery...
━━━━━ [GMAIL SEARCH START] ━━━━━
✅ Gmail API available
✅ Set access token
📅 Date range: 2025/09/25 to 2025/10/05
🔎 Full query: www.gaelforcemar invoice after:2025/09/25 before:2025/10/05
📦 Response: messageCount: 0
⚠️ No messages found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ [SEARCH LOOP] Account 1 returned 0 messages

🔍 [SEARCH LOOP] Processing account 2: email2@gmail.com
🔎 [SEARCH LOOP] Calling searchGmailWithQuery...
━━━━━ [GMAIL SEARCH START] ━━━━━
✅ Gmail API available
✅ Set access token
📅 Date range: 2025/09/25 to 2025/10/05
🔎 Full query: www.gaelforcemar invoice after:2025/09/25 before:2025/10/05
📦 Response: messageCount: 0
⚠️ No messages found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ [SEARCH LOOP] Account 2 returned 0 messages

📊 [SEARCH LOOP] Total results: 0
```

**Diagnosis:** ✅ Search working correctly, genuinely no matching emails

---

### Scenario 2: Account Unchecked
```
🔄 [SEARCH LOOP] Searching 2 account(s)
🔍 [SEARCH LOOP] Processing account 1: email1@gmail.com
   hasCheckbox: true, isChecked: false ← Not checked!
⏭️ [SEARCH LOOP] Skipped account 1 (unchecked)
```

**Diagnosis:** ❌ Account not selected in UI - check the checkbox!

---

### Scenario 3: No Access Token
```
🔍 [SEARCH LOOP] Processing account 2: email2@gmail.com
   hasAccessToken: false ← No token!
━━━━━ [GMAIL SEARCH START] ━━━━━
   Token preview: MISSING
❌ [GMAIL SEARCH] No valid access token
━━━━━ [GMAIL SEARCH ERROR] ━━━━━
   Error: No valid access token for account
```

**Diagnosis:** ❌ Authentication failed - need to reconnect Gmail

---

### Scenario 4: Expired Token
```
━━━━━ [GMAIL SEARCH START] ━━━━━
✅ Set access token
⏳ Calling Gmail API...
━━━━━ [GMAIL SEARCH ERROR] ━━━━━
   Status: 401
   Error message: Invalid credentials
```

**Diagnosis:** ❌ Token expired - click "Reconnect Gmail"

---

### Scenario 5: Success!
```
🔄 [SEARCH LOOP] Searching 2 account(s)
🔎 Full query: www.gaelforcemar invoice after:2025/09/25 before:2025/10/05
📦 Response: messageCount: 2
✅ Found 2 message(s) for email1@gmail.com
   Message IDs: 18f8a1b2c3, 18f9d4e5f6
✅ [SEARCH LOOP] Account 1 returned 2 message(s)
📊 [SEARCH LOOP] Total results: 2
```

**Diagnosis:** ✅ Working perfectly!

---

## Troubleshooting Checklist

### If seeing "No results":

1. **Check Console Logs:**
   - Do both accounts show search attempts?
   - Are tokens present (`hasAccessToken: true`)?
   - Any error messages?

2. **Verify Date Range:**
   - Does transaction date fall within search window?
   - Is date format correct (DD/MM/YYYY)?

3. **Test Query in Gmail:**
   - Copy full query from console
   - Paste directly into Gmail search box
   - Do you see results manually?

4. **Check Account Selection:**
   - Are checkboxes checked for both accounts?
   - Look for "Skipped (unchecked)" messages

5. **Verify Authentication:**
   - Look for 401 errors
   - Try reconnecting Gmail accounts

6. **Check Email Existence:**
   - Does the invoice email actually exist?
   - Is it in the correct account?
   - Is it within the date range?

---

## Files Modified
- `spend.html`
  - Lines 7043-7120: Added detailed Gmail search logging
  - Lines 7122-7135: Enhanced error logging
  - Lines 6861-6896: Added search loop logging

---

**Status:** ✅ Complete
**Date:** 2025-10-27
**Purpose:** Debug Gmail invoice search across multiple accounts
**Usage:** Open console (F12) and watch logs during invoice search
