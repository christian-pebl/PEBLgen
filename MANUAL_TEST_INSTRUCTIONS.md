# Manual Testing Instructions for Custom Transaction Editing

## Prerequisites
1. Navigate to http://localhost:8000/grants.html
2. Ensure you have a project loaded with at least one custom transaction in the "Travel and Subsistence" section

## Creating a Test Custom Transaction (if needed)

1. **Load or Create a Project**
   - If no project exists, click "Parse Budget" and load a budget file
   - Or click "Load Project" to load an existing saved project

2. **Navigate to Travel and Subsistence Section**
   - Scroll down to find the "Travel and Subsistence" section
   - This section should be visible after loading a project

3. **Add a Custom Transaction**
   - Click the "+ Add Custom Transaction" button in the Travel and Subsistence section
   - Fill in the form:
     - **Date**: Select any date (e.g., 2025-01-15)
     - **Transaction Ref**: Optional reference number
     - **Description**: "Project Meetings" (or any description)
     - **Amount (inc VAT)**: 500
     - **VAT Rate**: 20%
     - **Quarter**: Q2
     - **Split %**: 50
     - **Detail**: Optional additional notes
   - Click "💾 Save Transaction"
   - Verify the transaction appears in the Travel and Subsistence section with an "✏️ Edit" button

## Test Procedure: Editing a Custom Transaction

### Step 1: Locate the Custom Transaction
- Find the transaction you created (it should have a blue "✏️ Edit" button)
- The transaction description should start with "[CUSTOM]"
- Note the current Quarter and Split % values

### Step 2: Open Edit Form
- Click the blue "✏️ Edit" button
- An edit form should appear below the transaction
- **Expected Console Logs**:
  ```
  ✏️ [CUSTOM TX] Editing transaction: {transactionDate, transactionDescription, projectId, category, itemKey}
  📝 [CUSTOM TX] Showing form: {formId, projectId, category, itemKey, isEditMode: true}
  ```

### Step 3: Verify Edit Form Contents
- **Check that the form displays**:
  - Current date value
  - Current transaction reference (if any)
  - Current description (should show "[CUSTOM] Project Meetings" or similar)
  - Current amount (inc VAT)
  - Current VAT rate
  - Current quarter selection
  - Current split percentage
  - Current detail text (if any)
- The button should say "💾 Update Transaction" (not "💾 Save Transaction")

### Step 4: Modify Values
- **Change Quarter**: Select "Q1" from the dropdown (change from current value)
- **Change Split %**: Enter "100" in the Split % field (change from current value)
- Leave all other fields unchanged

### Step 5: Save Changes
- Click the "💾 Update Transaction" button
- **Expected Console Logs**:
  ```
  💾 [CUSTOM TX] Saving custom transaction: {formId, projectId, category, itemKey}
  💾 [CUSTOM TX] formId: [form ID]
  💾 [CUSTOM TX] customTransactionEditData keys: [array of keys]
  💾 [CUSTOM TX] customTransactionEditData[formId]: [edit data object]
  💾 [CUSTOM TX] Mode: EDIT
  💾 [CUSTOM TX] Edit data: {date, description, ...}
  💾 [CUSTOM TX] Original (stripped): {originalDate, originalDescription}
  💾 [CUSTOM TX] New values from form: {date, description, quarter, splitPercentage}
  💾 [CUSTOM TX] VAT Select element: [element]
  💾 [CUSTOM TX] VAT Select value: "20" or "0"
  💾 [CUSTOM TX] Calculated vatRate: 20 or 0
  💾 [CUSTOM TX] 20% VAT - amountExVat = amountIncVat/1.2 = [value]
  💾 [CUSTOM TX] Final values: {amountIncVat, amountExVat, zeroVAT, vatRate}
  ```

### Step 6: Verify Success
- **Check for success alert**: A JavaScript alert should appear saying "Custom transaction updated successfully!"
- Click "OK" to dismiss the alert
- **Expected Console Logs**:
  ```
  ✅ [CUSTOM TX] Transaction updated successfully
  🔄 [CUSTOM TX] Reloading display...
  ```

### Step 7: Verify Updated Values
- **Check the transaction in the Travel and Subsistence section**:
  - The Quarter should now show "Q1"
  - The Split % should now show "100%"
  - All other values should remain unchanged
- **Check the Quarterly Tracking Section** (at the bottom of the page):
  - Navigate to Q1 section
  - The updated transaction should appear under Q1 with 100% split
  - Verify the assigned amount is correct (should be 100% of the ex-VAT amount)

### Step 8: Test Edge Cases

#### Test 8.1: Edit Same Transaction Again
- Click "✏️ Edit" on the same transaction
- Change Quarter to Q3
- Change Split % to 75
- Click "💾 Update Transaction"
- Verify success and check Q3 section for the transaction

#### Test 8.2: Edit with 0% VAT
- Create a new custom transaction with 0% VAT
- Edit it and verify that the amounts calculate correctly
- **Expected Console Log**: `💾 [CUSTOM TX] 0% VAT - amountExVat = amountIncVat = [value]`

#### Test 8.3: Edit Multiple Transactions
- Create 2-3 custom transactions
- Edit each one with different values
- Verify that each edit saves correctly and doesn't affect other transactions

### Step 9: Test Error Handling

#### Test 9.1: Empty Required Fields
- Edit a transaction
- Clear the Description field (make it empty)
- Click "💾 Update Transaction"
- **Expected**: Alert saying "Please fill in all required fields (Date, Description, Amount)"

#### Test 9.2: Invalid Split %
- Edit a transaction
- Enter "-10" in Split % field
- Click "💾 Update Transaction"
- **Expected**: System should handle this (either reject or clamp to valid range)

#### Test 9.3: Invalid Amount
- Edit a transaction
- Enter "abc" in Amount field
- Click "💾 Update Transaction"
- **Expected**: Alert or validation error

## Console Log Checklist

During the entire test, you should see these log patterns:

### On Edit Button Click:
- ✏️ [CUSTOM TX] Editing transaction
- 📝 [CUSTOM TX] Showing form (with isEditMode: true)

### On Update Button Click:
- 💾 [CUSTOM TX] Saving custom transaction
- 💾 [CUSTOM TX] Mode: EDIT
- 💾 [CUSTOM TX] Edit data: [object]
- 💾 [CUSTOM TX] VAT calculations
- ✅ [CUSTOM TX] Transaction updated successfully (on success)
- ❌ [CUSTOM TX] Error messages (on failure)

### After Successful Update:
- 🔄 [CUSTOM TX] Reloading display
- Quarterly tracking section updates

## Expected Results

### Success Criteria:
✅ Edit button opens edit form with current values
✅ Edit form shows "💾 Update Transaction" button
✅ Changing Quarter updates the transaction's quarter assignment
✅ Changing Split % updates the transaction's split percentage
✅ Success alert appears after update
✅ Transaction appears in correct quarterly section
✅ All console logs appear as expected
✅ No JavaScript errors in console
✅ Page does not require manual refresh to see changes

### Failure Indicators:
❌ Edit form doesn't appear
❌ Form shows wrong values
❌ Update button does nothing
❌ No success alert
❌ Transaction doesn't move to new quarter
❌ Console errors appear
❌ Page requires manual refresh to see changes
❌ Transaction duplicates instead of updating

## Screenshots to Capture

1. **before-edit.png**: Transaction before editing (showing original Quarter and Split %)
2. **edit-form.png**: Edit form with current values populated
3. **after-update.png**: Transaction after updating (showing new Quarter and Split %)
4. **quarterly-section.png**: Quarterly tracking section showing transaction in correct quarter
5. **console-logs.png**: Browser console showing all [CUSTOM TX] logs

## Troubleshooting

### Issue: No Edit Button Visible
- **Cause**: Transaction may not be marked as custom
- **Solution**: Verify the transaction description starts with "[CUSTOM]"
- **Check**: Look for `isCustom: true` in transaction object in console

### Issue: Edit Form Doesn't Appear
- **Cause**: JavaScript error or form ID conflict
- **Solution**: Check browser console for errors
- **Check**: Verify `showCustomTransactionForm()` is called in console logs

### Issue: Update Button Does Nothing
- **Cause**: Form validation failing silently
- **Solution**: Check console for validation errors
- **Check**: Verify all required fields are filled

### Issue: Changes Not Saved
- **Cause**: IndexedDB save failure or sync issue
- **Solution**: Check console for database errors
- **Check**: Look for "✅ [CUSTOM TX] Transaction updated successfully" log

### Issue: Transaction Duplicates Instead of Updates
- **Cause**: Edit mode not detected (customTransactionEditData not set)
- **Solution**: Verify `editCustomTransaction()` sets the edit data correctly
- **Check**: Look for "💾 [CUSTOM TX] Mode: EDIT" in console (not "ADD")

## Notes

- The test should be performed with browser DevTools console open to capture all logs
- Custom transactions are stored in IndexedDB under the `projects` object store
- The edit functionality uses the `customTransactionEditData` global object to track edit state
- Transactions are identified by date + description combination for updates
- The "[CUSTOM]" prefix is automatically added to custom transaction descriptions
