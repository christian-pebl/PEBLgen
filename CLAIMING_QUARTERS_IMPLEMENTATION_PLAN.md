# Claiming Quarters Feature - Detailed Implementation Plan

## Executive Summary

This document outlines the implementation plan for a claiming quarters management system that allows users to:
1. Set an "active claiming quarter" for new spend assignments
2. Mark quarters as "submitted" once claims have been filed
3. Prevent new assignments to submitted quarters
4. Switch to the next quarter when ready to claim new expenses
5. View historical quarter data and individual transactions

---

## Current System Analysis

### How Quarters Currently Work

**Automatic Quarter Calculation:**
- When a transaction is assigned in `spend.html`, the system automatically calculates which quarter it belongs to
- Calculation based on: `transaction date - project start date = quarter`
- Formula: `quarter = floor(months_since_start / 3) + 1`
- Quarter stored in: `transaction.assignments[].quarter` field

**Example:**
```
Project starts: April 2024
Transaction date: 15/09/24 (September 2024)
Months elapsed: 5 months
Quarter: Q2 (floor(5/3) + 1 = 2)
```

**Current Data Flow:**
```
spend.html (assign transaction)
    ↓
calculateTransactionQuarter() - automatic calculation
    ↓
assignment.quarter = 2 (calculated)
    ↓
updateProjectQuarterlyCosts() - adds amount to item.quarterlyCosts.q2
    ↓
grants.html (view transactions)
    ↓
setActiveQuarter(2) - user selects quarter to view
    ↓
renderActiveQuarterTransactions() - filters transactions where assignment.quarter === 2
```

### Current Limitations

1. **No Quarter Status Tracking:**
   - Cannot mark a quarter as "submitted" or "closed"
   - No distinction between draft quarters and finalized quarters

2. **Automatic Assignment Only:**
   - Quarter is always calculated from transaction date
   - No concept of "live claiming quarter" for new expenses

3. **No Protection:**
   - Users can continue assigning transactions to old quarters
   - No warnings about adding expenses to submitted claims

4. **No Quarter Lifecycle:**
   - No formal process for closing a quarter and starting the next one
   - No audit trail of when quarters were submitted

---

## Proposed Solution Architecture

### 1. Quarter Status Lifecycle

Each quarter will have a lifecycle status:

```
┌─────────┐    Submit     ┌───────────┐    Approve      ┌──────────┐
│  DRAFT  │ ────────────► │ SUBMITTED │ ──────────────► │ APPROVED │
└─────────┘               └───────────┘                 └──────────┘
     ↑                          │                             │
     │                          │ Reopen                      │ Reopen
     └──────────────────────────┴─────────────────────────────┘
```

**Status Definitions:**
- **DRAFT:** Active claiming period - new transactions assigned here
- **SUBMITTED:** Quarter closed, claim filed, no new assignments allowed
- **APPROVED:** Claim approved by funder (optional status for tracking)

### 2. Enhanced Project Data Structure

Add new `claimingSettings` object to `projectBudget`:

```javascript
let projectBudget = {
    projectId: null,
    projectName: '',
    projectNumber: '',
    lastModified: null,

    financeSummary: { /* existing */ },

    // NEW: Claiming quarters management
    claimingSettings: {
        activeClaimingQuarter: 2,      // Currently active quarter for new assignments
        autoCalculateQuarter: false,   // Toggle: use active quarter OR auto-calculate from date
        allowPastQuarterAssignment: false, // Allow assigning to non-active quarters

        quarters: [
            {
                quarter: 1,
                status: 'submitted',        // 'draft' | 'submitted' | 'approved'
                startedDate: '2024-04-01',  // When quarter was activated
                submittedDate: '2024-07-15', // When claim was submitted
                approvedDate: null,         // When claim was approved (optional)
                notes: 'Q1 claim submitted to Welsh Gov',
                totalClaimed: 5420.50,      // Total amount claimed in this quarter
                transactionCount: 23        // Number of transactions in this quarter
            },
            {
                quarter: 2,
                status: 'draft',
                startedDate: '2024-07-16',
                submittedDate: null,
                approvedDate: null,
                notes: '',
                totalClaimed: 0,
                transactionCount: 0
            }
        ]
    },

    // Existing budget categories
    labour: { staff: [], totalCost: 0 },
    materials: { items: [], totalCost: 0 },
    // ... etc
}
```

### 3. Modified Assignment Logic

**Current behavior (spend.html):**
```javascript
// Line 6119-6214: saveAssignment()
const quarter = calculateTransactionQuarter(transaction.date, project);  // Always automatic
```

**New behavior:**
```javascript
// Determine quarter based on project settings
let quarter;

if (project.claimingSettings?.autoCalculateQuarter) {
    // Legacy behavior: calculate from transaction date
    quarter = calculateTransactionQuarter(transaction.date, project);
} else {
    // New behavior: use active claiming quarter
    quarter = project.claimingSettings?.activeClaimingQuarter || 1;

    // Validate quarter status
    const quarterConfig = project.claimingSettings?.quarters?.find(q => q.quarter === quarter);
    if (quarterConfig && quarterConfig.status !== 'draft') {
        // Prevent assignment to submitted/approved quarters
        showToast('error', 'Cannot Assign to Closed Quarter',
                  `Q${quarter} has been ${quarterConfig.status}. Please activate a new quarter first.`);
        return;
    }
}

// Create assignment with validated quarter
const newAssignment = {
    projectId: selectedCategory.projectId,
    quarter: quarter,  // Uses active claiming quarter
    // ... rest of assignment
};
```

---

## Implementation Phases

## Phase 1: Database Schema & Data Migration

### 1.1 Update Project Data Structure

**File:** `grants.html` (around line 1553-1616)

**Changes:**
- Add `claimingSettings` object to `projectBudget` template
- Set default values for new projects
- Ensure backward compatibility with existing projects

**Code:**
```javascript
let projectBudget = {
    projectId: null,
    projectName: '',
    projectNumber: '',
    lastModified: null,

    financeSummary: { /* existing */ },

    // NEW: Claiming quarters management
    claimingSettings: {
        activeClaimingQuarter: null,    // Set to 1 when project starts
        autoCalculateQuarter: false,    // Default to new behavior
        allowPastQuarterAssignment: false,

        quarters: []  // Populated when quarters are calculated
    },

    // Existing categories...
    labour: { staff: [], totalCost: 0 },
    materials: { items: [], totalCost: 0 },
    capitalUsage: { items: [], totalCost: 0 },
    subcontracting: { contractors: [], totalCost: 0 },
    travel: { trips: [], totalCost: 0 },
    otherCosts: { items: [], totalCost: 0 }
}
```

### 1.2 Initialize Claiming Settings for Existing Projects

**Create migration function:**

```javascript
/**
 * Initialize claiming settings for projects that don't have them
 * Run once on grants.html load for backward compatibility
 */
async function migrateProjectsToClaimingQuarters() {
    console.log('[Migration] Checking projects for claiming settings...');

    const projects = await loadAllProjectsFromDB();
    let migratedCount = 0;

    for (const project of projects) {
        // Skip if already has claiming settings
        if (project.claimingSettings && project.claimingSettings.quarters) {
            continue;
        }

        // Initialize claiming settings
        project.claimingSettings = {
            activeClaimingQuarter: getPreviousQuarter(project) || 1,
            autoCalculateQuarter: false,
            allowPastQuarterAssignment: false,
            quarters: []
        };

        // Build quarter configs from project dates
        const quarters = calculateQuarters(project);
        const currentQuarter = getCurrentQuarter(project);

        for (const q of quarters) {
            const quarterConfig = {
                quarter: q.index,
                status: q.index < currentQuarter ? 'draft' : 'draft',  // All start as draft
                startedDate: `${q.startYear}-${String(q.startMonth).padStart(2, '0')}-01`,
                submittedDate: null,
                approvedDate: null,
                notes: '',
                totalClaimed: 0,
                transactionCount: 0
            };

            project.claimingSettings.quarters.push(quarterConfig);
        }

        // Calculate existing transaction counts and totals
        await updateQuarterStatistics(project);

        // Save updated project
        await saveProjectToDB(project);
        migratedCount++;

        console.log(`[Migration] Migrated project: ${project.projectName} (${project.projectId})`);
    }

    console.log(`[Migration] Complete. Migrated ${migratedCount} projects.`);

    if (migratedCount > 0) {
        showToast('success', 'Projects Updated',
                  `Initialized claiming quarters for ${migratedCount} project(s).`);
    }
}

/**
 * Calculate statistics for each quarter (transaction count, total claimed)
 */
async function updateQuarterStatistics(project) {
    // Load all transactions for this project
    const allTransactions = await loadAllTransactions();

    // Filter to this project's assignments
    const projectAssignments = [];
    allTransactions.forEach(file => {
        file.transactions.forEach(trans => {
            if (trans.assignments) {
                trans.assignments.forEach(assignment => {
                    if (assignment.projectId === project.projectId) {
                        projectAssignments.push({
                            quarter: assignment.quarter,
                            amount: assignment.amount || 0
                        });
                    }
                });
            }
        });
    });

    // Update statistics for each quarter
    project.claimingSettings.quarters.forEach(quarterConfig => {
        const quarterAssignments = projectAssignments.filter(a => a.quarter === quarterConfig.quarter);
        quarterConfig.transactionCount = quarterAssignments.length;
        quarterConfig.totalClaimed = quarterAssignments.reduce((sum, a) => sum + a.amount, 0);
    });
}
```

**Trigger migration on page load:**

```javascript
// In grants.html initialization (around line 12784-12800)
window.addEventListener('DOMContentLoaded', async function() {
    console.log('[System] Grants page loaded');

    // ... existing initialization ...

    // Run migration for claiming quarters (one-time setup for existing projects)
    await migrateProjectsToClaimingQuarters();

    // ... rest of initialization ...
});
```

---

## Phase 2: Grants Page UI - Quarter Management

### 2.1 Add Quarter Settings Panel

**Location:** Add new section in grants.html around line 1287 (after quarterly budget tracking section)

**HTML Structure:**

```html
<!-- Quarter Claiming Settings Panel -->
<div class="mt-6 p-6 bg-white rounded-lg shadow-md border border-gray-200">
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Claiming Quarters Management
        </h2>

        <button id="toggleQuarterSettings" class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50">
            <span id="toggleQuarterSettingsIcon">▼</span> <span id="toggleQuarterSettingsText">Collapse</span>
        </button>
    </div>

    <div id="quarterSettingsContent">
        <!-- Active Quarter Display -->
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Active Claiming Quarter</p>
                    <p class="text-2xl font-bold text-blue-700" id="activeClaimingQuarterDisplay">Q2</p>
                    <p class="text-xs text-gray-500 mt-1">New transactions will be assigned to this quarter</p>
                </div>

                <div class="text-right">
                    <p class="text-sm text-gray-600">Status</p>
                    <span id="activeQuarterStatusBadge" class="inline-block px-3 py-1 mt-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                        Draft
                    </span>
                </div>
            </div>
        </div>

        <!-- Quarter List Table -->
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Claimed</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody id="quarterListTableBody" class="bg-white divide-y divide-gray-200">
                    <!-- Populated by renderQuarterListTable() -->
                </tbody>
            </table>
        </div>

        <!-- Quarter Actions -->
        <div class="mt-6 flex gap-3 flex-wrap">
            <button id="submitCurrentQuarterBtn"
                    class="px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Submit Current Quarter
            </button>

            <button id="startNextQuarterBtn"
                    class="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Start Next Quarter
            </button>

            <button id="reopenQuarterBtn"
                    class="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Reopen Quarter
            </button>
        </div>

        <!-- Advanced Settings -->
        <div class="mt-6 pt-6 border-t border-gray-200">
            <details class="group">
                <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                    <span class="group-open:rotate-90 transition-transform">▶</span>
                    Advanced Settings
                </summary>

                <div class="mt-4 ml-6 space-y-3">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" id="autoCalculateQuarterToggle" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="text-sm text-gray-700">
                            <span class="font-medium">Auto-calculate quarters from transaction dates</span>
                            <br><span class="text-xs text-gray-500">When enabled, ignores active quarter and assigns based on transaction date</span>
                        </span>
                    </label>

                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" id="allowPastQuarterAssignmentToggle" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="text-sm text-gray-700">
                            <span class="font-medium">Allow assignments to past quarters</span>
                            <br><span class="text-xs text-gray-500">Permits adding transactions to quarters older than the active quarter</span>
                        </span>
                    </label>
                </div>
            </details>
        </div>
    </div>
</div>
```

### 2.2 Render Quarter List Table

**Add JavaScript function:**

```javascript
/**
 * Render the quarter list table with status and statistics
 */
function renderQuarterListTable() {
    const tbody = document.getElementById('quarterListTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!projectBudget.claimingSettings || !projectBudget.claimingSettings.quarters) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">No quarters configured</td></tr>';
        return;
    }

    const quarters = calculateQuarters(projectBudget);
    const activeQuarter = projectBudget.claimingSettings.activeClaimingQuarter;

    projectBudget.claimingSettings.quarters.forEach(quarterConfig => {
        const quarterInfo = quarters.find(q => q.index === quarterConfig.quarter);
        if (!quarterInfo) return;

        const isActive = quarterConfig.quarter === activeQuarter;

        // Status badge
        let statusBadge = '';
        switch (quarterConfig.status) {
            case 'draft':
                statusBadge = '<span class="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Draft</span>';
                break;
            case 'submitted':
                statusBadge = '<span class="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">Submitted</span>';
                break;
            case 'approved':
                statusBadge = '<span class="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">Approved</span>';
                break;
        }

        // Action buttons
        let actionButtons = '';
        if (isActive && quarterConfig.status === 'draft') {
            actionButtons = `
                <button onclick="submitQuarter(${quarterConfig.quarter})"
                        class="px-3 py-1 text-xs text-orange-600 border border-orange-600 rounded hover:bg-orange-50">
                    Submit
                </button>
            `;
        } else if (quarterConfig.status === 'submitted' || quarterConfig.status === 'approved') {
            actionButtons = `
                <button onclick="reopenQuarter(${quarterConfig.quarter})"
                        class="px-3 py-1 text-xs text-gray-600 border border-gray-600 rounded hover:bg-gray-50">
                    Reopen
                </button>
            `;
        } else {
            actionButtons = `
                <button onclick="setActiveClaimingQuarter(${quarterConfig.quarter})"
                        class="px-3 py-1 text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
                    Activate
                </button>
            `;
        }

        const row = document.createElement('tr');
        row.className = isActive ? 'bg-blue-50' : '';
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900">Q${quarterConfig.quarter}</span>
                    ${isActive ? '<span class="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-200 rounded">Active</span>' : ''}
                </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                ${quarterInfo.label}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                ${quarterConfig.transactionCount}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                £${quarterConfig.totalClaimed.toFixed(2)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm">
                ${actionButtons}
            </td>
        `;

        tbody.appendChild(row);
    });

    // Update active quarter display
    updateActiveQuarterDisplay();
}

/**
 * Update the active quarter display card
 */
function updateActiveQuarterDisplay() {
    const activeQuarter = projectBudget.claimingSettings?.activeClaimingQuarter;
    const quarterConfig = projectBudget.claimingSettings?.quarters?.find(q => q.quarter === activeQuarter);

    const displayEl = document.getElementById('activeClaimingQuarterDisplay');
    const badgeEl = document.getElementById('activeQuarterStatusBadge');

    if (displayEl && activeQuarter) {
        displayEl.textContent = `Q${activeQuarter}`;
    }

    if (badgeEl && quarterConfig) {
        const statusColors = {
            'draft': 'text-green-800 bg-green-100',
            'submitted': 'text-orange-800 bg-orange-100',
            'approved': 'text-blue-800 bg-blue-100'
        };

        badgeEl.className = `inline-block px-3 py-1 text-sm font-medium rounded-full ${statusColors[quarterConfig.status] || ''}`;
        badgeEl.textContent = quarterConfig.status.charAt(0).toUpperCase() + quarterConfig.status.slice(1);
    }
}
```

### 2.3 Quarter Management Actions

**Add action handlers:**

```javascript
/**
 * Set the active claiming quarter
 */
async function setActiveClaimingQuarter(quarterNumber) {
    if (!projectBudget.claimingSettings) {
        showToast('error', 'Configuration Error', 'Claiming settings not initialized');
        return;
    }

    const quarterConfig = projectBudget.claimingSettings.quarters.find(q => q.quarter === quarterNumber);
    if (!quarterConfig) {
        showToast('error', 'Invalid Quarter', `Quarter ${quarterNumber} does not exist`);
        return;
    }

    // Confirm if switching from a draft quarter with transactions
    const currentQuarter = projectBudget.claimingSettings.quarters.find(
        q => q.quarter === projectBudget.claimingSettings.activeClaimingQuarter
    );

    if (currentQuarter && currentQuarter.status === 'draft' && currentQuarter.transactionCount > 0) {
        const confirmed = confirm(
            `The current quarter (Q${currentQuarter.quarter}) has ${currentQuarter.transactionCount} transaction(s) and is still in draft status.\n\n` +
            `Are you sure you want to switch to Q${quarterNumber}?\n\n` +
            `Consider submitting Q${currentQuarter.quarter} first to finalize those claims.`
        );

        if (!confirmed) return;
    }

    // Set as active
    projectBudget.claimingSettings.activeClaimingQuarter = quarterNumber;

    // Update started date if not set
    if (!quarterConfig.startedDate) {
        quarterConfig.startedDate = new Date().toISOString().split('T')[0];
    }

    // Save to database
    await saveProjectToDB(projectBudget);

    // Refresh UI
    renderQuarterListTable();
    setActiveQuarter(quarterNumber); // Updates the main quarter view

    showToast('success', 'Quarter Activated', `Q${quarterNumber} is now the active claiming quarter`);

    console.log(`[Claiming Quarters] Activated Q${quarterNumber} for project ${projectBudget.projectId}`);
}

/**
 * Submit the current quarter (mark as submitted)
 */
async function submitQuarter(quarterNumber) {
    if (!projectBudget.claimingSettings) return;

    const quarterConfig = projectBudget.claimingSettings.quarters.find(q => q.quarter === quarterNumber);
    if (!quarterConfig) {
        showToast('error', 'Invalid Quarter', `Quarter ${quarterNumber} does not exist`);
        return;
    }

    if (quarterConfig.status !== 'draft') {
        showToast('warning', 'Already Submitted', `Q${quarterNumber} has already been ${quarterConfig.status}`);
        return;
    }

    // Recalculate statistics before submitting
    await updateQuarterStatistics(projectBudget);

    // Confirmation dialog
    const confirmed = confirm(
        `Submit Q${quarterNumber} for claiming?\n\n` +
        `Transactions: ${quarterConfig.transactionCount}\n` +
        `Total Amount: £${quarterConfig.totalClaimed.toFixed(2)}\n\n` +
        `After submission, you will not be able to add new transactions to this quarter unless you reopen it.`
    );

    if (!confirmed) return;

    // Prompt for notes
    const notes = prompt(`Add notes for Q${quarterNumber} submission (optional):`, quarterConfig.notes || '');

    // Mark as submitted
    quarterConfig.status = 'submitted';
    quarterConfig.submittedDate = new Date().toISOString().split('T')[0];
    if (notes !== null) {
        quarterConfig.notes = notes;
    }

    // Save to database
    await saveProjectToDB(projectBudget);

    // Refresh UI
    renderQuarterListTable();

    showToast('success', 'Quarter Submitted',
              `Q${quarterNumber} marked as submitted. Total claimed: £${quarterConfig.totalClaimed.toFixed(2)}`);

    console.log(`[Claiming Quarters] Submitted Q${quarterNumber} for project ${projectBudget.projectId}`, {
        transactionCount: quarterConfig.transactionCount,
        totalClaimed: quarterConfig.totalClaimed,
        submittedDate: quarterConfig.submittedDate
    });

    // Suggest starting next quarter if available
    const nextQuarter = projectBudget.claimingSettings.quarters.find(
        q => q.quarter === quarterNumber + 1 && q.status === 'draft'
    );

    if (nextQuarter) {
        setTimeout(() => {
            const startNext = confirm(
                `Q${quarterNumber} has been submitted.\n\n` +
                `Would you like to start Q${nextQuarter.quarter} now?`
            );

            if (startNext) {
                setActiveClaimingQuarter(nextQuarter.quarter);
            }
        }, 500);
    }
}

/**
 * Start the next quarter (submit current + activate next)
 */
async function startNextQuarter() {
    if (!projectBudget.claimingSettings) return;

    const currentQuarter = projectBudget.claimingSettings.activeClaimingQuarter;
    const nextQuarterNumber = currentQuarter + 1;

    const currentQuarterConfig = projectBudget.claimingSettings.quarters.find(q => q.quarter === currentQuarter);
    const nextQuarterConfig = projectBudget.claimingSettings.quarters.find(q => q.quarter === nextQuarterNumber);

    if (!nextQuarterConfig) {
        showToast('warning', 'No Next Quarter', 'There is no next quarter available in this project');
        return;
    }

    // Check if current quarter should be submitted first
    if (currentQuarterConfig && currentQuarterConfig.status === 'draft') {
        const submitCurrent = confirm(
            `The current quarter (Q${currentQuarter}) is still in draft status.\n\n` +
            `Submit Q${currentQuarter} and start Q${nextQuarterNumber}?`
        );

        if (submitCurrent) {
            await submitQuarter(currentQuarter);
        }
    }

    // Activate next quarter
    await setActiveClaimingQuarter(nextQuarterNumber);
}

/**
 * Reopen a submitted quarter (revert to draft)
 */
async function reopenQuarter(quarterNumber) {
    if (!projectBudget.claimingSettings) return;

    const quarterConfig = projectBudget.claimingSettings.quarters.find(q => q.quarter === quarterNumber);
    if (!quarterConfig) {
        showToast('error', 'Invalid Quarter', `Quarter ${quarterNumber} does not exist`);
        return;
    }

    if (quarterConfig.status === 'draft') {
        showToast('info', 'Already Open', `Q${quarterNumber} is already in draft status`);
        return;
    }

    // Confirmation
    const confirmed = confirm(
        `Reopen Q${quarterNumber}?\n\n` +
        `Current status: ${quarterConfig.status}\n` +
        `Submitted: ${quarterConfig.submittedDate || 'N/A'}\n\n` +
        `This will allow adding new transactions to this quarter again.`
    );

    if (!confirmed) return;

    // Revert to draft
    quarterConfig.status = 'draft';
    // Keep submitted date for audit trail

    // Save to database
    await saveProjectToDB(projectBudget);

    // Refresh UI
    renderQuarterListTable();

    showToast('success', 'Quarter Reopened', `Q${quarterNumber} is now in draft status`);

    console.log(`[Claiming Quarters] Reopened Q${quarterNumber} for project ${projectBudget.projectId}`);
}
```

### 2.4 Wire Up UI Event Listeners

**Add to initialization:**

```javascript
// Toggle quarter settings panel
document.getElementById('toggleQuarterSettings')?.addEventListener('click', function() {
    const content = document.getElementById('quarterSettingsContent');
    const icon = document.getElementById('toggleQuarterSettingsIcon');
    const text = document.getElementById('toggleQuarterSettingsText');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
        text.textContent = 'Collapse';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
        text.textContent = 'Expand';
    }
});

// Submit current quarter
document.getElementById('submitCurrentQuarterBtn')?.addEventListener('click', async function() {
    const activeQuarter = projectBudget.claimingSettings?.activeClaimingQuarter;
    if (activeQuarter) {
        await submitQuarter(activeQuarter);
    }
});

// Start next quarter
document.getElementById('startNextQuarterBtn')?.addEventListener('click', async function() {
    await startNextQuarter();
});

// Reopen quarter
document.getElementById('reopenQuarterBtn')?.addEventListener('click', async function() {
    const activeQuarter = projectBudget.claimingSettings?.activeClaimingQuarter;
    if (activeQuarter) {
        await reopenQuarter(activeQuarter);
    }
});

// Advanced settings toggles
document.getElementById('autoCalculateQuarterToggle')?.addEventListener('change', async function(e) {
    if (!projectBudget.claimingSettings) return;

    projectBudget.claimingSettings.autoCalculateQuarter = e.target.checked;
    await saveProjectToDB(projectBudget);

    showToast('info', 'Settings Updated',
              e.target.checked
                  ? 'Quarters will be auto-calculated from transaction dates'
                  : 'Quarters will use the active claiming quarter');
});

document.getElementById('allowPastQuarterAssignmentToggle')?.addEventListener('change', async function(e) {
    if (!projectBudget.claimingSettings) return;

    projectBudget.claimingSettings.allowPastQuarterAssignment = e.target.checked;
    await saveProjectToDB(projectBudget);

    showToast('info', 'Settings Updated',
              e.target.checked
                  ? 'Assignments to past quarters are now allowed'
                  : 'Assignments restricted to active quarter only');
});
```

---

## Phase 3: Spend Page - Modified Assignment Logic

### 3.1 Update saveAssignment() Function

**File:** `spend.html` (around line 6119-6214)

**Replace quarter calculation section:**

```javascript
/**
 * Save assignment of transaction to budget item
 * Modified to use active claiming quarter instead of auto-calculation
 */
async function saveAssignment() {
    // ... existing validation code ...

    // Get the selected project
    const project = activeProjects.find(p => p.projectId === selectedCategory.projectId);
    if (!project) {
        showToast('error', 'Project Not Found', 'Could not find project data');
        return;
    }

    // ============================================
    // QUARTER DETERMINATION (MODIFIED LOGIC)
    // ============================================
    let quarter;
    let quarterWarnings = [];

    // Check if project has claiming settings
    if (!project.claimingSettings || !project.claimingSettings.quarters) {
        // Fallback: Legacy auto-calculation behavior
        console.warn('[Assignment] Project has no claiming settings, using auto-calculation');
        quarter = calculateTransactionQuarter(transaction.date, project);
        quarterWarnings.push('This project uses legacy quarter calculation. Consider updating claiming settings.');
    } else {
        // NEW BEHAVIOR: Use claiming settings
        const settings = project.claimingSettings;

        if (settings.autoCalculateQuarter) {
            // Auto-calculate from transaction date (legacy mode)
            quarter = calculateTransactionQuarter(transaction.date, project);
            console.log(`[Assignment] Using auto-calculated quarter: Q${quarter}`);
        } else {
            // Use active claiming quarter (new default behavior)
            quarter = settings.activeClaimingQuarter;

            if (!quarter) {
                showToast('error', 'No Active Quarter',
                          'No active claiming quarter is set. Please configure quarters in the grants page.');
                return;
            }

            // Validate quarter status
            const quarterConfig = settings.quarters.find(q => q.quarter === quarter);

            if (!quarterConfig) {
                showToast('error', 'Invalid Quarter', `Quarter ${quarter} configuration not found`);
                return;
            }

            if (quarterConfig.status !== 'draft') {
                showToast('error', 'Quarter Closed',
                          `Q${quarter} has been ${quarterConfig.status}. Cannot add new transactions.\n\n` +
                          `Please activate a different quarter in the grants page or reopen this quarter.`,
                          8000);
                return;
            }

            // Check if transaction date aligns with quarter period
            const calculatedQuarter = calculateTransactionQuarter(transaction.date, project);
            if (calculatedQuarter !== quarter) {
                const quarters = calculateQuarters(project);
                const activeQuarterInfo = quarters.find(q => q.index === quarter);
                const transactionQuarterInfo = quarters.find(q => q.index === calculatedQuarter);

                quarterWarnings.push(
                    `Transaction date (${transaction.date}) falls in ${transactionQuarterInfo?.label || 'Q'+calculatedQuarter}, ` +
                    `but will be assigned to active claiming quarter ${activeQuarterInfo?.label || 'Q'+quarter}`
                );
            }

            console.log(`[Assignment] Using active claiming quarter: Q${quarter}`);
        }
    }

    // Show warnings if any
    if (quarterWarnings.length > 0) {
        const proceed = confirm(
            'Quarter Assignment Notice:\n\n' +
            quarterWarnings.join('\n\n') +
            '\n\nDo you want to proceed with this assignment?'
        );

        if (!proceed) {
            console.log('[Assignment] User cancelled due to quarter warnings');
            return;
        }
    }

    // ============================================
    // CREATE ASSIGNMENT (existing code continues)
    // ============================================

    // Ensure transaction has a reference
    if (!transaction.transactionRef) {
        transaction.transactionRef = generateTransactionRef(transaction);
    }

    // Calculate amount to assign (ex-VAT)
    const amountToAssign = parseFloat(transaction.spent_ex_vat) || parseFloat(transaction.spent) || 0;

    // Create assignment object
    const newAssignment = {
        projectId: selectedCategory.projectId,
        projectName: project.projectName,
        category: selectedCategory.category,
        itemKey: selectedCategory.itemKey,
        itemName: selectedCategory.itemName,
        quarter: quarter,  // <-- USES VALIDATED QUARTER
        percentage: 100,
        amount: amountToAssign,
        assignedDate: new Date().toISOString()
    };

    // Initialize assignments array if needed
    if (!transaction.assignments) {
        transaction.assignments = [];
    }

    // Add assignment
    transaction.assignments.push(newAssignment);

    // ... rest of existing code (save to DB, update UI, etc.) ...

    // Success message with quarter info
    showToast('success', 'Assignment Saved',
              `Assigned to ${project.projectName} - ${selectedCategory.category} (Q${quarter})`,
              5000);

    console.log('[Assignment] Saved:', {
        transactionDate: transaction.date,
        project: project.projectName,
        category: selectedCategory.category,
        quarter: quarter,
        amount: amountToAssign
    });
}
```

### 3.2 Add Quarter Validation Helper

**Add new function:**

```javascript
/**
 * Validate if a transaction can be assigned to a specific quarter
 * Returns: { valid: boolean, reason: string, warnings: string[] }
 */
function validateQuarterAssignment(transaction, project, targetQuarter) {
    const result = {
        valid: true,
        reason: '',
        warnings: []
    };

    // Check if project has claiming settings
    if (!project.claimingSettings || !project.claimingSettings.quarters) {
        result.warnings.push('Project uses legacy quarter calculation (no claiming settings)');
        return result;
    }

    const settings = project.claimingSettings;
    const quarterConfig = settings.quarters.find(q => q.quarter === targetQuarter);

    if (!quarterConfig) {
        result.valid = false;
        result.reason = `Quarter ${targetQuarter} does not exist in project configuration`;
        return result;
    }

    // Check quarter status
    if (quarterConfig.status !== 'draft') {
        result.valid = false;
        result.reason = `Q${targetQuarter} has been ${quarterConfig.status} and cannot accept new transactions`;
        return result;
    }

    // Check if transaction date aligns with quarter
    if (!settings.autoCalculateQuarter) {
        const calculatedQuarter = calculateTransactionQuarter(transaction.date, project);
        if (calculatedQuarter !== targetQuarter) {
            result.warnings.push(
                `Transaction date (${transaction.date}) falls in Q${calculatedQuarter} ` +
                `but will be assigned to active quarter Q${targetQuarter}`
            );
        }
    }

    // Check if past quarter assignment is allowed
    if (targetQuarter < settings.activeClaimingQuarter && !settings.allowPastQuarterAssignment) {
        result.warnings.push(
            `Assigning to past quarter Q${targetQuarter} (active is Q${settings.activeClaimingQuarter})`
        );
    }

    return result;
}
```

### 3.3 Update Assign Button UI

**Enhance the assign dialog to show quarter info:**

```javascript
/**
 * Show assignment dialog with quarter information
 */
function showAssignmentDialog(transaction) {
    // ... existing code to populate dialog ...

    // Add quarter info display
    const project = activeProjects.find(p => p.projectId === selectedCategory?.projectId);

    if (project && project.claimingSettings) {
        const activeQuarter = project.claimingSettings.activeClaimingQuarter;
        const quarterConfig = project.claimingSettings.quarters?.find(q => q.quarter === activeQuarter);

        const quarterInfoHTML = `
            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p class="text-sm font-medium text-gray-700 mb-1">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Will be assigned to: <span class="font-bold text-blue-700">Q${activeQuarter}</span>
                </p>
                ${quarterConfig && quarterConfig.status !== 'draft'
                    ? `<p class="text-xs text-orange-600 mt-1">⚠ Quarter status: ${quarterConfig.status}</p>`
                    : ''
                }
            </div>
        `;

        // Insert quarter info before the assign button
        const assignButton = document.getElementById('confirmAssignBtn');
        if (assignButton && assignButton.parentElement) {
            const infoDiv = document.createElement('div');
            infoDiv.innerHTML = quarterInfoHTML;
            assignButton.parentElement.insertBefore(infoDiv, assignButton);
        }
    }
}
```

---

## Phase 4: Historical Quarter Viewing & Reporting

### 4.1 Enhance Quarter Selector

**Modify the quarter selector to show status badges:**

```javascript
/**
 * Render quarter selector buttons with status indicators
 * (Enhances existing renderQuarterSelector function)
 */
function renderQuarterSelector(project) {
    const quarters = calculateQuarters(project);
    const container = document.getElementById('quarterSelectorContainer');
    if (!container) return;

    container.innerHTML = '';

    quarters.forEach(q => {
        const button = document.createElement('button');
        button.className = 'quarter-selector-btn';

        // Check quarter status from claiming settings
        let statusBadge = '';
        let statusClass = '';

        if (project.claimingSettings && project.claimingSettings.quarters) {
            const quarterConfig = project.claimingSettings.quarters.find(qc => qc.quarter === q.index);

            if (quarterConfig) {
                statusClass = {
                    'draft': 'quarter-draft',
                    'submitted': 'quarter-submitted',
                    'approved': 'quarter-approved'
                }[quarterConfig.status] || '';

                statusBadge = {
                    'draft': '',  // No badge for draft (default)
                    'submitted': '<span class="status-badge status-submitted">✓</span>',
                    'approved': '<span class="status-badge status-approved">✓✓</span>'
                }[quarterConfig.status] || '';
            }
        }

        // Highlight active quarter
        if (q.index === activeQuarterIndex) {
            button.classList.add('active');
        }

        button.classList.add(statusClass);

        button.innerHTML = `
            <span class="quarter-label">Q${q.index}</span>
            ${statusBadge}
            <span class="quarter-period">${q.label}</span>
        `;

        button.onclick = () => setActiveQuarter(q.index);

        container.appendChild(button);
    });
}
```

**Add CSS for status badges:**

```css
.quarter-selector-btn {
    position: relative;
    padding: 0.75rem 1rem;
    border: 2px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
}

.quarter-selector-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
}

.quarter-selector-btn.active {
    background: #fef3c7;
    border-color: #f59e0b;
    font-weight: 600;
}

.quarter-draft {
    border-color: #10b981;
}

.quarter-submitted {
    border-color: #f59e0b;
    background: #fff7ed;
}

.quarter-approved {
    border-color: #3b82f6;
    background: #eff6ff;
}

.status-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
}

.status-submitted {
    background: #f59e0b;
    color: white;
}

.status-approved {
    background: #3b82f6;
    color: white;
}

.quarter-label {
    font-size: 1.1rem;
    font-weight: 600;
    display: block;
}

.quarter-period {
    font-size: 0.75rem;
    color: #6b7280;
    display: block;
    margin-top: 0.25rem;
}
```

### 4.2 Add "View All Quarters" Mode

**Add comparison view button:**

```html
<button id="compareQuartersBtn"
        class="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 flex items-center gap-2">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    </svg>
    Compare All Quarters
</button>
```

**Add comparison table function:**

```javascript
/**
 * Show comparison table of all quarters
 */
function showQuarterComparison() {
    if (!projectBudget.claimingSettings || !projectBudget.claimingSettings.quarters) {
        showToast('info', 'No Data', 'No claiming quarters configured for this project');
        return;
    }

    const quarters = calculateQuarters(projectBudget);
    const categories = ['labour', 'materials', 'capitalUsage', 'subcontracting', 'travel', 'otherCosts'];

    // Build comparison table HTML
    let tableHTML = `
        <div class="comparison-dialog">
            <h2 class="text-2xl font-bold mb-4">Quarter-by-Quarter Comparison</h2>

            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
    `;

    // Add column for each quarter
    quarters.forEach(q => {
        const quarterConfig = projectBudget.claimingSettings.quarters.find(qc => qc.quarter === q.index);
        const statusBadge = quarterConfig ? `<span class="text-xs text-gray-500">(${quarterConfig.status})</span>` : '';

        tableHTML += `
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Q${q.index} ${statusBadge}
            </th>
        `;
    });

    tableHTML += `
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
    `;

    // Add row for each category
    categories.forEach(category => {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        const items = projectBudget[category]?.staff || projectBudget[category]?.items ||
                     projectBudget[category]?.contractors || projectBudget[category]?.trips || [];

        tableHTML += `<tr><td class="px-4 py-3 font-medium text-gray-900">${categoryName}</td>`;

        let rowTotal = 0;

        // Add cell for each quarter
        quarters.forEach(q => {
            let quarterTotal = 0;

            items.forEach(item => {
                if (item.quarterlyCosts && item.quarterlyCosts[`q${q.index}`]) {
                    quarterTotal += item.quarterlyCosts[`q${q.index}`];
                }
            });

            rowTotal += quarterTotal;

            tableHTML += `<td class="px-4 py-3 text-right text-gray-900">£${quarterTotal.toFixed(2)}</td>`;
        });

        tableHTML += `<td class="px-4 py-3 text-right font-bold text-gray-900">£${rowTotal.toFixed(2)}</td></tr>`;
    });

    // Add totals row
    tableHTML += `<tr class="bg-gray-50 font-bold"><td class="px-4 py-3">TOTAL</td>`;

    let grandTotal = 0;

    quarters.forEach(q => {
        const quarterConfig = projectBudget.claimingSettings.quarters.find(qc => qc.quarter === q.index);
        const quarterTotal = quarterConfig?.totalClaimed || 0;
        grandTotal += quarterTotal;

        tableHTML += `<td class="px-4 py-3 text-right">£${quarterTotal.toFixed(2)}</td>`;
    });

    tableHTML += `
                        <td class="px-4 py-3 text-right">£${grandTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <button onclick="closeComparisonDialog()" class="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Close
        </button>
    </div>
    `;

    // Show in modal/dialog
    showModal('Quarter Comparison', tableHTML);
}
```

---

## Phase 5: Testing & Validation

### 5.1 Test Scenarios

**Scenario 1: New Project Setup**
1. Create new project in grants page
2. Set project start date and duration
3. Verify claiming settings are initialized
4. Verify all quarters are created with 'draft' status
5. Verify activeClaimingQuarter is set to Q1 or previous quarter

**Scenario 2: Assign Transaction to Active Quarter**
1. Activate Q1 in grants page
2. Go to spend page
3. Assign transaction (date in Q1 period)
4. Verify assignment.quarter = 1
5. Return to grants page
6. Verify transaction appears in Q1 view
7. Verify quarterConfig.transactionCount incremented
8. Verify quarterConfig.totalClaimed updated

**Scenario 3: Assign Transaction to Different Quarter (Date Mismatch)**
1. Activate Q2 in grants page
2. Go to spend page
3. Assign transaction with date in Q1 period
4. Verify warning message appears
5. Confirm assignment
6. Verify transaction assigned to Q2 (not Q1)
7. Verify warning was logged

**Scenario 4: Submit Quarter**
1. Activate Q1, add 5 transactions
2. Click "Submit Current Quarter"
3. Verify confirmation dialog shows correct stats
4. Confirm submission
5. Verify quarterConfig.status = 'submitted'
6. Verify quarterConfig.submittedDate set
7. Verify prompt to start Q2 appears

**Scenario 5: Prevent Assignment to Submitted Quarter**
1. Submit Q1
2. Manually set activeClaimingQuarter back to 1 (simulate old behavior)
3. Go to spend page, try to assign transaction
4. Verify error: "Q1 has been submitted"
5. Verify assignment is blocked

**Scenario 6: Start Next Quarter**
1. Submit Q1
2. Click "Start Next Quarter"
3. Verify Q2 becomes active
4. Verify Q2.startedDate is set
5. Assign transaction in spend page
6. Verify goes to Q2

**Scenario 7: Reopen Submitted Quarter**
1. Submit Q1
2. Click "Reopen Quarter" for Q1
3. Verify quarterConfig.status = 'draft'
4. Verify submittedDate is preserved (audit trail)
5. Assign new transaction to Q1
6. Verify assignment succeeds

**Scenario 8: Quarter Comparison View**
1. Add transactions to Q1, Q2, Q3
2. Click "Compare All Quarters"
3. Verify table shows all quarters with totals
4. Verify status badges display correctly
5. Verify category breakdown is accurate

**Scenario 9: Legacy Project Migration**
1. Load existing project without claimingSettings
2. Verify migration runs on page load
3. Verify claimingSettings object created
4. Verify quarters array populated
5. Verify existing transaction counts calculated
6. Verify project saved with new structure

**Scenario 10: Auto-Calculate Mode**
1. Enable "Auto-calculate quarters" in advanced settings
2. Go to spend page
3. Assign transaction with date in Q3
4. Verify quarter calculated from date (not active quarter)
5. Verify transaction assigned to correct calculated quarter

### 5.2 Data Integrity Checks

**Check 1: Quarter Statistics Accuracy**
```javascript
async function validateQuarterStatistics(projectId) {
    const project = await loadProjectFromDB(projectId);
    const allTransactions = await loadAllTransactions();

    // Manually count transactions per quarter
    const manualCounts = {};
    const manualTotals = {};

    allTransactions.forEach(file => {
        file.transactions.forEach(trans => {
            if (trans.assignments) {
                trans.assignments.forEach(assignment => {
                    if (assignment.projectId === projectId) {
                        const q = assignment.quarter;
                        manualCounts[q] = (manualCounts[q] || 0) + 1;
                        manualTotals[q] = (manualTotals[q] || 0) + (assignment.amount || 0);
                    }
                });
            }
        });
    });

    // Compare with stored statistics
    let hasErrors = false;

    project.claimingSettings.quarters.forEach(quarterConfig => {
        const q = quarterConfig.quarter;
        const storedCount = quarterConfig.transactionCount;
        const storedTotal = quarterConfig.totalClaimed;
        const actualCount = manualCounts[q] || 0;
        const actualTotal = manualTotals[q] || 0;

        if (storedCount !== actualCount || Math.abs(storedTotal - actualTotal) > 0.01) {
            console.error(`[Validation Error] Q${q} statistics mismatch:`, {
                storedCount, actualCount,
                storedTotal: storedTotal.toFixed(2),
                actualTotal: actualTotal.toFixed(2)
            });
            hasErrors = true;
        }
    });

    if (hasErrors) {
        console.log('[Validation] Running updateQuarterStatistics to fix...');
        await updateQuarterStatistics(project);
        await saveProjectToDB(project);
    } else {
        console.log('[Validation] All quarter statistics are accurate ✓');
    }

    return !hasErrors;
}
```

**Check 2: Orphaned Assignments**
```javascript
async function findOrphanedAssignments() {
    const allTransactions = await loadAllTransactions();
    const projects = await loadAllProjectsFromDB();
    const projectIds = new Set(projects.map(p => p.projectId));

    const orphans = [];

    allTransactions.forEach(file => {
        file.transactions.forEach(trans => {
            if (trans.assignments) {
                trans.assignments.forEach(assignment => {
                    if (!projectIds.has(assignment.projectId)) {
                        orphans.push({
                            transactionRef: trans.transactionRef,
                            projectId: assignment.projectId,
                            projectName: assignment.projectName,
                            quarter: assignment.quarter
                        });
                    }
                });
            }
        });
    });

    if (orphans.length > 0) {
        console.error(`[Validation] Found ${orphans.length} orphaned assignments:`, orphans);
    } else {
        console.log('[Validation] No orphaned assignments found ✓');
    }

    return orphans;
}
```

### 5.3 User Testing Checklist

- [ ] Create new project and verify claiming settings initialized
- [ ] Assign 10 transactions across 3 quarters
- [ ] Submit Q1 and verify status change
- [ ] Attempt to assign to submitted Q1 and verify blocked
- [ ] Start Q2 and assign new transactions
- [ ] View transactions for each quarter individually
- [ ] Use "Compare All Quarters" view
- [ ] Reopen Q1 and add new transaction
- [ ] Test with legacy project (no claiming settings)
- [ ] Verify migration creates settings correctly
- [ ] Test auto-calculate mode toggle
- [ ] Export quarter transactions to Excel/PDF
- [ ] Check quarter statistics match actual data
- [ ] Test with project spanning 8+ quarters
- [ ] Verify UI responsiveness on mobile/tablet
- [ ] Check accessibility (keyboard navigation, screen readers)

---

## Phase 6: Documentation & User Guide

### 6.1 In-App Help Text

**Add help icon next to "Claiming Quarters Management" heading:**

```html
<button id="claimingQuartersHelp" class="ml-2 text-blue-600 hover:text-blue-800">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
</button>
```

**Help dialog content:**

```javascript
const claimingQuartersHelpHTML = `
<div class="help-content">
    <h3 class="text-lg font-bold mb-3">How Claiming Quarters Work</h3>

    <div class="mb-4">
        <h4 class="font-semibold text-gray-800 mb-2">Overview</h4>
        <p class="text-sm text-gray-700">
            Claiming quarters help you organize expenses by the claim submission period.
            Instead of quarters being determined solely by transaction dates, you control
            which quarter is "active" for new expense assignments.
        </p>
    </div>

    <div class="mb-4">
        <h4 class="font-semibold text-gray-800 mb-2">Quarter Statuses</h4>
        <ul class="text-sm text-gray-700 space-y-2">
            <li><span class="font-medium text-green-700">Draft:</span> Active quarter accepting new transactions</li>
            <li><span class="font-medium text-orange-700">Submitted:</span> Quarter closed, claim filed with funder</li>
            <li><span class="font-medium text-blue-700">Approved:</span> Claim approved by funder (optional)</li>
        </ul>
    </div>

    <div class="mb-4">
        <h4 class="font-semibold text-gray-800 mb-2">Typical Workflow</h4>
        <ol class="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Start Q1 at project beginning</li>
            <li>Assign expenses from Spend page (all go to Q1)</li>
            <li>At end of quarter, review transactions in grants page</li>
            <li>Click "Submit Current Quarter" to finalize Q1</li>
            <li>Click "Start Next Quarter" to activate Q2</li>
            <li>Continue assigning new expenses (now go to Q2)</li>
            <li>Repeat for each claiming period</li>
        </ol>
    </div>

    <div class="mb-4">
        <h4 class="font-semibold text-gray-800 mb-2">Date Mismatches</h4>
        <p class="text-sm text-gray-700">
            If you assign a transaction with a date that falls outside the active quarter
            (e.g., assigning a July expense to Q3 when Q3 is Oct-Dec), you'll see a warning.
            This is expected when catching up on old expenses or pre-paying for future periods.
        </p>
    </div>

    <div>
        <h4 class="font-semibold text-gray-800 mb-2">Advanced Settings</h4>
        <p class="text-sm text-gray-700 mb-2">
            <strong>Auto-calculate quarters:</strong> Reverts to old behavior (quarters
            determined by transaction date, not active quarter).
        </p>
        <p class="text-sm text-gray-700">
            <strong>Allow past quarter assignment:</strong> Permits adding transactions to
            quarters older than the active quarter (useful for corrections).
        </p>
    </div>
</div>
`;

document.getElementById('claimingQuartersHelp')?.addEventListener('click', function() {
    showModal('Claiming Quarters Help', claimingQuartersHelpHTML);
});
```

### 6.2 User Guide Document

Create `CLAIMING_QUARTERS_USER_GUIDE.md`:

```markdown
# Claiming Quarters User Guide

## What Are Claiming Quarters?

Claiming quarters allow you to organize project expenses by the period in which you submit claims to your funder. Rather than quarters being automatically determined by transaction dates, you set an "active quarter" that controls where new expenses are assigned.

## Why Use Claiming Quarters?

**Problem without claiming quarters:**
- You claim Q1 expenses in April
- In May, you add a forgotten March expense
- It automatically goes to Q1, but you already submitted Q1 claim
- Your records don't match what you submitted to the funder

**Solution with claiming quarters:**
- You submit Q1 claim in April and mark Q1 as "submitted"
- In May, you activate Q2
- When you add the forgotten March expense, it goes to Q2 (your current claiming period)
- You include this "catch-up" expense in your Q2 claim submission
- Records match submissions perfectly

## Basic Workflow

### 1. Starting a New Project

When you create a project, claiming quarters are automatically set up based on your project start date and duration.

**Default state:**
- All quarters start in "Draft" status
- The most recent quarter is set as the active claiming quarter

### 2. Adding Expenses

1. Go to **Spend** page
2. Upload bank statements
3. Click **Assign** next to a transaction
4. Choose: Project → Category → Budget Item
5. Click **Assign**

**Result:** The transaction is assigned to your project's **active quarter** (shown in the grants page).

### 3. Reviewing a Quarter

1. Go to **Grants** page
2. Scroll to **Claiming Quarters Management**
3. Click the quarter button (Q1, Q2, etc.) to view that quarter's transactions
4. Review all transactions, invoices, and totals
5. Export to Excel or PDF if needed

### 4. Submitting a Quarter

When you're ready to submit a claim to your funder:

1. Click **Submit Current Quarter** button
2. Review the summary (transaction count, total amount)
3. Add optional notes (e.g., "Submitted to Welsh Gov on 2024-04-15")
4. Confirm submission

**Result:**
- Quarter status changes to "Submitted"
- Submission date is recorded
- No new transactions can be added to this quarter (protection against accidental changes)

### 5. Starting the Next Quarter

After submitting a quarter:

1. Click **Start Next Quarter** button
2. Or manually click **Activate** on the next quarter in the table

**Result:**
- Next quarter becomes the active claiming quarter
- New transactions in Spend page will now go to this quarter

## Understanding Quarter Status Indicators

### Visual Indicators

**In Quarter Selector:**
- **No badge:** Draft (accepting transactions)
- **Orange checkmark (✓):** Submitted (claim filed)
- **Blue double-checkmark (✓✓):** Approved (claim approved by funder)

**In Quarter Table:**
- **Green badge:** Draft
- **Orange badge:** Submitted
- **Blue badge:** Approved

### What Each Status Means

| Status | Can Add Transactions? | Can Edit? | Purpose |
|--------|----------------------|-----------|---------|
| Draft | ✅ Yes | ✅ Yes | Active working quarter |
| Submitted | ❌ No (unless reopened) | ❌ No | Claim filed, awaiting approval |
| Approved | ❌ No (unless reopened) | ❌ No | Claim approved by funder |

## Common Scenarios

### Scenario 1: Catching Up on Old Expenses

**Situation:** You're in Q3, but find an old Q1 receipt you forgot to claim.

**Solution:**
1. Add the transaction in Spend page
2. It goes to Q3 (your active quarter)
3. The transaction date will show it's from Q1, but it's claimed in Q3
4. You'll see a notice: "Transaction date falls in Q1 but assigned to Q3"
5. This is correct behavior - you're claiming it now (Q3), not when it occurred (Q1)

### Scenario 2: Pre-Paying for Future Expenses

**Situation:** You're in Q1 but paid for Q3 conference registration.

**Solution:**
1. Add the transaction in Spend page
2. It goes to Q1 (your active quarter)
3. You'll see a notice: "Transaction date falls in Q3 but assigned to Q1"
4. This is correct - you're claiming the expense now (Q1) since you paid for it now

### Scenario 3: Correcting a Submitted Quarter

**Situation:** You submitted Q2, but then realize you made an error.

**Solution:**
1. Click **Reopen Quarter** for Q2
2. Status changes back to "Draft"
3. Make your corrections (add/remove/edit transactions)
4. Click **Submit Current Quarter** again when ready
5. Submission date history is preserved for audit trail

### Scenario 4: Viewing Historical Quarters

**Situation:** You want to see what you claimed in Q1 last year.

**Solution:**
1. Click the Q1 button in the quarter selector
2. View all Q1 transactions, invoices, and totals
3. Export to Excel/PDF for records
4. Click **Compare All Quarters** to see all quarters side-by-side

## Advanced Features

### Auto-Calculate Quarters (Legacy Mode)

If you prefer the old behavior where quarters are determined by transaction dates:

1. Expand **Advanced Settings**
2. Check **Auto-calculate quarters from transaction dates**
3. Save project

**Result:** Transactions are assigned to quarters based on their date, not the active quarter.

**When to use:**
- Project is already underway with old behavior
- You want strict date-based quarter allocation
- You don't submit claims on a quarterly schedule

### Allow Past Quarter Assignment

If you need to add transactions to older quarters:

1. Expand **Advanced Settings**
2. Check **Allow assignments to past quarters**
3. Save project

**Result:** You can manually activate old quarters and add transactions to them.

**When to use:**
- Making corrections to historical quarters
- Backdating expenses for accounting purposes
- Splitting a large catch-up batch into appropriate historical periods

## Tips & Best Practices

### 1. Submit Quarters Promptly

Submit quarters soon after filing your claim with the funder. This prevents accidentally adding new transactions to the wrong period.

### 2. Review Before Submitting

Always review the transaction list and totals before clicking "Submit Current Quarter". Once submitted, you'll need to reopen the quarter to make changes.

### 3. Add Notes

Use the notes field when submitting quarters to record:
- Date submitted to funder
- Reference numbers
- Any anomalies or special circumstances

### 4. Export for Records

Before submitting a quarter, export to Excel or PDF for your records. This provides a snapshot of exactly what was claimed.

### 5. Use Compare View

Regularly use "Compare All Quarters" to:
- Check spending patterns across periods
- Identify under/over-spending categories
- Prepare for funder reporting

### 6. Monitor Quarter Statistics

The quarter table shows transaction count and total claimed. Use these to:
- Verify data completeness (missing transactions?)
- Check against budget expectations
- Identify unusually high/low periods

## Troubleshooting

### "Cannot assign to closed quarter" error

**Cause:** You're trying to assign a transaction, but the active quarter is submitted/approved.

**Solution:** Activate a different quarter or reopen the current quarter.

### Transaction date doesn't match quarter

**Cause:** You're seeing "Transaction date falls in Q2 but assigned to Q1"

**Explanation:** This is expected behavior when the active quarter doesn't match the transaction date. The transaction goes to your active claiming quarter (Q1), not the quarter of its date (Q2).

**Solution:** This is usually correct. If you want date-based quarters, enable "Auto-calculate quarters" in advanced settings.

### Quarter statistics are wrong

**Cause:** Data inconsistency or error during assignment.

**Solution:**
1. Go to grants page
2. Open browser console (F12)
3. Run: `await updateQuarterStatistics(projectBudget)`
4. Statistics will be recalculated from actual transaction data

### Can't find old transaction

**Cause:** Looking in wrong quarter.

**Solution:**
1. Check each quarter using the quarter selector
2. Use browser find (Ctrl+F) to search for transaction description
3. Check if transaction was assigned to a different project

## FAQ

**Q: Can I change which quarter a transaction is in?**

A: Currently no, but you can delete the assignment and re-assign while the correct quarter is active.

**Q: What happens if I delete a transaction after submitting the quarter?**

A: The quarter statistics will be outdated. Run `updateQuarterStatistics()` or manually update.

**Q: Can I submit quarters out of order?**

A: Yes, quarters are independent. You can submit Q3 before Q2 if needed.

**Q: What if my funder uses different quarters (e.g., Oct-Dec instead of Jan-Mar)?**

A: Set your project start month to match your funder's fiscal year. The app will calculate quarters from that start date.

**Q: How do I export all quarters at once?**

A: Use "Compare All Quarters" view, then export the comparison table to Excel.

---

## Need More Help?

Contact support or refer to the main application documentation.
```

---

## Implementation Timeline

### Week 1: Database & Migration
- [ ] Update project data structure with `claimingSettings`
- [ ] Write migration function
- [ ] Test migration with existing projects
- [ ] Verify data integrity

### Week 2: Grants Page UI
- [ ] Build quarter settings panel HTML
- [ ] Implement quarter table rendering
- [ ] Add action buttons (submit, activate, reopen)
- [ ] Wire up event listeners
- [ ] Add help dialog

### Week 3: Spend Page Logic
- [ ] Modify `saveAssignment()` to use active quarter
- [ ] Add quarter validation
- [ ] Update assignment dialog UI
- [ ] Add warning system for date mismatches
- [ ] Test assignment flow end-to-end

### Week 4: Historical Viewing & Polish
- [ ] Enhance quarter selector with status badges
- [ ] Add "Compare All Quarters" view
- [ ] Add CSS styling
- [ ] Implement export functionality
- [ ] Add statistics validation

### Week 5: Testing & Documentation
- [ ] Run all test scenarios
- [ ] Fix bugs and edge cases
- [ ] Write user guide
- [ ] Add in-app help
- [ ] Create tutorial video (optional)

---

## Rollback Plan

If issues arise, system can fall back to legacy behavior:

1. Set `claimingSettings.autoCalculateQuarter = true` for all projects
2. Transactions will revert to date-based quarter calculation
3. Claiming quarters remain visible but don't affect assignments
4. Fix issues and re-enable when ready

---

## Future Enhancements

### Phase 7 (Optional):
- [ ] Multi-project quarter sync (e.g., all projects use same fiscal calendar)
- [ ] Automatic quarter advancement (auto-start next quarter on date)
- [ ] Email notifications when quarter is ready to submit
- [ ] Budget vs. actual comparison per quarter
- [ ] Variance analysis (why Q2 higher than Q1?)
- [ ] Predictive: "At current rate, Q3 will exceed budget by X%"
- [ ] Audit log: Track all changes to quarters (who reopened, when, why)
- [ ] Approval workflow: Require manager approval before submission
- [ ] Integration with funder portals (auto-export in required format)

---

## Database Backup Recommendation

Before implementing, create a full backup:

```javascript
// Run in browser console before starting implementation
async function createBackupBeforeClaimingQuarters() {
    const db = await openDatabase();

    const backup = {
        version: db.version,
        timestamp: new Date().toISOString(),
        projects: await getAllRecordsFromStore(db, 'projects'),
        csvFiles: await getAllRecordsFromStore(db, 'csvFiles'),
        invoices: await getAllRecordsFromStore(db, 'invoices')
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `peblgen_backup_before_claiming_quarters_${Date.now()}.json`;
    a.click();

    console.log('[Backup] Created backup successfully');
}

await createBackupBeforeClaimingQuarters();
```

---

## Summary

This implementation plan provides:

1. **Complete database schema changes** with migration path
2. **Full UI mockups and code** for grants page quarter management
3. **Modified assignment logic** in spend page with validation
4. **Historical viewing and comparison** features
5. **Comprehensive testing scenarios** and validation checks
6. **User documentation** and help system
7. **Rollback plan** for safety
8. **Timeline and phasing** for organized implementation

The system maintains backward compatibility, includes robust validation, and provides users with flexible quarter management while preventing common claiming errors.
