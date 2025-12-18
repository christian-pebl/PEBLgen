# Quick Test Guide - Custom Transaction Editing

## 🚀 Quick Start (5 minutes)

### Prerequisites Check
```bash
# 1. Start the application
# Navigate to http://localhost:8000/grants.html

# 2. Open Browser DevTools
# Press F12 or Right-click → Inspect → Console tab
```

### Step 1: Create a Test Transaction (if needed)

1. Load a project or create one
2. Find "Travel and Subsistence" section
3. Click "+ Add Custom Transaction" button
4. Fill in:
   - Date: `2025-01-15`
   - Description: `Test Transaction`
   - Amount: `500`
   - VAT: `20%`
   - Quarter: `Q2`
   - Split %: `50`
5. Click "💾 Save Transaction"

### Step 2: Test Editing

1. **Find the transaction** - Look for "[CUSTOM] Test Transaction" with blue "✏️ Edit" button
2. **Click "✏️ Edit"** - Edit form should appear below the transaction
3. **Verify form shows**:
   - ✅ Title says "✏️ Edit Custom Transaction" (blue color)
   - ✅ Button says "💾 Update Transaction"
   - ✅ All fields show current values
   - ✅ Description shows "Test Transaction" (no [CUSTOM] prefix in input)

4. **Make changes**:
   - Change Quarter to: `Q1`
   - Change Split % to: `100`

5. **Click "💾 Update Transaction"**

6. **Verify success**:
   - ✅ Alert says "✅ Custom transaction updated successfully!"
   - ✅ Form closes
   - ✅ Transaction now shows Quarter: Q1, Split: 100%
   - ✅ No duplicate transaction appears

### Step 3: Verify Console Logs

**Look for these logs in order**:

```
✏️ [CUSTOM TX] Editing transaction: {...}
✏️ [CUSTOM TX] Parsed transaction data: {...}
📝 [CUSTOM TX] Showing form: {..., isEditMode: true}
💾 [CUSTOM TX] Saving custom transaction: {...}
💾 [CUSTOM TX] Mode: EDIT
💾 [CUSTOM TX] Found at index: 0
✅ [CUSTOM TX] Updated existing transaction at index: 0
✅ [CUSTOM TX] NEW Quarter: 1 NEW Split: 100
✅ [CUSTOM TX] Transaction saved successfully to database
🔄 [CUSTOM TX] Reloading all transactions...
✅ [CUSTOM TX] Found saved transaction in cache: {...}
🎨 [CUSTOM TX] Re-rendering grants page...
```

### ✅ Success Criteria

- [ ] Edit form opens with current values
- [ ] Form title is blue and says "Edit"
- [ ] Button says "Update" not "Save"
- [ ] Changes are saved
- [ ] Success alert appears
- [ ] No duplicate transactions
- [ ] Console shows "Mode: EDIT"
- [ ] Console shows "Found at index: X" (not "NOT FOUND")

### ❌ Failure Indicators

- Form doesn't open
- Form shows wrong values
- Button does nothing
- Console shows "Mode: ADD" instead of "Mode: EDIT"
- Console shows "NOT FOUND"
- Duplicate transaction appears
- JavaScript errors in console

## 🐛 Troubleshooting

### Issue: No Edit button visible
**Solution**: Verify transaction description starts with "[CUSTOM]"

### Issue: Edit form doesn't open
**Solution**: Check console for errors. Verify form container exists.

### Issue: Console shows "NOT FOUND"
**Cause**: Transaction matching failed
**Check**: Look for logs showing comparison:
```
💾 [CUSTOM TX] Comparing: {txDate, originalDate, dateMatch, storedDesc, originalDescription, descMatch}
```
Verify date and description match exactly.

### Issue: Changes not saved
**Check**: Look for database errors:
```
❌ [CUSTOM TX] IndexedDB put failed: [error]
```

### Issue: Duplicate transaction created
**Cause**: Edit mode not detected
**Check**: Console should show "Mode: EDIT" not "Mode: ADD"
**Check**: Verify `customTransactionEditData[formId]` is set

## 📊 Expected Console Output (Full Example)

```
✏️ [CUSTOM TX] Editing transaction: {
  transactionDate: "2025-01-15",
  transactionDescription: "[CUSTOM] Test Transaction",
  projectId: "PEBL-GEN-001",
  category: "Travel",
  itemKey: ""
}
✏️ [CUSTOM TX] Parsed transaction data: {
  date: "2025-01-15",
  description: "[CUSTOM] Test Transaction",
  spent: 500,
  spent_ex_vat: 416.67,
  zeroVAT: false,
  quarter: 2,
  percentage: 50,
  detail: "",
  transactionRef: ""
}
📝 [CUSTOM TX] Showing form: {
  formId: "custom-tx-form-Travel-all",
  projectId: "PEBL-GEN-001",
  category: "Travel",
  itemKey: "",
  isEditMode: true
}

[User clicks Update Transaction button]

💾 [CUSTOM TX] Saving custom transaction: {
  formId: "custom-tx-form-Travel-all",
  projectId: "PEBL-GEN-001",
  category: "Travel",
  itemKey: ""
}
💾 [CUSTOM TX] formId: custom-tx-form-Travel-all
💾 [CUSTOM TX] customTransactionEditData keys: ["custom-tx-form-Travel-all"]
💾 [CUSTOM TX] customTransactionEditData[formId]: {date: "2025-01-15", description: "[CUSTOM] Test Transaction", ...}
💾 [CUSTOM TX] Mode: EDIT
💾 [CUSTOM TX] Edit data: {date: "2025-01-15", description: "[CUSTOM] Test Transaction", ...}
💾 [CUSTOM TX] Original (stripped): {originalDate: "2025-01-15", originalDescription: "Test Transaction"}
💾 [CUSTOM TX] New values from form: {date: "2025-01-15", description: "Test Transaction", quarter: 1, splitPercentage: 100}
💾 [CUSTOM TX] VAT Select element: [object HTMLSelectElement]
💾 [CUSTOM TX] VAT Select value: 20
💾 [CUSTOM TX] VAT Select value type: string
💾 [CUSTOM TX] Calculated vatRate: 20
💾 [CUSTOM TX] 20% VAT - amountExVat = amountIncVat/1.2 = 416.67
💾 [CUSTOM TX] Final values: {amountIncVat: 500, amountExVat: 416.67, zeroVAT: false, vatRate: 20}
💾 [CUSTOM TX] Transaction object to save: {...}
💾 [CUSTOM TX] Assignment details: {quarter: 1, splitPercentage: 100, quarterType: "number", splitType: "number"}
💾 [CUSTOM TX] customFile: {name: "custom_transactions.csv", transactions: Array(1), ...}
💾 [CUSTOM TX] Looking for: {originalDate: "2025-01-15", originalDescription: "Test Transaction"}
💾 [CUSTOM TX] Transactions in file: [{date: "2025-01-15", desc: "[CUSTOM] Test Transaction"}]
💾 [CUSTOM TX] Comparing: {
  txDate: "2025-01-15",
  originalDate: "2025-01-15",
  dateMatch: true,
  storedDesc: "Test Transaction",
  originalDescription: "Test Transaction",
  descMatch: true
}
💾 [CUSTOM TX] Found at index: 0
✅ [CUSTOM TX] BEFORE UPDATE - old transaction: {
  "date": "2025-01-15",
  "description": "[CUSTOM] Test Transaction",
  "spent": 500,
  "spent_ex_vat": 416.67,
  "assignments": [{"quarter": 2, "percentage": 50, ...}],
  ...
}
✅ [CUSTOM TX] AFTER UPDATE - new transaction: {
  "date": "2025-01-15",
  "description": "[CUSTOM] Test Transaction",
  "spent": 500,
  "spent_ex_vat": 416.67,
  "assignments": [{"quarter": 1, "percentage": 100, ...}],
  ...
}
✅ [CUSTOM TX] Updated existing transaction at index: 0
✅ [CUSTOM TX] NEW Quarter: 1 NEW Split: 100
✅ [CUSTOM TX] IndexedDB put succeeded
✅ [CUSTOM TX] IndexedDB transaction completed
✅ [CUSTOM TX] Transaction saved successfully to database
🔄 [CUSTOM TX] Reloading all transactions...
🔄 [CUSTOM TX] Transactions reloaded. Count: 15
✅ [CUSTOM TX] Found saved transaction in cache: {
  date: "2025-01-15",
  desc: "[CUSTOM] Test Transaction",
  quarter: 1,
  percentage: 100
}
🎨 [CUSTOM TX] Re-rendering grants page...

[Alert appears: "✅ Custom transaction updated successfully!"]
```

## 🎯 Key Log Lines to Check

### 1. Edit Mode Detection
```
💾 [CUSTOM TX] Mode: EDIT    ← Should say EDIT, not ADD
```

### 2. Transaction Found
```
💾 [CUSTOM TX] Found at index: 0    ← Should show index, not -1
```

### 3. Transaction Updated
```
✅ [CUSTOM TX] NEW Quarter: 1 NEW Split: 100    ← Should show your new values
```

### 4. Database Save Success
```
✅ [CUSTOM TX] IndexedDB transaction completed
✅ [CUSTOM TX] Transaction saved successfully to database
```

### 5. Cache Updated
```
✅ [CUSTOM TX] Found saved transaction in cache: {...}    ← Should find it, not error
```

## 📸 Screenshots to Capture

If reporting an issue, capture these:

1. **Before editing**: Transaction with blue "✏️ Edit" button visible
2. **Edit form open**: Form showing current values with "💾 Update Transaction" button
3. **After update**: Transaction showing new values
4. **Console logs**: All logs containing "[CUSTOM TX]"

## 🔄 Testing Multiple Edits

To thoroughly test, try:

1. **Edit same transaction twice**:
   - Edit Q1 → Q2
   - Edit Q2 → Q3
   - Verify each update works

2. **Edit different transactions**:
   - Create 3 custom transactions
   - Edit each one
   - Verify no cross-contamination

3. **Edit with different VAT rates**:
   - Edit a 0% VAT transaction
   - Edit a 20% VAT transaction
   - Verify amounts calculate correctly

4. **Test validation**:
   - Try to update with empty description
   - Should show error: "Please fill in all required fields"

## ⏱️ Expected Timing

- Edit button click → Form appears: **< 100ms**
- Update button click → Alert appears: **< 1 second**
- Alert dismissed → UI refreshes: **< 500ms**

If operations take longer, check console for errors.

---

**Need more details?** See `MANUAL_TEST_INSTRUCTIONS.md` for comprehensive guide.
**Found a bug?** Check `CUSTOM_TRANSACTION_EDIT_REPORT.md` for implementation details.
