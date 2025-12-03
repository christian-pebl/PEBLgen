# Grants Page PDF Button Fix

## Problem
PDF buttons were not showing up in the "Assigned Transactions" table on the grants.html page, even though invoices were attached to transactions in spend.html.

## Root Cause
Two critical functions were missing in grants.html:
1. **`getInvoiceForTransaction()`** - Function to match transactions with their invoices
2. **`loadInvoiceAttachments()`** - Function to load invoices from IndexedDB

Even though the code was calling these functions, they were never defined, causing the PDF column to always show "-" instead of the PDF button.

---

## Changes Made (2025-10-27)

### 1. Added `getInvoiceForTransaction()` Function
**File:** `grants.html` (lines 1274-1291)

**Purpose:** Matches a transaction with its attached invoice

**Logic:**
```javascript
function getInvoiceForTransaction(transaction, invoices) {
    if (!transaction || !invoices || invoices.length === 0) {
        return null;
    }

    // Check if transaction has invoiceId
    if (transaction.invoiceId) {
        return invoices.find(inv => inv.id === transaction.invoiceId);
    }

    // Fallback: try matching by transaction index
    if (transaction.originalIndex !== undefined) {
        return invoices.find(inv => inv.transactionIndex === transaction.originalIndex);
    }

    return null;
}
```

**How it works:**
1. First checks if transaction has `invoiceId` field
2. Searches for matching invoice by ID
3. Fallback: matches by transaction index if invoiceId not found
4. Returns `null` if no match found

---

### 2. Added `loadInvoiceAttachments()` Function
**File:** `grants.html` (lines 1490-1517)

**Purpose:** Loads all invoices from IndexedDB when page loads

**Logic:**
```javascript
async function loadInvoiceAttachments() {
    if (!db) await initIndexedDB();
    if (!db) return [];

    try {
        // Check if invoices store exists
        if (!db.objectStoreNames.contains(INVOICES_STORE_NAME)) {
            console.log('📎 [INVOICES] Invoices store not found');
            return [];
        }

        const transaction = db.transaction([INVOICES_STORE_NAME], 'readonly');
        const store = transaction.objectStore(INVOICES_STORE_NAME);

        const allInvoices = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        console.log(`📎 [INVOICES] Loaded ${allInvoices.length} invoices from database`);
        return allInvoices;
    } catch (error) {
        console.error('❌ [INVOICES] Failed to load invoices:', error);
        return [];
    }
}
```

**How it works:**
1. Opens IndexedDB connection
2. Checks if `invoices` object store exists
3. Retrieves all invoice records
4. Returns array of invoices (used by `preloadTransactionData()`)

---

### 3. Updated Detail Column Logic
**File:** `grants.html` (lines 1305-1317)

**Change:** Now prioritizes `transaction.detail` field (matches spend.html structure)

**Before:**
```javascript
const detailParts = [];
if (transaction.manualDescription) detailParts.push(transaction.manualDescription);
if (transaction.voiceNotes) detailParts.push(`🎤 ${transaction.voiceNotes}`);
const detail = detailParts.length > 0 ? detailParts.join(' | ') : '-';
```

**After:**
```javascript
let detail = '-';
if (transaction.detail) {
    detail = transaction.detail;
} else {
    // Legacy support: combine manual description and voice notes
    const detailParts = [];
    if (transaction.manualDescription) detailParts.push(transaction.manualDescription);
    if (transaction.voiceNotes) detailParts.push(`🎤 ${transaction.voiceNotes}`);
    if (detailParts.length > 0) {
        detail = detailParts.join(' | ');
    }
}
```

---

### 4. Added Debug Logging
**File:** `grants.html` (lines 1333-1341)

**Purpose:** Help diagnose PDF button issues

**Output:**
```javascript
console.log('🔍 [PDF DEBUG] First transaction:', {
    invoiceId: transaction.invoiceId,
    invoiceFilename: transaction.invoiceFilename,
    invoicesCount: invoices ? invoices.length : 0,
    foundInvoice: invoice ? invoice.id : 'none'
});
```

**When to check:**
Open browser console (F12) and look for:
- `📎 [INVOICES] Loaded X invoices from database`
- `🔍 [PDF DEBUG] First transaction:` with invoice details

---

## How It Works Now

### Data Flow:
1. **Page Load:**
   - `preloadTransactionData()` runs
   - `loadInvoiceAttachments()` loads all invoices from IndexedDB
   - Invoices cached in `cachedInvoices` variable

2. **Rendering Budget:**
   - `renderTransactionDetails()` called for each budget item
   - Receives `cachedInvoices` as parameter

3. **For Each Transaction:**
   - `getInvoiceForTransaction(transaction, invoices)` checks for match
   - If match found: Shows green "📎 View PDF" button
   - If no match: Shows gray "-"

4. **Clicking PDF Button:**
   - `viewInvoicePDF(invoiceId)` opens modal
   - Retrieves invoice blob from IndexedDB
   - Displays PDF in iframe

---

## Expected Behavior

### Before Fix:
- PDF column always shows "-" (dash)
- No way to view attached invoices
- Console shows errors about missing functions

### After Fix:
- Transactions with attached PDFs show green "📎 View PDF" button
- Clicking button opens PDF in modal viewer
- Console logs show successful invoice loading
- Detail column shows microphone transcriptions

---

## Testing Checklist

**To verify the fix works:**

1. **Hard Refresh:** Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `📎 [INVOICES] Loaded X invoices from database`
   - If X > 0, invoices are loading correctly

3. **Check PDF Column:**
   - Navigate to grants page
   - Find a transaction you attached a PDF to in spend.html
   - PDF column should show green "📎 View PDF" button
   - Click button to verify PDF opens in modal

4. **Debug Info:**
   - Check console for: `🔍 [PDF DEBUG] First transaction:`
   - Should show `invoiceId`, `invoicesCount`, and `foundInvoice` values

---

## Files Modified
- `grants.html`
  - Lines 1274-1291: Added `getInvoiceForTransaction()` function
  - Lines 1305-1317: Updated detail column logic
  - Lines 1333-1341: Added debug logging
  - Lines 1490-1517: Added `loadInvoiceAttachments()` function

---

## Related Files
- `spend.html` - Where invoices are attached and saved to IndexedDB
- IndexedDB stores:
  - `csvFiles` - Contains transactions with `invoiceId` field
  - `invoices` - Contains invoice blobs and metadata

---

**Status:** ✅ Fixed
**Date:** 2025-10-27
**Issue:** Missing functions prevented PDF buttons from appearing
**Solution:** Added required functions to load and match invoices with transactions
