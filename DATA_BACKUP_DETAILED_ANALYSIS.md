# Data Backup Detailed Analysis

## Response to User Questions

### ✅ What's Actually Backed Up

Here's a detailed breakdown of EXACTLY what data is automatically backed up, addressing your specific concerns:

---

## 1. **Custom Transactions** ✅ BACKED UP

**Location:** grants.html
**Storage:** localStorage (`transactions` key) / IndexedDB
**What's included:**
- Date, description (with `[CUSTOM]` prefix)
- Amount (inc VAT and ex VAT)
- VAT rate (0% or 20%)
- Detail/notes field
- **Full assignment data:**
  - Project ID
  - Category (Labour, Materials, etc.)
  - Item key (specific budget line item)
  - Quarter (Q1-Q5)
  - Split percentage (e.g., 50% to Project A)
  - Assigned amount (£ value for this project)
  - Transaction reference

**Backup Status:** Already implemented in `universal-backup.js`
- Custom transactions are flagged with `isCustom: true`
- All assignment details preserved
- Backed up same as regular transactions

---

## 2. **Allocation Descriptions & Percentages** ✅ BACKED UP

**Location:** spend.html → grants.html
**What's included:**
- **Transaction allocations:**
  - Project name/ID
  - Allocation percentage (if split between projects)
  - Category assignment
  - Quarter assignment
  - Item-level assignments

**Storage:**
- Transactions store `allocation` or `project` field
- Custom transactions store full `assignments` array with percentages
- Project budget stores complete category/item structure

**Backup Status:** Already implemented
- Transaction backup includes allocation field
- Project backup includes all categories and budget structure
- Custom transaction backup includes split percentages

---

## 3. **Staff Signatures** ✅ NOW BACKED UP (NEW)

**Location:** timesheet.html
**Storage:** localStorage (`timesheet_staff_signatures`)
**What's included:**
- Staff name → Signature image mapping
- Signature stored as base64 data URL (PNG images)

**Backup Status:** **JUST ADDED** ✨
- Added `backupStaffSignature()` function
- Monitors `timesheet_staff_signatures` localStorage key
- New Supabase table: `staff_signatures`
- SQL script: `STAFF_SIGNATURES_TABLE.sql`

**Structure:**
```javascript
{
  "John Doe": "data:image/png;base64,iVBORw0KG...",
  "Jane Smith": "data:image/png;base64,iVBORw0KG...",
  ...
}
```

---

## 4. **Staff Names** ✅ BACKED UP (via multiple sources)

Staff names are backed up in several places:

**A. Labour Allocation Entries**
- Table: `labour_allocation_entries`
- Fields: `staff_name`, `gross_pay`, `fte`, `project_allocations`
- Source: timesheet.html labour allocation data

**B. Timesheet Entries**
- Table: `timesheets`
- Fields: `staff_name`, `date`, `hours`, `task_description`
- Source: timesheet.html generated timesheets

**C. Project Budget Data**
- Table: `projects`
- Field: `budget_data.labour.staff[]`
- Source: grants.html labour section

**D. Staff Signatures**
- Table: `staff_signatures` (NEW)
- Field: `staff_name`
- Source: timesheet.html signature management

---

## 5. **Project Budget Details** ✅ FULLY BACKED UP

The complete `projectBudget` object is backed up, including:

**Finance Summary:**
- Project duration, start date
- Total costs, funding level, funding sought
- Other public funding, contribution

**All Categories:**
- Labour (staff list with roles, costs, days)
- Overheads (percentage, calculations)
- Materials (items, quantities, costs)
- Capital Usage (depreciation, utilization)
- Subcontracting (contractors, countries, roles)
- Travel & Subsistence (trips, costs)
- Other Costs (miscellaneous items)

**Quarter Management:**
- Active claiming quarter
- Quarter status (started/submitted/approved)
- Quarter dates and notes
- Total claimed per quarter
- Transaction counts

**All Item Details:**
- Item descriptions
- Cost breakdowns
- VAT calculations
- Attachments/references

---

## 6. **Timesheets** ✅ BACKED UP (with validation)

**What's included:**
- Date (required field - validated)
- Staff name
- Project
- Hours worked
- Task description
- Notes

**Validation:** Only timesheets with valid `date` fields are backed up

**What's NOT backed up:**
- `timesheetHistory` - UI state for viewing previous generations
  - This is intentional - it's local UI state for undo/redo
  - Actual timesheet data IS backed up

---

## Complete Data Type List (Updated)

### 13 Data Types Currently Backed Up:

1. **Projects** - Complete budget data
2. **CSV Transaction Files** - Bank statements
3. **Invoice PDFs** - Receipt attachments
4. **Transactions** - All spending records (including custom)
5. **Labour Allocation** - Staff costs by project
6. **Gantt Charts** - Project plans
7. **Sketcher CSV Imports** - Marine species data
8. **Quotes** - Client quotes
9. **Invoices (Generated)** - Created invoices
10. **Clients** - Contact information
11. **Price List Items** - Pricing catalog
12. **Timesheets** - Individual entries (validated)
13. **Staff Signatures** ✨ **NEW** - Signature images

---

## UI History / Activity Feed Proposal

### 🎯 User Request:
> "I think UI history would be great so there is an activity feed the user can track and go back and forward if mistakes were made"

### 💡 Analysis:

**Benefits:**
✅ Undo/redo functionality across all pages
✅ Track all changes (not just current session)
✅ Audit trail for compliance
✅ Recover from mistakes days/weeks later
✅ See what changed and when
✅ Compare before/after states

**Current State:**
- `timesheetHistory` - Local UI history (last 10 timesheet generations)
- No history for: projects, transactions, allocations, quotes, invoices

**Implementation Options:**

#### Option 1: **Universal Activity Log** (Recommended)
Store ALL user actions in Supabase:

```javascript
activity_log table:
- user_id
- timestamp
- action_type (create, update, delete)
- entity_type (transaction, project, quote, etc.)
- entity_id
- changes (JSON - before/after diff)
- description (human-readable)
```

**Features:**
- Activity feed showing all recent changes
- Filter by date, entity type, action
- Click any item to view details or restore
- "Undo" button to revert changes
- Export activity log as CSV

**UI Location:**
- New "Activity" button in navigation
- Shows modal with activity timeline
- Group by date (Today, Yesterday, Last Week, etc.)

#### Option 2: **Version Control** (More Complex)
- Store full snapshots of data at key points
- Like Git for your application data
- Allows branching, merging, comparing versions
- More storage-intensive

#### Option 3: **Hybrid Approach** (Best Balance)
- Activity log for recent changes (last 30 days)
- Daily snapshots for long-term history
- Automatic cleanup of old activity logs
- Keep snapshots forever (compressed)

### Recommended Implementation Plan:

**Phase 1: Activity Logging** (2-3 days)
1. Create `activity_log` Supabase table
2. Add logging wrapper to all save/update functions
3. Build activity feed UI component
4. Add to navigation on all pages

**Phase 2: Undo/Redo** (1-2 days)
5. Implement restore functionality
6. Add "Undo" buttons in activity feed
7. Confirmation dialog for restores
8. Test with all data types

**Phase 3: Enhanced Features** (1-2 days)
9. Search/filter activity feed
10. Export activity log
11. Compare before/after (visual diff)
12. Email notifications for major changes

### Storage Requirements:

**Activity Log:**
- ~1KB per activity entry
- 100 actions/day = 100KB/day = 3MB/month
- Yearly: ~36MB per user
- Very affordable in Supabase free tier

**Snapshots:**
- Project: ~50-200KB
- Daily snapshot: ~200KB
- Monthly: ~6MB
- Yearly: ~72MB per user

### Example Activity Feed:

```
🕒 Today, 14:35
   📝 Updated "ABC Project" budget
   Category: Materials → Added "Laptop" (£1,200)
   [View Details] [Undo]

🕒 Today, 11:20
   💰 Added custom transaction
   "Office Supplies" - £45.99 → Q2, Materials
   [View Details] [Undo]

🕒 Yesterday, 16:45
   ✍️ Updated staff signature
   Staff: John Doe
   [View Details]

🕒 Yesterday, 09:30
   📊 Uploaded CSV file
   "Bank_Statement_Dec2025.csv" - 45 transactions
   [View Details] [Undo Import]
```

### Security Considerations:

✅ Activity log per user (isolated via RLS)
✅ Can't undo other users' actions
✅ Audit who made what changes
✅ Compliance-friendly (GDPR, ISO 27001)
✅ Tamper-proof (append-only log)

---

## Recommendations

### Immediate Actions:
1. ✅ **Staff signatures** - Already added to backup (complete)
2. ⚠️ **Run SQL script** - Execute `STAFF_SIGNATURES_TABLE.sql` in Supabase
3. ✅ **Documentation updated** - All data types documented

### Short-term (Next Sprint):
4. 🎯 **Implement Activity Log** - Following Phase 1 plan above
5. 📊 **Add activity feed UI** - Universal component across all pages
6. ⏪ **Basic undo/redo** - Restore from activity log

### Long-term (Future Enhancements):
7. 📸 **Daily snapshots** - For long-term version control
8. 🔍 **Advanced search** - Find any past change
9. 📧 **Email notifications** - Alert on major changes
10. 📈 **Analytics dashboard** - Usage patterns, trends

---

## Summary

### ✅ Your Questions Answered:

1. **Custom transactions** - Yes, backed up with full assignment details
2. **Allocation descriptions** - Yes, backed up in transaction/project data
3. **Allocation percentages** - Yes, backed up in assignments array
4. **Staff signatures** - Now backed up (just added)
5. **Staff names** - Yes, backed up in multiple tables
6. **Timesheets** - Yes, backed up (with date validation)

### ✨ New Addition:

**Staff Signatures Backup:**
- ✅ Code added to `universal-backup.js`
- ✅ SQL table script created
- ⚠️ **Action Required:** Run `STAFF_SIGNATURES_TABLE.sql` in Supabase

### 💡 Activity Feed Proposal:

**Highly Recommended** - Would significantly improve UX:
- Undo/redo across all features
- Audit trail for compliance
- Easy mistake recovery
- User confidence boost
- Minimal storage cost

**Estimated Effort:** 4-7 days for full implementation
**Storage Cost:** ~36MB/year per user (negligible)
**User Value:** High - Major UX improvement

---

**Updated:** January 19, 2026
**Total Backup Data Types:** 13
**New Additions:** Staff signatures ✨
**Next Feature:** Activity log / Undo system 🎯
