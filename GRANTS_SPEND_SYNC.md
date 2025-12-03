# Grants ↔ Spend Page Synchronization

## Problem
When users added Details, attached PDFs, or assigned transactions in spend.html, the changes didn't appear in grants.html until the page was manually refreshed. The two pages were not synced.

## Solution
Implemented **automatic data synchronization** that refreshes grants page data whenever you switch from spend.html to grants.html.

---

## How It Works Now

### Automatic Sync (3 Ways)

#### 1. **Page Visibility Change** (Primary Method)
When you switch browser tabs from Spend → Grants:
```
User clicks "Grants" tab
    ↓
Browser fires 'visibilitychange' event
    ↓
refreshTransactionData() runs automatically
    ↓
Loads latest transactions and PDFs
    ↓
Re-renders budget display
    ↓
Shows notification: "✅ Synced! X transactions, Y PDFs"
```

**File:** `grants.html` (lines 1562-1567)

#### 2. **Window Focus** (Fallback Method)
When you click on the grants page window:
```
User clicks grants page window
    ↓
Window 'focus' event fires
    ↓
refreshTransactionData() runs
    ↓
Data refreshes automatically
```

**File:** `grants.html` (lines 1569-1573)

#### 3. **Manual Sync Button** (User-Triggered)
New green button in navigation bar:
- **Button:** "🔄 Sync Spend Data"
- **Location:** Top navigation bar (far right)
- **Action:** Manually triggers `refreshTransactionData()`
- **Use case:** Force refresh if auto-sync didn't work

**File:** `grants.html` (line 775)

---

## What Gets Synced

### From Spend Page → Grants Page:
- ✅ Transaction **Details** (text entered with T key or microphone)
- ✅ **PDF attachments** (invoices uploaded via E key or drag-drop)
- ✅ Transaction **assignments** (budget item assignments)
- ✅ Transaction **amounts** (spent ex. VAT calculations)
- ✅ Transaction **dates** and descriptions
- ✅ **Quarter assignments** (Q1, Q2, Q3, Q4)

### Data Flow:
```
Spend Page                    IndexedDB                     Grants Page
─────────────────────────────────────────────────────────────────────────

1. User adds detail      →    csvFiles store updated    →   Auto-refresh
2. User attaches PDF     →    invoices store updated    →   Loads new data
3. User assigns to item  →    assignments saved         →   Re-renders display

Result: Grants page shows latest data with Details and PDF buttons
```

---

## Technical Implementation

### Function: `refreshTransactionData()`
**File:** `grants.html` (lines 1528-1560)

**What it does:**
1. Counts current cached transactions and invoices
2. Shows "🔄 Syncing spend data..." notification
3. Reloads all transactions from `csvFiles` store
4. Reloads all invoices from `invoices` store
5. Updates `cachedTransactions` and `cachedInvoices`
6. Re-renders budget display if projects are loaded
7. Shows success notification with counts

**Example Console Output:**
```
🔄 [REFRESH] Refreshing transaction data...
📊 [TRANSACTIONS] Loaded 147 transactions from 3 CSV files
📎 [INVOICES] Loaded 12 invoices from database
✅ [REFRESH] Updated cache: 145 → 147 transactions, 10 → 12 invoices
🔄 [REFRESH] Re-rendering budget display...
```

### Function: `loadAllTransactions()`
**File:** `grants.html` (lines 1175-1207)

**What it does:**
- Opens IndexedDB connection
- Reads all CSV files from `csvFiles` store
- Extracts all transactions with their assignments
- Returns flattened array of transactions

### Function: `loadInvoiceAttachments()`
**File:** `grants.html` (lines 1490-1517)

**What it does:**
- Opens IndexedDB connection
- Reads all invoices from `invoices` store
- Returns array of invoice objects with blobs
- Used to match transactions with PDFs

---

## User Experience

### Before Fix:
❌ Add detail in Spend → Switch to Grants → **Detail not showing**
❌ Attach PDF in Spend → Switch to Grants → **No PDF button**
❌ Had to manually refresh browser (F5) to see changes

### After Fix:
✅ Add detail in Spend → Switch to Grants → **Auto-refreshes** → Detail appears
✅ Attach PDF in Spend → Switch to Grants → **Auto-refreshes** → PDF button appears
✅ Assign transaction → Switch to Grants → **Auto-refreshes** → Shows in table
✅ See notification: "✅ Synced! 147 transactions, 12 PDFs (updated)"

---

## Visual Indicators

### Sync Notifications (System Log):
- **Loading:** "🔄 Syncing spend data..."
- **Success (with changes):** "✅ Synced! 147 transactions, 12 PDFs (updated)"
- **Success (no changes):** "✅ Synced! 147 transactions, 12 PDFs (no changes)"

### Manual Sync Button:
- **Color:** Green background (stands out)
- **Icon:** 🔄
- **Label:** "Sync Spend Data"
- **Tooltip:** "Refresh transactions and PDFs from Spend page"

---

## Testing Checklist

**To verify sync is working:**

1. **Open Spend Page:**
   - Add detail to a transaction (press T, type text)
   - Attach a PDF (press E, upload invoice)
   - Assign transaction to a budget item (press 1)
   - Note the transaction details

2. **Switch to Grants Page:**
   - Click "Grants" tab in navigation
   - Watch System Log for: "🔄 Syncing spend data..."
   - Should see: "✅ Synced! X transactions, Y PDFs"

3. **Verify Data Appeared:**
   - Find the budget item you assigned
   - Expand "Assigned Transactions" section
   - Check **Detail column** shows your text
   - Check **PDF column** shows green "📎 View PDF" button
   - Click PDF button to verify it opens

4. **Test Manual Sync Button:**
   - Add more data in Spend
   - Switch to Grants
   - Click "🔄 Sync Spend Data" button
   - Verify new data appears

5. **Check Console Logs:**
   - Press F12 to open DevTools
   - Look for refresh logs showing data counts

---

## Sequence Examples

### Example 1: Add Detail First, Then Assign
```
Step 1 (Spend Page):
  - Press T on row 5
  - Type: "Google cloud compute subscription"
  - Press Enter

Step 2 (Spend Page):
  - Press 1 on row 5
  - Select: Project "ALGASMART" → Materials → "Cloud services"
  - Confirm assignment

Step 3 (Grants Page):
  - Click "Grants" tab
  - Auto-sync runs: "✅ Synced! 147 transactions, 12 PDFs (updated)"
  - Navigate to: ALGASMART → Materials → Cloud services
  - Expand "Assigned Transactions"
  - See row with Detail: "Google cloud compute subscription"
```

### Example 2: Assign First, Add PDF and Detail Later
```
Step 1 (Spend Page):
  - Press 1 on row 10
  - Assign to: Project "ALGASMART" → Travel → "Conference registration"

Step 2 (Grants Page):
  - Switch to Grants
  - See row in Assigned Transactions (no detail, no PDF)

Step 3 (Spend Page):
  - Go back to Spend
  - Press E on row 10
  - Upload invoice PDF
  - Press T on row 10
  - Type: "EGU Conference Vienna registration fee"

Step 4 (Grants Page):
  - Switch to Grants again
  - Auto-sync runs
  - Now see: Detail + green PDF button ✅
```

---

## Troubleshooting

### Issue: Data Not Syncing

**Check 1: Browser Console**
- Press F12, check console
- Should see: "👁️ [VISIBILITY] Page became visible - refreshing data..."
- If not appearing, visibility API might not be supported

**Check 2: Manual Sync Button**
- Click "🔄 Sync Spend Data" button
- Should force a refresh
- Check System Log for sync notification

**Check 3: Hard Refresh**
- Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Clears cached scripts
- Should see sync on next switch

**Check 4: IndexedDB Data**
- F12 → Application → IndexedDB → PEBLGrantsBudgets
- Check `csvFiles` store has transactions
- Check `invoices` store has PDFs
- Verify transaction has `detail` field and `invoiceId` field

---

## Files Modified
- `grants.html`
  - Lines 775: Added manual "Sync Spend Data" button
  - Lines 1528-1560: Added `refreshTransactionData()` function
  - Lines 1562-1567: Added visibility change listener
  - Lines 1569-1573: Added window focus listener
  - Lines 1305-1317: Updated detail column to use `transaction.detail`

---

**Status:** ✅ Complete
**Date:** 2025-10-27
**Feature:** Automatic sync between Spend and Grants pages
**User Benefit:** No more manual refreshing - data always up-to-date!
