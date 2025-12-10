# Invoice Search - Gmail Account Links on No Results

## Changes Made

### 1. ✅ Removed 15-Day Search Stage
**File:** `spend.html` (line 6737)

**Before:**
- Stage 1: ±5 days (auto)
- Stage 2: ±10 days (auto)
- Stage 3: ±15 days (manual prompt) ❌ **Removed**

**After:**
- Stage 1: ±5 days (auto)
- Stage 2: ±10 days (auto)

**Result:**
- No more "Continue searching?" prompt
- Search completes after 10 days automatically
- Faster search experience

---

### 2. ✅ Added Gmail Account Buttons
**File:** `spend.html` (lines 7901-7955)

**What it does:**
When no invoices are found, shows buttons to open Gmail for each connected account with the merchant name pre-searched.

**Example UI:**

```
📭
No Invoices Found
Searched up to ±10 days for "www.gaelforcemar"

Open Gmail to search manually:

┌────────────────────────────────────────┐
│ 📧  Open Gmail 1                       │
│     your-email1@gmail.com              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📧  Open Gmail 2                       │
│     your-email2@gmail.com              │
└────────────────────────────────────────┘

[📎 Upload PDF Manually]  [Close]
```

---

## How It Works

### When Search Finds Nothing:

1. **Searches Stage 1 (±5 days)**
   - No results found

2. **Searches Stage 2 (±10 days)**
   - No results found

3. **Shows "No Invoices Found" screen**
   - Displays merchant name searched
   - Shows Gmail account buttons (one per connected account)
   - Each button opens Gmail in new tab with pre-searched query

---

## Gmail Button Functionality

### What Clicking a Button Does:

```javascript
window.open('https://mail.google.com/mail/u/0/#search/www.gaelforcemar', '_blank')
```

**URL Structure:**
- `mail.google.com/mail/u/0/` - Opens Gmail account 0 (first account)
- `mail.google.com/mail/u/1/` - Opens Gmail account 1 (second account)
- `#search/www.gaelforcemar` - Pre-fills search with merchant name
- `_blank` - Opens in new tab

**Result:**
- Opens Gmail in new tab
- Automatically searches for the merchant name
- User can manually browse results or refine search
- User can drag/drop invoice back to the app

---

## Button Styling

**Features:**
- Gmail red gradient background (#EA4335 → #C5221F)
- Shows account number (Gmail 1, Gmail 2)
- Shows email address below
- Hover effect: Lifts up with shadow
- Responsive layout (stacks vertically)

**CSS:**
```css
background: linear-gradient(135deg, #EA4335 0%, #C5221F 100%);
padding: 12px 20px;
box-shadow: 0 2px 4px rgba(234,67,53,0.2);
transition: all 0.2s;

/* On hover */
transform: translateY(-2px);
box-shadow: 0 4px 8px rgba(234,67,53,0.3);
```

---

## User Experience Flow

### Before:
```
Search Stage 1 (±5 days) → No results
Search Stage 2 (±10 days) → No results
Prompt: "Continue searching ±15 days?" → Click Yes
Search Stage 3 (±15 days) → No results
Show: "No invoices found" + Upload button
```
**Issues:**
- Extra manual step (clicking "Continue")
- Longer search time
- No guidance on next steps

### After:
```
Search Stage 1 (±5 days) → No results
Search Stage 2 (±10 days) → No results (auto)
Show: "No invoices found"
  + Gmail 1 button (opens email1@gmail.com with search)
  + Gmail 2 button (opens email2@gmail.com with search)
  + Upload PDF Manually button
```
**Benefits:**
- ✅ Faster (no manual prompt)
- ✅ Direct access to Gmail accounts
- ✅ Pre-searched query saves time
- ✅ User can manually check if invoice exists elsewhere

---

## Example Scenarios

### Scenario 1: Email exists but outside date range
```
App searches ±10 days → No results
User clicks "Open Gmail 1"
  → Opens Gmail with "www.gaelforcemar" search
  → User sees invoice from 2 months ago
  → User drags PDF back to app
✅ Success!
```

### Scenario 2: Email in different account
```
App searches both accounts ±10 days → No results
User clicks "Open Gmail 2" (second account)
  → Opens Gmail with search
  → User finds invoice in second account (outside date range)
  → User drags PDF back to app
✅ Success!
```

### Scenario 3: No email exists
```
App searches → No results
User clicks both Gmail buttons
  → Manually confirms invoice doesn't exist
User clicks "Upload PDF Manually"
  → Uploads local PDF file
✅ Success!
```

---

## Code Details

### Gmail Account Detection
```javascript
if (gmailAccounts && gmailAccounts.length > 0) {
    gmailAccountButtons = gmailAccounts.map((account, index) => {
        // Create button for each account
        return `<button onclick="window.open('...')">...</button>`;
    }).join('');
}
```

### URL Encoding
```javascript
encodeURIComponent(context.merchantName)
```
**Handles special characters:**
- `www.gaelforcemar` → `www.gaelforcemar`
- `Google GSUITE` → `Google%20GSUITE`
- `&` → `%26`

---

## Testing

**To verify it works:**

1. **Hard refresh** (Ctrl+F5 or Cmd+Shift+R)

2. **Trigger search for merchant with no invoice:**
   - Select a transaction
   - Press E (Find Invoice)
   - Wait for search to complete

3. **Check "No Invoices Found" screen:**
   - Should show "Searched up to ±10 days" (not ±15)
   - Should show 2 Gmail buttons (one per account)
   - Each button should show account number and email

4. **Click Gmail button:**
   - Should open Gmail in new tab
   - Should show search for merchant name
   - Should be in correct account (check email in top-right)

5. **Verify drag-drop still works:**
   - Find invoice in Gmail manually
   - Drag attachment back to app drop zone
   - Should attach successfully

---

## Files Modified
- `spend.html`
  - Line 6737: Removed stage 3 (15-day search)
  - Lines 7901-7955: Added Gmail account buttons to no-results screen

---

## Related Functions
- `showNoResultsOptions(context)` - Displays no-results UI with Gmail buttons
- `executeIntelligentSearch()` - Main search orchestrator
- `SEARCH_STAGES` - Array of search stages (now only 2 stages)

---

**Status:** ✅ Complete
**Date:** 2025-10-27
**Feature:** Gmail account links on invoice search failure
**User Benefit:** Easy access to Gmail for manual invoice searching
