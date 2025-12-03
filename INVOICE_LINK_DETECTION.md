# Invoice Link Detection Enhancement

## Overview
Enhanced the find invoice feature to detect and handle emails where invoices need to be downloaded via a link or button (like Decathlon's "GET MY INVOICE" button) rather than being attached as PDFs.

## Problem Statement
The previous implementation only detected PDF attachments. Emails like Decathlon's invoice notification that contain invoice download links/buttons but no PDF attachments were being marked as "No invoices found" even though they contained invoices.

## Solution Implemented

### 1. Enhanced PDF Extraction (Lines 6757-6815)
**Function:** `extractPDFsFromEmail()`

**Changes:**
- Now extracts both PDF attachments AND the HTML body of emails
- Returns: `{ pdfs: [], htmlBody: '' }` instead of just array of PDFs
- Decodes base64-encoded HTML parts from email for analysis

**Code:**
```javascript
// Extract HTML body for link detection
if (part.mimeType === 'text/html' && part.body.data) {
    try {
        const decodedHtml = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        emailHtmlBody += decodedHtml;
    } catch (e) {
        console.warn('Could not decode HTML part:', e);
    }
}
```

### 2. Invoice Link Detection (Lines 6817-6867)
**Function:** `detectInvoiceLinks(htmlBody)`

**What it detects:**
- Links containing invoice-related keywords: invoice, receipt, order, bill, statement, download, view, get, access, see
- Buttons with invoice-related text
- Returns: `{ hasInvoiceLink: true, linkText: 'Download Invoice', message: '...' }`

**Detection patterns:**
- `<a href="...">GET MY INVOICE</a>` ✅
- `<button>Download Receipt</button>` ✅
- `<div>View Your Invoice</div>` ✅

**Example use case:**
```
Decathlon email: "Your invoice!" with button "GET MY INVOICE >"
✅ Detected as link-based invoice
```

### 3. Open Gmail Email Function (Lines 6869-6873)
**Function:** `openGmailEmail(messageId, accountEmail)`

**Purpose:**
- Opens an email directly in Gmail in a new tab
- URL format: `https://mail.google.com/mail/u/{accountEmail}/#all/{messageId}`

**Usage:**
```javascript
openGmailEmail('18d1a2b3c4d5e6f7', 'user@gmail.com');
// Opens the email in Gmail ready for user to click download button
```

### 4. Enhanced Search Processing (Lines 8082-8153)
**Updated:** `runBackgroundSearch()` results processing

**Changes:**
- Added `linkBasedInvoicesFound` counter to results
- Checks for invoice links when no PDFs are found
- Logs both PDF and link-based invoice discoveries
- Returns comprehensive results:
  ```javascript
  {
      messagesFound: 1,
      pdfsFound: 0,
      linkBasedInvoicesFound: 1,
      emailMatches: [{
          messageId: '...',
          accountEmail: '...',
          subject: 'Your invoice!',
          from: 'Decathlon <noreply@service.decathlon.co.uk>',
          date: 'Sun 20 Jul, 15:00',
          pdfs: [],
          invoiceLinkInfo: {
              hasInvoiceLink: true,
              linkText: 'GET MY INVOICE',
              message: 'This email contains an invoice that needs to be accessed via a link in the email.'
          }
      }]
  }
  ```

**Log messages:**
- PDF found: `📄 Found 1 PDF(s) in: "Your invoice!..."`
- Link found: `🔗 Found invoice link in: "Your invoice!..."`
- Summary: `✅ Search complete! Found 0 PDF invoice(s) and 1 link-based invoice(s)`

### 5. Enhanced Notifications (Lines 8239-8260)
**Updated:** `showCompletionNotification()`

**Changes:**
- Counts both PDF and link-based invoices
- Shows different messages based on what was found:
  - **PDFs only:** "Found 2 PDF invoices for Decathlon..."
  - **Links only:** "Found 1 email with invoice links for Decathlon. Click to open in Gmail."
  - **Both:** "Found 1 PDF invoice and 1 email with invoice links for Decathlon"
  - **None:** "No invoices found for Decathlon"

### 6. Enhanced Button State (Lines 8326-8356)
**Updated:** `updateTransactionButton()`

**Changes:**
- Badge now shows total invoices (PDFs + link-based)
- Tooltips reflect what was found:
  - **Links only:** "1 email with invoice links - click to open in Gmail"
  - **PDFs + Links:** "1 PDF and 1 email with invoice links - click to view"
  - **PDFs only:** "1 invoice found - click to view"

**Visual:**
```
🔔 with badge "2" = 2 total invoices found (could be mix of PDFs and links)
```

## Testing Instructions

### Test Case 1: Decathlon Transaction
**Transaction:** £85.48 to "Decathlon Uk Limited" on 19/07/2025

**Expected Result:**
1. Search finds the "Your invoice!" email
2. Detects "GET MY INVOICE" button as invoice link
3. Shows: `✅ Found 1 email with invoice links`
4. Button shows: 🔔 with badge "1"
5. Tooltip: "1 email with invoice links - click to open in Gmail"
6. **(TODO)** Clicking button shows results with "Open in Gmail" option

### Test Case 2: Mixed Results
**Scenario:** Transaction has both PDF invoice email AND link-based invoice email

**Expected Result:**
1. Shows: `✅ Found 1 PDF invoice(s) and 1 link-based invoice(s)`
2. Button badge shows "2"
3. Results modal **(TODO)** shows both options

### Test Case 3: PDF Only (Existing functionality)
**Expected Result:**
- Should work exactly as before
- No regression in PDF detection

## Current Limitations & TODO

### ✅ Completed
- [x] Extract HTML body from emails
- [x] Detect invoice links/buttons in HTML
- [x] Track link-based invoices separately
- [x] Update notifications to mention link-based invoices
- [x] Update button badges to include link-based count
- [x] Add function to open emails in Gmail

### ⚠️ Pending Implementation
- [ ] **Results Display UI:** Need to create/update results modal to show link-based invoices with "Open in Gmail" button
- [ ] **Click Handler:** Wire up invoice button click to show results including link-based invoices
- [ ] **Email-to-PDF Conversion:** Option to convert email HTML to PDF for local storage (optional feature)

### 📋 Next Steps

1. **Find/Create Results Display UI:**
   - Look for existing results modal/dialog
   - If doesn't exist, create one
   - Display both PDFs (with download) and link-based emails (with "Open in Gmail" button)

2. **Wire Up Click Handler:**
   - Ensure invoice button click retrieves task results from queue
   - Pass results to display UI
   - Handle case where task is still running vs completed

3. **Test with Real Data:**
   - Test with Decathlon transaction
   - Test with mixed results
   - Verify Gmail URL opens correctly

4. **Optional: HTML-to-PDF:**
   - Research browser-based HTML-to-PDF libraries (jsPDF, html2pdf)
   - Allow user to convert link-based email to PDF for offline storage

## Technical Notes

### Gmail URL Format
```
https://mail.google.com/mail/u/{accountEmail}/#all/{messageId}
```
- `{accountEmail}`: Gmail account email address (or index 0, 1, 2 for multiple accounts)
- `{messageId}`: Gmail message ID from API

### HTML Decoding
Gmail API returns HTML as base64-encoded string in `part.body.data`:
```javascript
const decodedHtml = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
```

### Detection Keywords
Invoice-related: `invoice`, `receipt`, `order`, `bill`, `statement`
Action words: `download`, `view`, `get`, `access`, `see`

## Files Modified
- `spend.html` (Lines 6757-6873, 8082-8365)

## Related Documentation
- `AI_INVOICE_SEARCH_ENHANCEMENT.md` - AI merchant interpretation
- `GMAIL_SEARCH_DEBUGGING.md` - Console logging guide
- `INVOICE_AMOUNT_FIX.md` - Amount extraction fixes
- `INVOICE_DROP_FIX.md` - Drag-drop fixes

---

**Status:** ✅ Core functionality implemented, pending UI/click handler integration
**Date:** 2025-01-29
**Impact:** Significantly improves invoice detection for merchants that email invoice links rather than PDFs
