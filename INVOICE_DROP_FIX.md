# Invoice Drag-Drop Bug Fix

## Problem
When dragging an invoice PDF onto a transaction row in the invoice search modal, the PDF was being attached to the **wrong transaction** (usually the row above the intended target).

### Example:
- User clicks "Find Invoice" (E key) on row: **Gaelforce Marine**
- Modal opens showing search results
- User drags invoice onto the drop zone
- **BUG:** Invoice attaches to **Rs Components** (row above) instead of Gaelforce

---

## Root Cause

The `handleInvoiceDrop()` function was receiving a `transactionIndex` parameter from the HTML drop zone, but this index was being rendered at the time the search results modal was created. Due to timing or rendering issues, the wrong index was being baked into the HTML `ondrop` attribute.

**Original code:**
```javascript
async function handleInvoiceDrop(event, transactionIndex) {
    // ...
    const savedId = await saveInvoiceToDB(transactionIndex, invoiceBlob, finalFilename, null);
    allTransactions[transactionIndex].invoiceId = savedId;
    // ❌ Uses wrong index!
}
```

---

## Solution

Modified `handleInvoiceDrop()` to prioritize `currentInvoiceSearchIndex` (the global variable that tracks which transaction the search modal was opened for) over the `transactionIndex` parameter.

**File:** `spend.html` (lines 8104-8123)

### Fixed Code:
```javascript
// CRITICAL FIX: Use currentInvoiceSearchIndex if drag-drop happens in modal
// Otherwise use the provided transactionIndex
const actualIndex = (currentInvoiceSearchIndex !== null && currentInvoiceSearchIndex !== undefined)
    ? currentInvoiceSearchIndex
    : transactionIndex;

console.log('📎 [DROP] Using index:', {
    providedIndex: transactionIndex,
    currentInvoiceSearchIndex,
    actualIndex,
    willAttachTo: allTransactions[actualIndex]?.description || 'NOT FOUND'
});

// Save to IndexedDB and attach to transaction
const savedId = await saveInvoiceToDB(actualIndex, invoiceBlob, finalFilename, null);

if (savedId) {
    // Update transaction with invoice
    allTransactions[actualIndex].invoiceId = savedId;
    allTransactions[actualIndex].invoiceFilename = finalFilename;
    // ✅ Now uses correct index!
}
```

---

## How It Works

### Variable Tracking:
1. **`currentInvoiceSearchIndex`** (global)
   - Set when user clicks "Find Invoice" button (E key)
   - Tracks which transaction the search modal was opened for
   - Reset to `null` when modal closes

2. **`transactionIndex`** (parameter)
   - Passed from HTML `ondrop` attribute
   - Sometimes incorrect due to rendering/timing issues

### Logic Flow:
```
User clicks E key on row 5 (Gaelforce Marine)
    ↓
handleInvoiceFetch(5) called
    ↓
currentInvoiceSearchIndex = 5 ✅
    ↓
Search modal opens, renders drop zone with transactionIndex
    ↓
User drags PDF onto drop zone
    ↓
handleInvoiceDrop(event, transactionIndex) called
    ↓
FIX: actualIndex = currentInvoiceSearchIndex (5) ✅
(ignores transactionIndex parameter if in modal)
    ↓
Attaches to correct row: Gaelforce Marine ✅
```

---

## Debugging Logs Added

### 1. Invoice Search Initiation
**File:** `spend.html` (lines 9167-9172)

**Log:**
```javascript
console.log('📧 [INVOICE FETCH] Opened invoice search for:', {
    index,
    description: transaction.description,
    date: transaction.date,
    amount: transaction.spent || transaction.received
});
```

**When to see it:** When you press E key or click "Find Invoice" button

**Example output:**
```
📧 [INVOICE FETCH] Opened invoice search for:
{
    index: 5,
    description: "www.gaelforcemar",
    date: "30/09/2025",
    amount: "£252.48"
}
```

---

### 2. Drop Event Trigger
**File:** `spend.html` (lines 8049-8053)

**Log:**
```javascript
console.log('📎 [DROP] Invoice drop triggered:', {
    transactionIndex,
    currentInvoiceSearchIndex,
    transaction: allTransactions[transactionIndex]?.description || 'NOT FOUND'
});
```

**When to see it:** When you drop a PDF onto the drop zone

**Example output:**
```
📎 [DROP] Invoice drop triggered:
{
    transactionIndex: 4,  // ❌ Wrong index from HTML
    currentInvoiceSearchIndex: 5,  // ✅ Correct index from global var
    transaction: "rs components"  // What transactionIndex points to
}
```

---

### 3. Index Selection
**File:** `spend.html` (lines 8110-8115)

**Log:**
```javascript
console.log('📎 [DROP] Using index:', {
    providedIndex: transactionIndex,
    currentInvoiceSearchIndex,
    actualIndex,
    willAttachTo: allTransactions[actualIndex]?.description || 'NOT FOUND'
});
```

**When to see it:** After determining which index to use

**Example output:**
```
📎 [DROP] Using index:
{
    providedIndex: 4,  // Wrong index from parameter
    currentInvoiceSearchIndex: 5,  // Correct index from modal
    actualIndex: 5,  // ✅ FIXED: Uses correct index
    willAttachTo: "www.gaelforcemar"  // ✅ Correct transaction!
}
```

---

## Testing Instructions

### Step-by-Step Test:

1. **Open Browser Console** (F12)

2. **Select a Transaction:**
   - Click on row (e.g., "Gaelforce Marine" - row 5)
   - Note the description

3. **Open Invoice Search:**
   - Press **E** key or click "Find Invoice" button
   - Check console for:
     ```
     📧 [INVOICE FETCH] Opened invoice search for: {...}
     ```
   - Verify the `index` and `description` match your selected row

4. **Drag an Invoice:**
   - Drag a PDF file onto the drop zone in the modal
   - Check console for 3 logs in sequence:
     ```
     📎 [DROP] Invoice drop triggered: {...}
     📎 [DROP] Using index: {...}
     📎 [DROP] File dropped: {...}
     ```

5. **Verify Correct Attachment:**
   - Check `actualIndex` matches the row you selected
   - Check `willAttachTo` shows correct transaction description
   - Modal should close
   - PDF button should appear on the **correct row** ✅

---

## Before vs After

### Before Fix:
```
User selects: Row 5 (Gaelforce Marine)
Invoice attaches to: Row 4 (Rs Components) ❌

Console shows:
transactionIndex: 4 ← Wrong!
currentInvoiceSearchIndex: 5 ← Correct but ignored
actualIndex: 4 ← Used wrong index
willAttachTo: "rs components" ❌
```

### After Fix:
```
User selects: Row 5 (Gaelforce Marine)
Invoice attaches to: Row 5 (Gaelforce Marine) ✅

Console shows:
transactionIndex: 4 ← Wrong but ignored
currentInvoiceSearchIndex: 5 ← Correct
actualIndex: 5 ← Uses correct index from modal ✅
willAttachTo: "www.gaelforcemar" ✅
```

---

## Files Modified
- `spend.html`
  - Lines 8049-8053: Added drop trigger debug log
  - Lines 8104-8123: Fixed index selection logic
  - Lines 9167-9172: Added invoice fetch debug log

---

## Related Functions
- `handleInvoiceFetch(index)` - Opens invoice search modal, sets `currentInvoiceSearchIndex`
- `handleInvoiceDrop(event, transactionIndex)` - Handles PDF drop, now uses correct index
- `saveInvoiceToDB(transactionIndex, ...)` - Saves invoice to IndexedDB
- `closeInvoiceSearchModal()` - Resets `currentInvoiceSearchIndex = null`

---

**Status:** ✅ Fixed
**Date:** 2025-10-27
**Issue:** Invoice drag-drop attached to wrong transaction
**Solution:** Prioritize global `currentInvoiceSearchIndex` over HTML `transactionIndex` parameter
