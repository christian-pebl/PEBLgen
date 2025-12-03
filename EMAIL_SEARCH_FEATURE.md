# Email Search Feature - Implementation Plan

## Overview
A new bulk email search feature for the Spend page that allows users to search Gmail accounts for invoices and receipts using keywords and date ranges, then download attachments in bulk as ZIP or merged PDF.

---

## Feature Requirements

### User Story
As a user, I want to search my Gmail accounts for invoices and receipts without attaching them to specific transactions, so I can quickly find and download multiple invoices at once.

### Key Features
1. **Bulk Search** - Search across all connected Gmail accounts using keywords and date ranges
2. **Email List Display** - Gmail-style list showing emails with attachment indicators
3. **Attachment Filtering** - Filter attachments by keyword in filename (e.g., "invoice", "receipt")
4. **Email Preview** - View email content and attachments before downloading
5. **Individual Downloads** - Download single attachments
6. **Bulk Downloads** - Download all matching attachments as:
   - Individual files (sequential downloads)
   - ZIP archive (single compressed file)
   - Merged PDF (single combined PDF document)
7. **Smart Filtering** - Show "2/5 attachments match 'invoice'" for each email

---

## Current Infrastructure (Already Implemented)

### ✅ Existing Components We Can Reuse

1. **Gmail OAuth Integration** (spend.html lines 1765-7229)
   - Multi-account support with token management
   - OAuth 2.0 authentication flow
   - Token expiry handling (55-minute timeout)
   - Access tokens stored in `gmailAccounts[]` array

2. **Gmail Search API** (spend.html lines 11315-11410)
   - Function: `searchGmailWithQuery(query, account, transactionDate, dateWindowDays)`
   - Date range filtering support
   - Returns message IDs and metadata

3. **Attachment Download System** (spend.html lines 7385-7531)
   - Function: `extractPDFsFromEmail(messageId, accessToken)` - Gets attachment list
   - Function: `downloadPDFAttachment(messageId, attachmentId, accessToken)` - Downloads as Blob
   - Base64 decoding and PDF blob conversion

4. **PDF Text Extraction** (spend.html lines 7638-7702)
   - PDF.js for text-based PDFs
   - Tesseract.js for OCR on scanned documents

5. **Data Management Section** (spend.html lines 1085-1183)
   - Location for new button
   - Existing buttons: Load CSV, Clear View, Fix Dupes, Reset CSVs, Download Table

---

## Implementation Plan

### Phase 1: UI Components

#### 1.1 Add "Email Search" Button to Data Management Section
**Location:** spend.html, line ~1181 (after Download Table button)

```html
<button
    class="modal-btn"
    style="background: #3b82f6; grid-column: span 2;"
    onclick="openEmailSearchModal()"
    title="Search and download invoices from Gmail">
    📧 Email Search
</button>
```

#### 1.2 Create Email Search Modal Dialog
**Location:** After line 1335 (after Invoice Search Modal)

**Modal Structure:**
```html
<div id="emailSearchModal" class="modal" style="display: none;">
    <div class="modal-content" style="max-width: 1200px; height: 85vh;">
        <div class="modal-header">
            <h2>📧 Bulk Email Search</h2>
            <span class="close" onclick="closeEmailSearchModal()">×</span>
        </div>

        <!-- Search Criteria Section -->
        <div id="searchCriteriaPanel">
            <div class="search-inputs">
                <input
                    type="text"
                    id="bulkSearchKeywords"
                    placeholder="Enter keywords (e.g., invoice, receipt, order confirmation)"
                    style="width: 100%; padding: 10px; margin-bottom: 10px;">

                <div class="date-range-inputs">
                    <label>From: <input type="date" id="bulkSearchDateFrom"></label>
                    <label>To: <input type="date" id="bulkSearchDateTo"></label>
                </div>

                <div id="bulkSearchAccountSelector">
                    <!-- Dynamically populated checkboxes for each gmailAccounts[] item -->
                </div>

                <button class="modal-btn modal-btn-primary" onclick="executeBulkEmailSearch()">
                    🔍 Search Emails
                </button>
            </div>
        </div>

        <!-- Results Layout (2-column split) -->
        <div id="emailSearchResultsLayout" style="display: none; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Left Panel: Email List -->
            <div id="emailListPanel" style="overflow-y: auto; max-height: 600px;">
                <div class="email-list-header">
                    <input type="checkbox" id="selectAllEmails" onchange="toggleSelectAllEmails()">
                    <span>Select All</span>
                    <span id="selectedEmailCount">0 selected</span>
                </div>
                <div id="emailListContainer">
                    <!-- Email items rendered here -->
                </div>
            </div>

            <!-- Right Panel: Preview & Actions -->
            <div id="emailPreviewPanel">
                <div id="emailPreviewHeader">
                    <!-- Email metadata -->
                </div>

                <div id="emailPreviewBody">
                    <!-- Email content -->
                </div>

                <div class="attachment-filter">
                    <input
                        type="text"
                        id="attachmentKeywordFilter"
                        placeholder="Filter attachments by filename (e.g., invoice)"
                        oninput="applyAttachmentFilter()">
                    <button onclick="clearAttachmentFilter()">Clear</button>
                    <div id="filterResults">Showing all attachments</div>
                </div>

                <div id="attachmentListContainer">
                    <!-- Attachments rendered here -->
                </div>

                <div class="download-actions">
                    <div class="format-selector">
                        <label>
                            <input type="radio" name="downloadFormat" value="individual" checked>
                            Individual files
                        </label>
                        <label>
                            <input type="radio" name="downloadFormat" value="zip">
                            ZIP archive
                        </label>
                        <label>
                            <input type="radio" name="downloadFormat" value="pdf">
                            Merged PDF
                        </label>
                    </div>

                    <button onclick="downloadSelectedAttachments()" class="download-btn">
                        ⬇️ Download Selected (<span id="selectedAttachmentCount">0</span>)
                    </button>

                    <button onclick="downloadAllFilteredAttachments()" class="download-btn-primary">
                        ⬇️ Download All Matching (<span id="filteredAttachmentCount">0</span>)
                    </button>
                </div>
            </div>
        </div>

        <!-- Loading/Status Display -->
        <div id="emailSearchStatus" style="text-align: center; padding: 20px;"></div>
    </div>
</div>
```

#### 1.3 CSS Styles
**Location:** After line 980 in spend.html

```css
/* Email Search Modal Styles */
.email-item {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    display: grid;
    grid-template-columns: 30px 1fr auto;
    gap: 10px;
    align-items: center;
    transition: background 0.2s;
}

.email-item:hover {
    background: #f3f4f6;
}

.email-item.selected {
    background: #dbeafe;
}

.email-sender {
    font-weight: 600;
    color: #1f2937;
}

.email-subject {
    font-weight: 500;
    color: #374151;
}

.email-snippet {
    color: #6b7280;
    font-size: 0.875rem;
}

.email-date {
    color: #9ca3af;
    font-size: 0.875rem;
    text-align: right;
}

.email-attachment-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #3b82f6;
}

.filtered-count {
    background: #3b82f6;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
}

.attachment-item {
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin-bottom: 8px;
    display: grid;
    grid-template-columns: 30px 1fr auto auto;
    gap: 10px;
    align-items: center;
}

.attachment-item.filtered-out {
    display: none;
}

.attachment-name {
    font-weight: 500;
    color: #374151;
}

.attachment-size {
    color: #6b7280;
    font-size: 0.875rem;
}

.download-actions {
    margin-top: 20px;
    padding: 15px;
    background: #f9fafb;
    border-radius: 8px;
}

.format-selector {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
}

.download-btn, .download-btn-primary {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    margin-right: 10px;
}

.download-btn {
    background: #6b7280;
    color: white;
}

.download-btn-primary {
    background: #3b82f6;
    color: white;
}
```

---

### Phase 2: Core Functionality

#### 2.1 Open Email Search Modal
**Location:** After line 12327 in spend.html

```javascript
function openEmailSearchModal() {
    // Show modal
    document.getElementById('emailSearchModal').style.display = 'block';

    // Reset state
    currentEmailSearchResults = [];
    selectedEmails = new Set();
    currentAttachmentFilter = '';

    // Populate account selector
    populateAccountSelector();

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    document.getElementById('bulkSearchDateTo').valueAsDate = today;
    document.getElementById('bulkSearchDateFrom').valueAsDate = thirtyDaysAgo;
}

function closeEmailSearchModal() {
    document.getElementById('emailSearchModal').style.display = 'none';
}

function populateAccountSelector() {
    const container = document.getElementById('bulkSearchAccountSelector');

    if (gmailAccounts.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #6b7280;">
                <p>No Gmail accounts connected</p>
                <button onclick="closeEmailSearchModal(); document.getElementById('gmailConnectBtn').scrollIntoView();">
                    Connect Gmail Account
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = gmailAccounts.map((account, index) => `
        <label style="display: block; padding: 8px;">
            <input
                type="checkbox"
                class="gmail-account-checkbox"
                data-account-index="${index}"
                ${account.selected ? 'checked' : ''}>
            ${account.email}
            ${isTokenExpired(account) ? '<span style="color: #ef4444;">(Token expired)</span>' : ''}
        </label>
    `).join('');
}
```

#### 2.2 Execute Bulk Email Search
```javascript
async function executeBulkEmailSearch() {
    const keywords = document.getElementById('bulkSearchKeywords').value.trim();
    const dateFrom = document.getElementById('bulkSearchDateFrom').value;
    const dateTo = document.getElementById('bulkSearchDateTo').value;

    // Get selected accounts
    const selectedAccountIndexes = Array.from(document.querySelectorAll('.gmail-account-checkbox:checked'))
        .map(cb => parseInt(cb.dataset.accountIndex));

    if (selectedAccountIndexes.length === 0) {
        alert('Please select at least one Gmail account');
        return;
    }

    // Show loading
    const statusDiv = document.getElementById('emailSearchStatus');
    statusDiv.innerHTML = '🔍 Searching emails...';
    document.getElementById('emailSearchResultsLayout').style.display = 'none';

    // Build Gmail query
    const query = keywords ? `${keywords} after:${dateFrom.replace(/-/g, '/')} before:${dateTo.replace(/-/g, '/')}` :
                            `after:${dateFrom.replace(/-/g, '/')} before:${dateTo.replace(/-/g, '/')}`;

    console.log(`📧 [BULK EMAIL SEARCH] Query: ${query}`);

    // Search across all selected accounts
    const allResults = [];

    for (const accountIndex of selectedAccountIndexes) {
        const account = gmailAccounts[accountIndex];

        // Check token validity
        if (isTokenExpired(account)) {
            console.warn(`⚠️ [BULK EMAIL SEARCH] Token expired for ${account.email}`);
            continue;
        }

        try {
            // Use existing searchGmailWithQuery function
            const messageIds = await searchGmailWithQuery(query, account, null, null);

            console.log(`✅ [BULK EMAIL SEARCH] Found ${messageIds.length} messages in ${account.email}`);

            // Fetch full message details for each result
            for (const messageId of messageIds) {
                const messageDetails = await fetchEmailDetails(messageId, account);
                allResults.push(messageDetails);
            }

        } catch (error) {
            console.error(`❌ [BULK EMAIL SEARCH] Error searching ${account.email}:`, error);
        }
    }

    // Deduplicate by message ID
    const uniqueResults = deduplicateResults(allResults);

    // Sort by date (newest first)
    uniqueResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Store results globally
    currentEmailSearchResults = uniqueResults;

    // Render results
    if (uniqueResults.length === 0) {
        statusDiv.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h3>No emails found</h3>
                <p style="color: #6b7280;">Try broader keywords or a wider date range</p>
            </div>
        `;
    } else {
        statusDiv.innerHTML = '';
        document.getElementById('emailSearchResultsLayout').style.display = 'grid';
        renderEmailResultsList(uniqueResults);
    }
}
```

#### 2.3 Fetch Email Details
```javascript
async function fetchEmailDetails(messageId, account) {
    // Set access token
    gapi.client.setToken({ access_token: account.accessToken });

    // Fetch full message
    const response = await gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
    });

    const message = response.result;

    // Extract headers
    const headers = message.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    // Extract attachments
    const attachments = extractAttachmentsFromPayload(message.payload, messageId);

    return {
        id: messageId,
        threadId: message.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: message.snippet,
        htmlBody: extractHtmlBody(message.payload),
        plainTextBody: extractPlainTextBody(message.payload),
        attachments: attachments,
        account: account,
        selected: false
    };
}

function extractAttachmentsFromPayload(payload, messageId) {
    const attachments = [];

    function traverse(part) {
        if (part.filename && part.body && part.body.attachmentId) {
            attachments.push({
                id: part.body.attachmentId,
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body.size,
                messageId: messageId
            });
        }

        if (part.parts) {
            part.parts.forEach(traverse);
        }
    }

    traverse(payload);
    return attachments;
}

function extractHtmlBody(payload) {
    if (payload.mimeType === 'text/html' && payload.body.data) {
        return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            const html = extractHtmlBody(part);
            if (html) return html;
        }
    }

    return '';
}

function extractPlainTextBody(payload) {
    if (payload.mimeType === 'text/plain' && payload.body.data) {
        return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            const text = extractPlainTextBody(part);
            if (text) return text;
        }
    }

    return '';
}

function deduplicateResults(results) {
    const seen = new Set();
    return results.filter(email => {
        if (seen.has(email.id)) return false;
        seen.add(email.id);
        return true;
    });
}
```

#### 2.4 Render Email Results List
```javascript
function renderEmailResultsList(emails) {
    const container = document.getElementById('emailListContainer');

    container.innerHTML = emails.map((email, index) => {
        const attachmentCount = email.attachments.length;
        const hasAttachments = attachmentCount > 0;

        return `
            <div class="email-item" data-email-index="${index}" onclick="selectEmailForPreview(${index})">
                <input
                    type="checkbox"
                    class="email-select-checkbox"
                    data-email-index="${index}"
                    onclick="event.stopPropagation(); toggleEmailSelection(${index})"
                    ${email.selected ? 'checked' : ''}>

                <div>
                    <div class="email-sender">${email.from}</div>
                    <div class="email-subject">${email.subject}</div>
                    <div class="email-snippet">${email.snippet}</div>
                </div>

                <div>
                    <div class="email-date">${formatEmailDate(email.date)}</div>
                    ${hasAttachments ? `
                        <div class="email-attachment-indicator">
                            📎 ${attachmentCount}
                            <span class="filtered-count" id="filteredCount_${index}" style="display: none;"></span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function formatEmailDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
```

#### 2.5 Email Preview
```javascript
let currentPreviewedEmailIndex = null;

function selectEmailForPreview(emailIndex) {
    const email = currentEmailSearchResults[emailIndex];
    currentPreviewedEmailIndex = emailIndex;

    // Highlight selected email in list
    document.querySelectorAll('.email-item').forEach((item, idx) => {
        item.classList.toggle('selected', idx === emailIndex);
    });

    // Render preview
    const previewHeader = document.getElementById('emailPreviewHeader');
    previewHeader.innerHTML = `
        <div class="email-preview-metadata">
            <div><strong>From:</strong> ${email.from}</div>
            <div><strong>To:</strong> ${email.to}</div>
            <div><strong>Subject:</strong> ${email.subject}</div>
            <div><strong>Date:</strong> ${new Date(email.date).toLocaleString()}</div>
        </div>
    `;

    const previewBody = document.getElementById('emailPreviewBody');
    previewBody.innerHTML = email.htmlBody || `<pre>${email.plainTextBody}</pre>`;

    // Render attachments
    renderAttachmentList(email);
}

function renderAttachmentList(email) {
    const container = document.getElementById('attachmentListContainer');
    const filter = currentAttachmentFilter.toLowerCase();

    const filteredAttachments = filter ?
        email.attachments.filter(att => att.filename.toLowerCase().includes(filter)) :
        email.attachments;

    container.innerHTML = email.attachments.map((attachment, index) => {
        const matchesFilter = !filter || attachment.filename.toLowerCase().includes(filter);

        return `
            <div class="attachment-item ${matchesFilter ? '' : 'filtered-out'}">
                <input
                    type="checkbox"
                    class="attachment-checkbox"
                    data-attachment-index="${index}">
                <span class="attachment-name">${attachment.filename}</span>
                <span class="attachment-size">${formatFileSize(attachment.size)}</span>
                <button onclick="downloadSingleAttachment(${currentPreviewedEmailIndex}, ${index})">
                    ⬇️ Download
                </button>
            </div>
        `;
    }).join('');

    // Update counts
    document.getElementById('filteredAttachmentCount').textContent = filteredAttachments.length;
    document.getElementById('filterResults').textContent =
        filter ? `Showing ${filteredAttachments.length}/${email.attachments.length} attachments` :
        `Showing all ${email.attachments.length} attachments`;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

#### 2.6 Attachment Filter
```javascript
let currentAttachmentFilter = '';

function applyAttachmentFilter() {
    currentAttachmentFilter = document.getElementById('attachmentKeywordFilter').value.trim();

    // Update all email items to show filtered counts
    currentEmailSearchResults.forEach((email, emailIndex) => {
        const filteredCount = currentAttachmentFilter ?
            email.attachments.filter(att => att.filename.toLowerCase().includes(currentAttachmentFilter.toLowerCase())).length :
            email.attachments.length;

        const countElement = document.getElementById(`filteredCount_${emailIndex}`);
        if (countElement) {
            if (currentAttachmentFilter && filteredCount < email.attachments.length) {
                countElement.textContent = `${filteredCount}/${email.attachments.length} match`;
                countElement.style.display = 'inline-block';
            } else {
                countElement.style.display = 'none';
            }
        }
    });

    // Update preview if email is selected
    if (currentPreviewedEmailIndex !== null) {
        renderAttachmentList(currentEmailSearchResults[currentPreviewedEmailIndex]);
    }
}

function clearAttachmentFilter() {
    document.getElementById('attachmentKeywordFilter').value = '';
    applyAttachmentFilter();
}
```

---

### Phase 3: Download Functionality

#### 3.1 Download Single Attachment
```javascript
async function downloadSingleAttachment(emailIndex, attachmentIndex) {
    const email = currentEmailSearchResults[emailIndex];
    const attachment = email.attachments[attachmentIndex];

    console.log(`⬇️ [DOWNLOAD] Downloading ${attachment.filename}`);

    try {
        // Use existing downloadPDFAttachment function
        const blob = await downloadPDFAttachment(
            attachment.messageId,
            attachment.id,
            email.account.accessToken
        );

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`✅ [DOWNLOAD] Downloaded ${attachment.filename}`);

    } catch (error) {
        console.error(`❌ [DOWNLOAD] Failed to download ${attachment.filename}:`, error);
        alert(`Failed to download ${attachment.filename}`);
    }
}
```

#### 3.2 Download Selected Attachments
```javascript
async function downloadSelectedAttachments() {
    const format = document.querySelector('input[name="downloadFormat"]:checked').value;

    // Get selected attachments from current preview
    const selectedIndexes = Array.from(document.querySelectorAll('.attachment-checkbox:checked'))
        .map(cb => parseInt(cb.dataset.attachmentIndex));

    if (selectedIndexes.length === 0) {
        alert('Please select at least one attachment');
        return;
    }

    const email = currentEmailSearchResults[currentPreviewedEmailIndex];
    const selectedAttachments = selectedIndexes.map(idx => ({
        ...email.attachments[idx],
        email: email
    }));

    await downloadAttachments(selectedAttachments, format);
}

async function downloadAllFilteredAttachments() {
    const format = document.querySelector('input[name="downloadFormat"]:checked').value;
    const filter = currentAttachmentFilter.toLowerCase();

    // Get all filtered attachments from all emails
    const allFilteredAttachments = [];

    currentEmailSearchResults.forEach(email => {
        const filtered = filter ?
            email.attachments.filter(att => att.filename.toLowerCase().includes(filter)) :
            email.attachments;

        filtered.forEach(att => {
            allFilteredAttachments.push({
                ...att,
                email: email
            });
        });
    });

    if (allFilteredAttachments.length === 0) {
        alert('No attachments to download');
        return;
    }

    await downloadAttachments(allFilteredAttachments, format);
}
```

#### 3.3 Download Attachments (Individual, ZIP, or Merged PDF)
```javascript
async function downloadAttachments(attachments, format) {
    const statusDiv = document.getElementById('emailSearchStatus');

    if (format === 'individual') {
        // Download each file individually
        for (let i = 0; i < attachments.length; i++) {
            const att = attachments[i];
            statusDiv.innerHTML = `⬇️ Downloading ${i + 1}/${attachments.length}: ${att.filename}...`;

            try {
                const blob = await downloadPDFAttachment(
                    att.messageId,
                    att.id,
                    att.email.account.accessToken
                );

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = att.filename;
                a.click();
                URL.revokeObjectURL(url);

                // Small delay to avoid overwhelming the browser
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Failed to download ${att.filename}:`, error);
            }
        }

        statusDiv.innerHTML = `✅ Downloaded ${attachments.length} files`;
        setTimeout(() => statusDiv.innerHTML = '', 3000);

    } else if (format === 'zip') {
        await downloadAsZip(attachments);

    } else if (format === 'pdf') {
        await downloadAsMergedPdf(attachments);
    }
}
```

#### 3.4 Download as ZIP
```javascript
async function downloadAsZip(attachments) {
    const statusDiv = document.getElementById('emailSearchStatus');
    statusDiv.innerHTML = '📦 Creating ZIP archive...';

    try {
        const zip = new JSZip();

        // Download and add each attachment to ZIP
        for (let i = 0; i < attachments.length; i++) {
            const att = attachments[i];
            statusDiv.innerHTML = `📦 Adding to ZIP: ${i + 1}/${attachments.length} - ${att.filename}`;

            try {
                const blob = await downloadPDFAttachment(
                    att.messageId,
                    att.id,
                    att.email.account.accessToken
                );

                zip.file(att.filename, blob);

            } catch (error) {
                console.error(`Failed to add ${att.filename} to ZIP:`, error);
            }
        }

        // Generate ZIP
        statusDiv.innerHTML = '📦 Generating ZIP file...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `email-attachments-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        statusDiv.innerHTML = `✅ Downloaded ${attachments.length} files as ZIP`;
        setTimeout(() => statusDiv.innerHTML = '', 3000);

    } catch (error) {
        console.error('Failed to create ZIP:', error);
        statusDiv.innerHTML = '❌ Failed to create ZIP archive';
    }
}
```

#### 3.5 Download as Merged PDF
```javascript
async function downloadAsMergedPdf(attachments) {
    const statusDiv = document.getElementById('emailSearchStatus');
    statusDiv.innerHTML = '📄 Creating merged PDF...';

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Download and merge each PDF
        for (let i = 0; i < attachments.length; i++) {
            const att = attachments[i];
            statusDiv.innerHTML = `📄 Merging: ${i + 1}/${attachments.length} - ${att.filename}`;

            try {
                const blob = await downloadPDFAttachment(
                    att.messageId,
                    att.id,
                    att.email.account.accessToken
                );

                // Load PDF
                const arrayBuffer = await blob.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);

                // Copy all pages
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));

                // Optional: Add separator page with metadata
                const separatorPage = mergedPdf.addPage();
                separatorPage.drawText(`From: ${att.email.from}\nSubject: ${att.email.subject}\nFile: ${att.filename}`, {
                    x: 50,
                    y: separatorPage.getHeight() - 100,
                    size: 12
                });

            } catch (error) {
                console.error(`Failed to merge ${att.filename}:`, error);
            }
        }

        // Save merged PDF
        statusDiv.innerHTML = '📄 Generating merged PDF...';
        const mergedBytes = await mergedPdf.save();
        const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });

        // Download merged PDF
        const url = URL.createObjectURL(mergedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merged-invoices-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        statusDiv.innerHTML = `✅ Merged ${attachments.length} PDFs`;
        setTimeout(() => statusDiv.innerHTML = '', 3000);

    } catch (error) {
        console.error('Failed to merge PDFs:', error);
        statusDiv.innerHTML = '❌ Failed to merge PDFs';
    }
}
```

---

### Phase 4: Helper Functions

```javascript
// Email selection management
let selectedEmails = new Set();

function toggleEmailSelection(emailIndex) {
    const email = currentEmailSearchResults[emailIndex];
    email.selected = !email.selected;

    if (email.selected) {
        selectedEmails.add(emailIndex);
    } else {
        selectedEmails.delete(emailIndex);
    }

    updateSelectedCount();
}

function toggleSelectAllEmails() {
    const selectAll = document.getElementById('selectAllEmails').checked;

    currentEmailSearchResults.forEach((email, index) => {
        email.selected = selectAll;
        if (selectAll) {
            selectedEmails.add(index);
        } else {
            selectedEmails.delete(index);
        }
    });

    // Update checkboxes
    document.querySelectorAll('.email-select-checkbox').forEach(cb => {
        cb.checked = selectAll;
    });

    updateSelectedCount();
}

function updateSelectedCount() {
    document.getElementById('selectedEmailCount').textContent = `${selectedEmails.size} selected`;
}

// Token expiry check
function isTokenExpired(account) {
    return account.tokenExpiresAt && Date.now() > account.tokenExpiresAt;
}

// Global variables
let currentEmailSearchResults = [];
```

---

## External Libraries Required

Add to `<head>` section in spend.html (after line 18):

```html
<!-- JSZip for creating ZIP archives -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- pdf-lib for merging PDFs -->
<script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
```

---

## Data Structures

### Email Search Result Object
```javascript
{
    id: string,              // Gmail message ID
    threadId: string,
    from: string,
    to: string,
    subject: string,
    snippet: string,
    date: string,            // ISO format
    htmlBody: string,
    plainTextBody: string,
    attachments: [
        {
            id: string,      // Gmail attachment ID
            filename: string,
            mimeType: string,
            size: number,
            messageId: string
        }
    ],
    account: {
        email: string,
        accessToken: string
    },
    selected: boolean
}
```

---

## Error Handling

### Scenarios to Handle

1. **No Gmail accounts connected**
   - Show message: "Please connect a Gmail account first"
   - Provide button to navigate to API Configuration section

2. **Token expired**
   - Detect via `tokenExpiresAt` check
   - Show reconnect button for that account
   - Skip expired accounts during search

3. **No results found**
   - Show friendly message: "No emails found matching your criteria"
   - Suggestions: "Try broader keywords or wider date range"

4. **API quota exceeded**
   - Gmail API has daily limits
   - Show error: "Gmail API limit reached. Try again tomorrow."

5. **Download failures**
   - Implement retry logic (3 attempts)
   - Skip failed attachments and continue
   - Show final report: "Downloaded 8/10 attachments (2 failed)"

6. **Large attachments**
   - Warn if total size > 100MB
   - Show progress indicator for long downloads
   - Allow cancellation

7. **Network errors**
   - Graceful degradation
   - Clear error messages
   - Retry option

---

## Code Locations Summary

| **Component** | **Location in spend.html** | **Estimated Lines** |
|--------------|---------------------------|---------------------|
| Email Search Button | After line 1181 | +5 |
| Modal HTML | After line 1335 | +200 |
| CSS Styles | After line 980 | +100 |
| Open/Close Modal Functions | After line 12327 | +50 |
| Bulk Search Function | After line 12327 | +150 |
| Fetch Email Details | After line 12327 | +100 |
| Render Results | After line 12327 | +100 |
| Preview Functions | After line 12327 | +150 |
| Attachment Filter | After line 12327 | +50 |
| Download Functions | After line 12327 | +400 |
| Helper Functions | After line 12327 | +100 |
| **Total New Code** | | **~1,405 lines** |

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Add JSZip and pdf-lib libraries to HTML
- [ ] Add Email Search button to Data Management section
- [ ] Create modal HTML structure
- [ ] Add CSS styles

### Phase 2: Core Search
- [ ] Implement `openEmailSearchModal()`
- [ ] Implement `populateAccountSelector()`
- [ ] Implement `executeBulkEmailSearch()`
- [ ] Implement `fetchEmailDetails()`
- [ ] Implement `renderEmailResultsList()`

### Phase 3: Preview & Filter
- [ ] Implement `selectEmailForPreview()`
- [ ] Implement `renderAttachmentList()`
- [ ] Implement `applyAttachmentFilter()`
- [ ] Implement attachment count indicators

### Phase 4: Downloads
- [ ] Implement `downloadSingleAttachment()`
- [ ] Implement `downloadSelectedAttachments()`
- [ ] Implement `downloadAllFilteredAttachments()`
- [ ] Implement `downloadAsZip()`
- [ ] Implement `downloadAsMergedPdf()`

### Phase 5: Testing
- [ ] Test search with various keywords
- [ ] Test date range filtering
- [ ] Test multi-account search
- [ ] Test attachment filtering
- [ ] Test individual downloads
- [ ] Test ZIP download
- [ ] Test merged PDF download
- [ ] Test error scenarios
- [ ] Test with expired tokens
- [ ] Test with large attachments

---

## Estimated Implementation Time

| **Task** | **Time Estimate** |
|---------|------------------|
| UI/Modal Setup | 2 hours |
| Search Functionality | 3 hours |
| Results Display | 2 hours |
| Preview Pane | 2 hours |
| Attachment Filtering | 1 hour |
| Individual Downloads | 1 hour |
| ZIP Download | 2 hours |
| Merged PDF Download | 3 hours |
| Error Handling | 2 hours |
| Testing & Debugging | 4 hours |
| **Total** | **22 hours** |

---

## Future Enhancements (Optional)

1. **Search History**
   - Save last 5 searches in localStorage
   - Quick-select dropdown to rerun searches

2. **Export Results**
   - Export email list as CSV
   - Columns: From, Subject, Date, Attachments Count

3. **Advanced Filters**
   - Filter by sender
   - Filter by attachment type (PDF, images, etc.)
   - Filter by attachment size

4. **Batch Operations**
   - Mark emails as read
   - Apply labels to searched emails
   - Archive emails

5. **Smart Categorization**
   - Auto-detect invoice vs receipt vs order confirmation
   - Use AI to categorize attachments

6. **Preview Improvements**
   - PDF thumbnail preview
   - Image gallery for image attachments
   - Quick view without downloading

---

## Notes

- Reuses existing Gmail API infrastructure (no additional authentication needed)
- Reuses existing attachment download functions
- Compatible with current multi-account Gmail setup
- No database changes required
- All processing done client-side
- Can be implemented incrementally (start with basic search, add download features later)

---

## Status
**Not Yet Implemented** - Saved for future development
